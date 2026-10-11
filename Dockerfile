# syntax=docker/dockerfile:1.7

# ---------- deps stage: install dependencies in a cached layer ----------
# The Prisma schema is copied here so the generated client lives in node_modules
# and survives into the dev/builder/runner stages without re-running prisma.
# openssl is required by Prisma's query engine at runtime.
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ---------- dev stage: full dev environment with HMR ----------
FROM node:20-alpine AS dev
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

# ---------- builder stage: production build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner stage: minimal production image ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
