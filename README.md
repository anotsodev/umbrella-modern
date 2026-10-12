# umbrella-modern

Web rebuild of [Umbrella](https://github.com/securityfirst/Umbrella_web) — open-source
guides for digital and physical security, used daily by journalists, activists, diplomats, and
business travelers working in high-risk contexts.

- **Status:** v1 shipped. Reader surface, FTS search, pathways, forms, accounts (magic-link via Resend), and the UI/UX + stock-photo pass are live. Phase 4 (PWA / offline) deferred.
- **Content source (umbrella-content):** [securityfirst/umbrella-content](https://github.com/securityfirst/umbrella-content) (public)
- **License:** GPLv3 — see `LICENSE`

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Database | PostgreSQL 16 (Alpine) |
| ORM | Prisma |
| i18n | next-intl (`/[lang]/...` URL shape) |
| UI | Tailwind + shadcn/ui |
| Auth | NextAuth (Phase 2) — anonymous by default in Phase 0/1; Next 16 compat lands before Phase 2 |
| Dev loop | Docker Compose (`web` + `db`) + Make |

## Local development

```bash
# 1. Preflight (Docker, Node, ports, .env)
make doctor

# 2. Copy the env template and fill in real values
cp .env.example .env

# 3. Bring the stack online (Postgres + Next.js dev server)
make up

# 4. Run migrations and seed (Phase 1+)
make migrate
make seed

# 5. Open the app
open http://localhost:3000
```

Native (non-Docker) dev loop is supported via `make dev` once `npm install` has run inside
the container at least once (so `node_modules` is populated).

## Project layout

| Path | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Next.js build (Alpine + openssl for Prisma) |
| `compose.yml` | `web` (Next.js) + `db` (Postgres 16) services |
| `Makefile` | Idempotent dev-loop targets: `doctor`, `up`, `down`, `dev`, `migrate`, `test`, `lint`, `typecheck`, `smoke`, `backup` |
| `bin/doctor` | Preflight check: Docker, Node, ports, env files |
| `bin/smoke` | Boots stack and hits `/` (and `/api/health` once it's added) |
| `bin/backup-pg` | `pg_dump` to a named volume; wired but cron is **not** enabled yet |
| `prisma/` | Prisma schema + migrations |
| `messages/` | next-intl translation files (one per locale) |
| `public/content/` | Served from `umbrella-content` repo (bind-mounted in dev) |
| `dev-docs/` | Project spec, open questions, runbook (PM agent maintains) |

## What's NOT here yet

- Reader surface (Phase 1) — only the App Router skeleton + health route
- `umbrella-content` import job (Phase 1)
- NextAuth route handlers (Phase 2)
- PWA / offline mode (Phase 4)
- Analytics (intentionally — see the Android `terms.html` stance on not collecting data)

## Conventions

- All commits go on the current feature branch. No push until the upstream remote is
  configured by the user.
- `.env` is gitignored. Real secrets never get committed.
- License attribution to Security First is preserved in the footer.
