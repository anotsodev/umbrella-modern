# umbrella-modern

Web rebuild of [Umbrella](https://github.com/securityfirst/Umbrella_web) — open-source
guides for digital and physical security, used daily by journalists, activists, diplomats, and
business travelers working in high-risk contexts.

- **Status:** v1 shipped. Reader surface, FTS search, pathways, forms, accounts (magic-link via Resend), and the UI/UX + stock-photo pass are live. Phase 4 (PWA / offline) deferred.
- **Content source (umbrella-content):** [securityfirst/umbrella-content](https://github.com/securityfirst/umbrella-content) (public)
- **License:** GPLv3 — see `LICENSE`

## Why this rebuild is public

This project started as an act of appreciation. [Umbrella](https://github.com/securityfirst/Umbrella_web), built by [Security First](https://github.com/securityfirst), is a genuinely important tool: plain-language digital and physical security guides that help journalists, activists, and ordinary people protect themselves when being targeted is a real risk. The original authors got the hard parts right — the content, the care, the no-data-collection stance. None of that is mine; this rebuild exists to celebrate and extend that work, not to replace it.

Two reasons I'm sharing it:

1. **A modernization showcase.** I wanted to see how far a modern web stack — Next.js App Router, PostgreSQL, full i18n across seven locales — could carry the same vital content with a faster, more accessible experience. All credit for the guides themselves belongs to Security First and the original Umbrella contributors.

2. **An LLM-agent experiment.** This rebuild doubles as a proof of concept for AI-driven full-stack development. Nearly every line here — schema, API, UI, i18n, dev ops — was planned, implemented, reviewed, and iterated by LLM agents working from specs through structured personas (PM → developer → QA). The goal was to observe what agentic workflows can genuinely do end-to-end, where they break down, and how to direct them more effectively. In that sense, this repo is as much a research artifact about working *with* AI agents as it is an app.

**If you need the actual security guidance, please use the official Umbrella app** from Security First. This repository is a technical showcase and an experiment — licensed under the same GPLv3 as the original, with attribution preserved in the app footer. The mission, the content, and the credit belong to the original team.

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

## Production deployment

`make up` starts a **development server**, not a production deployment. Use the
standalone `compose.prod.yml` to build the production image and run `next start`.
See [the production deployment guide](dev-docs/production.md) for environment
setup, backups, switching the existing stack without deleting its volumes, and
verification. The environment template is `deploy/production.env.example`.

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
- Analytics (intentionally — Security First's no-collection stance)

## Conventions

- All commits go on the current feature branch. No push until the upstream remote is
  configured by the user.
- `.env` is gitignored. Real secrets never get committed.
- License attribution to Security First is preserved in the footer.
