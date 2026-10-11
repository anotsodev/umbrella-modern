# Open Questions

Things the PM agent (or the dev agent when blocked) should surface back
to the user. Format: short title, the actual question, why it matters,
and a recommended default if the user wants to defer.

## Resolved by Phase 2

- **Magic-link email transport** → Resend. Rationale documented in
  `dev-docs/spec.md` under "Auth / Magic-link transport (Phase 2)".
  The transport is abstracted behind `lib/email.ts → sendMagicLink()`,
  so swapping to Postmark or self-hosted SMTP later is a single-file
  change. If the user prefers self-hosted SMTP for privacy reasons
  (Umbrella is a security app), call it and swap.
- **Per-user progress sync** → shipped. localStorage is the anonymous
  fallback; signed-in users get per-user server rows. One-shot merge
  prompt fires on first sign-in for users with pre-existing local
  state. See `dev-docs/spec.md` "Per-user progress sync (Phase 2)".
- **localStorage disclosure banner** → shipped
  (`components/local-storage-notice.tsx`). The banner text still
  says "sign in to sync across devices (coming soon)" — Phase 2
  delivered the sync, but the banner text wasn't updated. Worth a
  30-second edit before v1 ships.

## Resolved by Phase 1 (kept for context)

- **Form field types** → shipped the 4 upstream types
  (`text_input` / `text_area` / `single_choice` /
  `multiple_choice`) plus `label` (rendered as a section
  heading, not a form input). Parser fails loud on any
  unknown type. Defer date / file pickers until the upstream
  schema adds them.
- **Reader surface scope** → Phase 1 shipped browse + search +
  read topics + pathway tick state + form fill + form HTML
  export. No read-only fallback needed.

## Deferred from the plan

### Hosting target

- **Question:** Where will umbrella-modern be deployed for production?
  VPS, Kubernetes, a managed Next.js host (Vercel/Netlify), or
  something else?
- **Why it matters:** Affects the compose file (single host vs. k8s
  manifests), backup strategy (volume snapshots vs. managed DB
  backups), and the PWA/SSR tradeoffs.
- **Default if deferred:** Self-hosted Docker on a single VPS, using
  the same `compose.yml` shape. Easy to migrate later.

### Domain & TLS

- **Question:** Real domain name? TLS cert source (Let's Encrypt via
  Caddy/Traefik, Cloudflare, managed host)?
- **Why it matters:** Drives the reverse proxy choice and the
  `NEXT_PUBLIC_APP_URL` placeholder.
- **Default if deferred:** `https://umbrella.example.org` placeholder;
  Caddy with auto-TLS.

### Content freshness

- **Question:** How often should the `umbrella-content` import job run?
  Daily cron? Manual? Triggered by upstream webhook?
- **Why it matters:** Affects the Phase 1 import job design.
- **Default if deferred:** Daily cron; idempotent, picks up the
  latest commit from `securityfirst/umbrella-content@master`.

### Search backend

- **Question:** Postgres full-text (tsvector + GIN) as the spec
  proposes, or a dedicated index (Meilisearch / Typesense)?
- **Why it matters:** The umbrella-content corpus is ~700 markdown
  files × 7 languages; FTS5/tsvector is enough at this scale, but
  cross-language search (e.g. "kidnap" in English finding Persian
  equivalents) is a different problem.
- **Default if deferred:** Postgres FTS to start; revisit if
  cross-language search becomes a real requirement.

### Glossary term extraction

- **Question:** Do we treat the umbrella-content `glossary` category as
  ordinary markdown topics, or extract `term / definition` pairs into
  a separate `glossary_terms` table for search and linking?
- **Why it matters:** The Android app shows a "tap any term to jump
  to its definition" affordance that requires the term/definition
  split.
- **Default if deferred:** Keep as ordinary topics in Phase 1; revisit
  in Phase 2 once the reader surface has real traffic.

### Form field types beyond the four

- **Question:** The umbrella-content `f_*.yml` schema supports only
  text_input / text_area / multiple_choice / single_choice. Do we
  need anything else (date pickers, file uploads, conditional logic)?
- **Why it matters:** Risk of growing scope mid-Phase 1.
- **Default if deferred:** Ship the four types as-is. Defer date/file
  pickers to a future phase.

### Reader surface scope

- **Question:** What does "reader surface" mean for Phase 1 MVP — just
  browse + search + read topics, or also fill forms / tick
  checklists? The latter is closer to a fully-usable app.
- **Why it matters:** Could 2-3x the Phase 1 work.
- **Default if deferred:** Browse + search + read topics in Phase 1.
  Forms and checklists read-only (display schema, no submission UI)
  until Phase 2.

### Data residency

- **Question:** Umbrella's user base includes people in high-risk
  contexts. Does any data leave the EU/US? Do we need a specific
  jurisdictional choice for the database host?
- **Why it matters:** Self-imposed constraint on hosting region.
- **Default if deferred:** EU-only hosting. Document explicitly in
  the runbook.

### Translation source of truth

- **Question:** Chrome translations (button labels, nav, error
  messages) — translate in-house, or use the same translation
  pipeline the Android app uses (Crowdin / Transifex)?
- **Why it matters:** Affects how we source future locale work.
- **Default if deferred:** Mirror the Android `strings.xml` files
  manually in `messages/`. Revisit when we add a 4th language.
