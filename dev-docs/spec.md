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
| 1 | Reader surface + `umbrella-content` import job + checklist/forms | **complete** (reader + FTS + pathways + forms) |
| 2 | Real SMTP/Resend/Postmark for magic-link delivery + per-user progress persistence | **complete** (Resend + API + sync) |
| 3 | Read-only migration aids (Android user data export) | not started |
| 4 | PWA / offline mode | not started |
| 5 | NOT in scope: analytics, custom content uploads | — |

## Auth / Magic-link transport (Phase 2)

- **Provider**: Resend (`lib/email.ts`).
  Rationale: best Next.js + better-auth DX, free tier covers a small
  Umbrella-style site, and better-auth abstracts the transport so a
  future swap (Postmark, self-hosted SMTP) is a config change rather
  than a refactor. Umbrella is a security app — if the user later
  prefers self-hosted SMTP for privacy reasons, swap providers; the
  contract between `lib/auth.ts` and `lib/email.ts` is one
  `sendMagicLink({ to, url })` call.
- **Env vars** (see `.env.example`):
  - `RESEND_API_KEY` — Resend API key. Required in production.
  - `EMAIL_FROM` — sender. `"Umbrella <noreply@example.com>"` for dev;
    swap to a verified domain in prod.
- **Dev / prod fallback** in `lib/email.ts`:
  - `RESEND_API_KEY` unset **and** `NODE_ENV !== "production"` →
    `console.log` the URL (current dev stub). No email is sent.
  - `RESEND_API_KEY` unset **and** `NODE_ENV === "production"` →
    throw at send time so the deploy fails loudly rather than
    silently dropping sign-in emails.
- **Email body**: subject `"Your Umbrella sign-in link"`, body
  `"Click to sign in: <url>. Expires in 10 minutes. If you didn't
  request this, ignore this email."` Plain-text + HTML variants.
  No social links, no marketing copy — privacy stance consistent
  with the security-app positioning.
- **Server-side session invalidation on sign-out** (Phase 3 follow-up).
  The privacy statement promises that the session record in the
  database is deleted immediately when a user clicks "Sign out", and
  that promise is load-bearing. better-auth's default `/sign-out`
  endpoint already does this — `internalAdapter.deleteSession` runs
  before the cookie is cleared in the same handler, so the row is
  gone the moment the response returns. **A future contributor who
  changes the sign-out code path must preserve this behavior.**
  Specifically:
  - Don't swap `await signOut()` in `components/header-auth.tsx` for
    a client-only `document.cookie = ...` clear; that would drop the
    cookie without deleting the row.
  - Don't add a custom POST handler that wraps the better-auth one
    and short-circuits before `deleteSession` is called.
  - The smoke test in `bin/smoke` exercises the "already signed out"
    path (POST `/api/auth/sign-out` with no cookie) and asserts a
    200/204 response. That's a regression test for the no-op branch
    — the actual row-deletion behavior is verified by hand during
    development because it requires a real signed-in session.
  - Session TTL is left at the better-auth default and is **not** a
    substitute for invalidation. A short TTL is belt-and-braces; the
    primary contract is "sign out deletes the row, immediately."

  ## Operational note: rotating BETTER_AUTH_SECRET

  When `BETTER_AUTH_SECRET` is rotated (scheduled rotation,
  multi-instance deploy with per-host secrets, post-leak), existing
  signed cookies no longer match HMAC signatures. better-auth's
  sign-out endpoint validates the cookie signature before looking
  up the `session` row, so existing rows become un-deletable via
  the normal sign-out path. They will persist until the session
  TTL expires.

  **Required migration step on every secret rotation:**

  1. Rotate the secret in env / secrets manager.
  2. `TRUNCATE "session";` (or `DELETE FROM "session";`) before
     redeploy.
  3. Force all users to sign in again. This is the only way to
     invalidate rows that the new secret's HMAC cannot validate.

  If step 2 is skipped, the privacy statement's "session record
  is deleted immediately on sign-out" promise is silently false
  for any user who signed out with a stale-cookie session row.
- Library: [`better-auth`](https://www.better-auth.com) v1.7.7 with the
  Prisma adapter, `magicLink` plugin, and `nextCookies` plugin.
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

## Per-user progress sync (Phase 2)

- **localStorage is the anonymous fallback** and is always written.
  The same UX works for both anonymous and signed-in users; a failed
  server write doesn't lose progress.
- **Server wins on hydration conflict** when the server has state and
  the local device doesn't. localStorage is then mirrored back so a
  future sign-out retains progress on that device.
- **One-shot migration prompt**: when a signed-in user first visits a
  pathway/form that has localStorage entries but no server state, a
  one-shot amber banner asks "Move your local progress to your
  account?". Accept writes the local state to the server via
  `scheduleSync`; decline just records a flag. Decision is remembered
  per-key in `umbrella.merged.<localStorageKey>` (localStorage, not
  server — it's a per-device UX preference, not a per-user state).
- **Debounced server writes** (`lib/server-state.ts`,
  `SERVER_DEBOUNCE_MS = 500`): a flurry of checkbox clicks turns into
  one POST. Failures are surfaced via `synced.lastSyncError`; the
  runner keeps local progress.
- **Snapshot semantics** at the API layer: `/api/me/pathway/[slug]/sync`
  and `/api/me/form/[slug]/sync` both delete-and-reinsert child rows
  (or upsert the parent + replace children). This keeps the server
  row in lockstep with what the client shows without inventing a
  diff protocol.
  - **Future contributor note (Phase 3)**: today the "upsert"
    pattern is implemented as `findFirst` + `update`/`create`
    because Prisma's `upsert` requires a compound unique key
    and we don't have one on `(userId, formId)` /
    `(userId, checklistId)`. If you want a real `upsert`, add
    a compound unique index in `schema.prisma` first, then
    swap the `findFirst`-based code in `app/api/me/...` for
    `prisma.userForm.upsert({ where: { userId_formId: ... } })`.
    Both `UserForm` and `UserChecklistRun` are affected.
- **API surface**:
  - `GET /api/me/pathway/[slug]` — `{ checked: Record<itemId, boolean> }` or `{}`. 401 anonymous.
  - `POST /api/me/pathway/[slug]/sync` — body `{ checked, lang }`. 401 anonymous.
  - `GET /api/me/form/[slug]` — `{ answers: Record<itemName, string|string[]> }` or `{}`. 401 anonymous.
  - `POST /api/me/form/[slug]/sync` — body `{ answers, lang, title? }`. 401 anonymous.
- **Auth gating**: every `/api/me/*` route calls `await requireUserId()`
  from `lib/auth.ts`; missing session → 401. There is no "anonymous
  user" path on these routes — the contract is "if you're here you
  have an account".
- **Form `title` is included on every sync** so the server-side row's
  title matches what the user saw at sync time, not at page-render
  time. If upstream content renames the form later, in-flight drafts
  still export with the name the user originally saw.
- **Status indicator** in the runner header: a colored dot + pill
  that reads "Synced to your account" (green, signed in, last sync
  succeeded) or "Local only" (gray, anonymous). An amber variant
  appears if a sync has failed — the runner keeps local progress,
  the pill surfaces the error in its tooltip.

## Reader surface (Phase 1, partial)

Shipped on `anotsodev-umbrella-modern-web-bootstrap`:

- `lib/reader.ts` — read-side Prisma helpers (`getTopLevelCategories`,
  `getAllCategories`, `getCategory`, `getCategoryContents`,
  `getContent`, `getBreadcrumbs`, `getNeighbours`) keyed off the
  `@@unique([languageId, slug])` index.
- `app/[lang]/page.tsx` — homepage: tagline, intro, CTA, grid of
  top-level categories.
- `app/[lang]/categories/page.tsx` — flat index of all top-level
  categories.
- `app/[lang]/categories/[category]/page.tsx` — per-category page;
  shows children (if any) + topics. Single dynamic segment encodes
  the full path-joined hierarchy (e.g. `communications-censorship-beginner`).
- `app/[lang]/categories/[category]/[slug]/page.tsx` — topic detail;
  renders `Content.html` inside `.prose-umbrella` via
  `dangerouslySetInnerHTML` (HTML is produced by the import job from
  the trusted upstream `umbrella-content` repo, not user input).
- `app/[lang]/search/page.tsx` — placeholder until FTS lands.
- `components/locale-picker.tsx` — client component that swaps the
  `[lang]` URL segment and refreshes the RSC tree, wrapped in
  `<Suspense>` to satisfy the Next 16 prerender rules.
- `app/[lang]/layout.tsx` — header (`Umbrella` brand + Home / Categories
  / Search + locale picker) and footer (GPLv3 attribution + source).
- `app/globals.css` — `.prose-umbrella` block; dark mode included;
  no new deps (skipping `@tailwindcss/typography`).
- `messages/{en,ar,es,fa,fr,ru,zh-Hant}.json` — `nav`, `categories`,
  `topic`, `breadcrumb`, `localePicker`, `footer` keys for all 7
  locales.

Verified end-to-end: every route shape returns 200 across all 7
locales; 404 for nonexistent categories; RTL on `/ar` and `/fa`;
images rewrite to `/content/<lang>/...` on the local volume;
`npx tsc --noEmit` clean; `make smoke` green.

### Next 16 `cacheComponents` notes

- `export const dynamic = "force-dynamic"` is rejected outright when
  `cacheComponents: true` in `next.config.ts`. The replacement is
  `export const instant = false` on each route that touches the DB.
- `usePathname()` in a client component must be inside a `<Suspense>`
  boundary in the parent — the layout's header wraps the
  `LocalePicker` in `<Suspense fallback={null}>` for that reason.

## FTS (Phase 1, partial)

Shipped: `prisma/migrations/fts.sql` + `bin/migrate-fts` + `lib/reader.searchContent`
+ `app/[lang]/search/page.tsx` + `components/search-form.tsx` + per-locale
i18n + header search box.

- Postgres `tsvector` column `contents.search_vector`, populated by a
  `BEFORE INSERT OR UPDATE` trigger (`contents_search_vector_update`).
  Weights: title and frontmatter title = A, stripped HTML body = B.
- GIN index `contents_search_vector_idx` on the column.
- Uses the `simple` text-search config so it works across all 7
  languages without English stemmers mangling Arabic/Persian/Chinese.
- Search query in `lib/reader.ts` is parameterised Prisma `$queryRaw`:
  prefixes each term with `:*` for partial-word matching, strips
  tsquery metacharacters, orders by `ts_rank_cd`.
- Smoke: every locale × `?q=…` returns 200 with hits.

## Pathways (Phase 1, partial)

Shipped: `app/[lang]/pathways/page.tsx` + `app/[lang]/pathways/[slug]/page.tsx`
+ `components/checklist-runner.tsx` + `lib/reader.getAllChecklists` /
`getChecklist` + header nav link + per-locale i18n + smoke coverage.

- `getAllChecklists(lang)` returns one row per checklist for the
  language, ordered by `categoryId, position, slug`. The reader UI
  groups the result by `categorySlug` so the index mirrors the
  category tree.
- `getChecklist(lang, slug)` walks the items once, attaching the
  most recent `kind: "section"` item's label to each subsequent
  item as `sectionTitle` (so the reader can render section headings
  inline) and capturing the first `kind: "umbrella"` body as the
  optional `intro`.
- IDs are `BigInt` in Postgres; the helper stringifies them so client
  components can use them as React keys and localStorage keys without
  per-access coercion.
- `ChecklistRunner` is a client component. Item tick state lives in
  `localStorage` under `umbrella.pathway.<slug>.checked`; the
  progress bar derives from the in-memory map (no re-hydration
  during SSR). `markAll` / `clearAll` buttons are pure client state
  for now.
- Phase 2 swap: per-user server-side progress (better-auth is
  already wired in Phase 0), keyed off `user_checklist_progress`.
  Tables already exist in the schema.
- Smoke: 200 for `/<lang>/pathways` across all 7 locales, 200/404
  for `/<lang>/pathways/<slug>` (404 acceptable when a checklist
  hasn't been translated into that locale yet).

## Forms (Phase 1, partial)

Shipped: `app/[lang]/forms/page.tsx` + `app/[lang]/forms/[slug]/page.tsx`
+ `components/form-runner.tsx` + `lib/reader.getAllForms` /
`getForm` + `assertValidFormSchema` + header nav link + per-locale
i18n + smoke coverage.

- Source: the upstream `securityfirst/umbrella-content` repo
  ships forms as `forms/<slug>/<lang>.yml` with a `screens` →
  `items` shape. Item types: `label`, `text_input`, `text_area`,
  `single_choice`, `multiple_choice`. Three places must stay in
  lockstep when adding a type: import job
  (`scripts/import-content.ts`), validator
  (`lib/reader.ts assertValidFormSchema`), and renderer
  (`components/form-runner.tsx Field`).
- **Optional `label`**: at least one upstream form
  (`digital-security-incident`, screen 8, "Provide Brief
  Description") ships `text_area` items with no `label` field.
  The schema marks `label` as optional; the validator only
  requires `name` + `type`; the renderer falls back to `name`
  (the machine-readable slug) for the human-visible label.
  Translation of the machine name is a future improvement.
- `getAllForms(lang)` returns one row per form, ordered by
  `title ASC`. The displayed field count (`itemCount`) excludes
  `label`-type items so the number matches what the user
  actually has to fill in.
- `getForm(lang, slug)` returns the full schema; the
  validator re-asserts the shape on every read (a DB row can
  outlive a code change). If a form's stored schema is
  malformed, the detail page 500s with the offending path;
  Phase 1 does NOT filter bad forms out of the index
  (deliberate — better to surface the bug than hide it).
- `FormRunner` is a client component. Wizard-style: one
  screen at a time with prev/next/finish buttons. Per-field
  answers live in `localStorage` under
  `umbrella.form.<slug>.answers`. Phase 2 swaps to per-user
  server state keyed off the existing `user_forms` table.
- **Printable HTML export**: "Export HTML" builds a
  self-contained document (inline CSS, no external assets)
  matching the shape of the Android `asHTML()` reference in
  `data/database/form/entity.kt:149` — h1 form title, h3 per
  screen, h5 per item, then readonly input/textarea/radio/
  checkbox per type. Browser print preview renders cleanly
  with `body { font-family: … }` and `field { break-inside:
  avoid }` so multi-line answers don't split across pages.
- v1 has no validation beyond type coercion; Phase 2 (when
  forms save server-side) is the right time to add
  per-field validation rules.
- Smoke: 200 for `/<lang>/forms` across all 7 locales, 200/404
  for `/<lang>/forms/<slug>` (same locale-tolerance rules as
  pathways).

## i18n

- Library: [`next-intl`](https://next-intl.dev) v4 with App Router.
- Routing: locale is a URL segment (`/[lang]/...`); middleware 307s
  bare `/` to the request's preferred locale.
- Locales: `en`, `ar`, `es`, `fa`, `fr`, `ru`, `zh-Hant`. RTL is
  applied via the layout's `dir` attribute for `ar` and `fa`.
- Message files: `messages/<locale>.json`. New keys must be added
  to all 7 files — the reader is the only fallback, and a missing
  key surfaces as a runtime error in dev.
- **Plural rules**: next-intl ICU plurals verified for `ru`
  (`one` / `few` / `many`) and `ar` (`zero` / `one` / `two` /
  `few` / `many`). English falls back to `one` / `other` and
  Chinese to `other` only, which is correct. **New locales must
  match their CLDR ICU rules — silent bugs otherwise.** When
  adding a locale, write a smoke probe that exercises each plural
  branch (0, 1, 2, 5, 11) and read the rendered output to confirm
  the right rule fires.

## Future refactors

- `lib/reader.ts` is the read-side data layer. As of Phase 1 it
  carries topics (`getTopLevelCategories`, `getCategoryContents`,
  `getContent`, …), search (`searchContent`), pathways
  (`getAllChecklists`, `getChecklist`), and forms
  (`getAllForms`, `getForm`, `assertValidFormSchema`) in one
  file — currently ~596 lines. **Once it crosses ~600 lines or
  becomes hard to navigate, split it by domain** —
  `lib/reader/topics.ts`, `lib/reader/search.ts`,
  `lib/reader/pathways.ts`, `lib/reader/forms.ts` — and keep
  the `assertLocale` helper in a shared `lib/reader/index.ts`.
  Don't refactor proactively; this is a size/navigation signal,
  not a smell.
- The import job (`bin/import-content` or wherever it lives) is
  similarly monolithic; same rule applies.

## Next 16 `cacheComponents` rules confirmed

- `export const dynamic = "force-dynamic"` is rejected outright
  when `cacheComponents: true` in `next.config.ts`. The
  replacement is `export const instant = false` on each route
  that touches the DB. This applies to the forms index, forms
  detail, pathways index, pathways detail, search, and every
  reader page. If a new route 500s with a `cacheComponents`
  error, check for the missing `instant = false`.
- `usePathname()` in a client component must be inside a
  `<Suspense>` boundary in the parent — the layout's header
  wraps the `LocalePicker` in `<Suspense fallback={null}>` for
  that reason.

## Other Next 16 / next-intl 4 / React 19 rough edges

- **next-intl placeholder behavior.** `t("key")` errors at call
  time as `FORMATTING_ERROR` when the message has
  `{placeholder}`s but no values were passed. Two ways to deal
  with it: (1) call `t("key", { value })` and let next-intl do
  the substitution; (2) call `t.raw("key")` to get the raw
  template, then do plain JS `.replace()` client-side. Option
  (2) is the right call when the component lives on the client
  and the values are dynamic (form runner uses it for the
  "Screen {current} of {total}" header). ICU
  `{count, plural, …}` is fine to call as
  `t("screenCount", { count: 5 })` because the count is known
  at call time.
- **React 19 `setState` in effect is a lint error.** The
  hydrate-from-localStorage pattern (`useEffect(() =>
  setAnswers(loadAnswers(slug)), [slug])`) trips the
  `react-hooks/set-state-in-effect` rule. It's not breaking
  (lint only, not a runtime check), and the pattern is
  correct for the SSR/client boundary — `loadAnswers` would
  crash on the server. Phase 1 ships with this lint error in
  both `checklist-runner.tsx:62` and `form-runner.tsx:204,213`
  because the alternative (a `useSyncExternalStore`-shaped
  read) is more code for a Phase 1 detail. **Phase 2 keeps
  the pattern** — the localStorage hydration effect is
  required for the anonymous fallback, and the new
  server-merge effect uses the same shape. Refactor to
  `useSyncExternalStore` is a Phase 3 candidate.
- **Turbopack.** Stable, no surprises. The web container
  builds and serves in dev mode without the Turbopack opt-out.
  The dev experience is fast and HMR works on every page type
  tested (server components, client components, route
  handlers, server actions).
- **better-auth + Next 16.** No peer warnings; the
  `legacy-peer-deps` pin in `.npmrc` is a defensive guard
  against future minor bumps, not a workaround for an active
  mismatch.
- **Node 22 is required.** The `auth` and `chevrotain`
  dependencies declare `engines.node >= 22.0.0`. The
  Dockerfile uses `node:22-alpine` for **all four stages**
  (deps, dev, builder, runner) — bumping only the runner
  still fails `npm ci` in the dev stage. This was hidden
  in Phase 0 and only surfaced when the cold-start init
  service was added in Phase 2.

## What's still loading-bearable for v1 deploy

- **localStorage is the anonymous fallback in Phase 2, not
  the only progress layer.** Signed-in users get per-user
  server persistence via `/api/me/pathway/*` and
  `/api/me/form/*`. Anonymous users still get device-local
  progress. The `LocalStorageNotice` banner
  (`components/local-storage-notice.tsx`) explains this
  on first visit. The "Sign in to sync across devices"
  line in the banner still says "coming soon" — Phase 2
  delivered the sync, not the UI text update. Worth
  re-wording before v1 ships.
- **No 404 page yet.** The reader surface returns 404 for
  nonexistent slugs but the layout shows the default Next.js
  404. A custom 404 with the locale picker + a search prompt
  is a small Phase 1.x polish item.
- **The umbrella-content volume is mounted empty in
  compose.yml.** The init service runs `npm run
  import-content` on cold start; the volume persists across
  container restarts. A pre-baked image would be faster on
  cold deploys but isn't necessary.
