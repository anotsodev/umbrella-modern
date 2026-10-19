# syntax=docker/dockerfile:1.7

# ---------- deps stage: install dependencies in a cached layer ----------
# The Prisma schema is copied here so the generated client lives in node_modules
# and survives into the dev/builder/runner stages without re-running prisma.
# openssl is required by Prisma's query engine at runtime.
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ---------- dev stage: full dev environment with HMR ----------
FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
# Install dumb-init for proper signal handling, openssl for Prisma,
# and git for the import-content script (which clones umbrella-content).
RUN apk add --no-cache dumb-init openssl git
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
# dumb-init reaps zombies and forwards signals to the Node process
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]

# ---------- tools stage: explicit production schema/content maintenance ----------
FROM dev AS tools
RUN apk add --no-cache bash
ENV NODE_ENV=production
CMD ["bash", "-c", "npx prisma db push --skip-generate && bash bin/import-if-empty"]

# ---------- builder stage: production build ----------
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Auth is imported while Next.js collects routes. Use a build-only placeholder,
# never a real signing secret; the production secret is supplied at runtime.
RUN BETTER_AUTH_SECRET=build-only-placeholder-not-for-runtime-000000000000 \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    npm run build

# ---------- runner stage: minimal production image ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init openssl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/i18n.ts ./i18n.ts
USER nextjs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
