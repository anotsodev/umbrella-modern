# Umbrella Modern — Specification

This is the live spec for the umbrella-modern web rebuild. The PM agent
owns it; the dev agent treats it as the source of truth for scope and
acceptance criteria.

The full planning document lives at
`/Users/kylehalog/.copilot/session-state/b38ba7e7-b49b-498e-9714-d0c561afe457/files/umbrella-modern-plan.md`
(248 lines). Below is a tight summary so contributors don't have to
chase the source file.

## What we're building

A web-only rebuild of [Umbrella](https://github.com/securityfirst/Umbrella_android) —
open-source digital and physical security guides used by journalists,
activists, diplomats, and business travelers. Content sourced from
[securityfirst/umbrella-content](https://github.com/securityfirst/umbrella-content)
(7 languages × 13 categories of `s_*.md` topics, `f_*.yml` forms,
`c_*.yml` pathways).

## Locked decisions (Phase 0)

| Decision | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| i18n | next-intl, `/[lang]/...` URL shape |
| UI | Tailwind 4 + shadcn/ui (Phase 1) |
| Auth | Anonymous-by-default v1; **better-auth** (magic link, no passwords) — brought in during Phase 0 so it can run alongside Phase 1. NextAuth was never installed, so no migration is needed. |
| Repo visibility | Private |
| License | GPLv3 |
| Domain | TBD until Phase 1 ships; placeholder in `.env` |
| Backups | `pg_dump` to a named volume; cron OFF until Phase 1 deployable |

## Schema (14 tables)

`languages`, `categories`, `contents` (topic + glossary), `checklists`,
`checklist_items`, `user_checklist_runs`, `user_checklist_progress`,
`forms`, `user_forms`, `users`, `audit_log`, plus the three better-auth
tables: `session`, `account`, `verification`. Full DDL in
`prisma/schema.prisma`.

> **Slug strategy.** Category slugs are the path-joined segments from
> `umbrella-content/<lang>/<top>/<...>`. This guarantees uniqueness when
> multiple categories share a final segment (e.g. multiple `expert` folders
> under different parents — `expert/network`, `expert/travel`, ...) — each
> gets a unique row and a unique URL. The same rule applies to checklists
> whose directory path ends in a shared leaf (e.g. many `c_checklist.yml`
> files). Do not "simplify" to the final segment only; collisions are real
> and the `@@unique([languageId, slug])` constraint will reject duplicates
> during the import.

## Out of scope

- Android / iOS — explicitly deferred by the user
- Analytics — see the Android `terms.html` stance on not collecting user data
- PWA / offline mode — Phase 4
- Cloud image storage — local volume for now

## Phased delivery

| Phase | Scope | Status |
|---|---|---|
| 0 | Spec + ops (Docker, schema stub, i18n skeleton, **better-auth scaffolded**) | **complete** |
| 1 | Reader surface + `umbrella-content` import job + checklist/forms | in progress |
| 2 | Real SMTP/Resend/Postmark for magic-link delivery + per-user progress persistence | not started |
| 3 | Read-only migration aids (Android user data export) | not started |
| 4 | PWA / offline mode | not started |
| 5 | NOT in scope: analytics, custom content uploads | — |

## Auth notes (Phase 0 follow-up)

- Library: [`better-auth`](https://www.better-auth.com) v1.7.7 with the
  Prisma adapter, `magicLink` plugin, and `nextCookies` plugin.
- Transport: magic-link only. The dev `sendMagicLink` handler in
  `lib/auth.ts` just `console.log`s the URL — no real SMTP. Phase 2
  swaps this for Resend/Postmark/SMTP.
- Server-side import: `nextCookies` is imported from `better-auth/next-js`
  in v1.7.7, **not** from `better-auth/plugins` (the docs show both
  shapes, but only the `/next-js` subpath exports it in this version).
- npm install: `npm install better-auth@^1.7.7 --legacy-peer-deps`. The
  `--legacy-peer-deps` is justified by an optional
  `@tanstack/react-start` peer that conflicts with vitest 2.1; we
  don't use Tanstack Start, so the conflict is harmless.
- Docker note: the Dockerfile uses `npm ci`; after a `--legacy-peer-deps`
  install you must `docker compose build web --no-cache` for the container
  to see the new dep.
