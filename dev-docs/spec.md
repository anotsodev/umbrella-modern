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
| Auth | Anonymous-by-default v1; NextAuth (email + magic link) in Phase 2 |
| Repo visibility | Private |
| License | GPLv3 |
| Domain | TBD until Phase 1 ships; placeholder in `.env` |
| Backups | `pg_dump` to a named volume; cron OFF until Phase 1 deployable |

## Schema (12 tables)

`languages`, `categories`, `contents` (topic + glossary), `checklists`,
`checklist_items`, `user_checklist_runs`, `user_checklist_progress`,
`forms`, `user_forms`, `users`, `audit_log`. Full DDL in
`prisma/schema.prisma`.

## Out of scope

- Android / iOS — explicitly deferred by the user
- Analytics — see the Android `terms.html` stance on not collecting user data
- PWA / offline mode — Phase 4
- Cloud image storage — local volume for now

## Phased delivery

| Phase | Scope | Status |
|---|---|---|
| 0 | Spec + ops (Docker, schema stub, i18n skeleton) | **in progress** |
| 1 | Reader surface + `umbrella-content` import job | not started |
| 2 | NextAuth + per-user progress persistence | not started |
| 3 | Read-only migration aids (Android user data export) | not started |
| 4 | PWA / offline mode | not started |
| 5 | NOT in scope: analytics, custom content uploads | — |
