# UI/UX + stock-photo beautification pass — audit (v1)

This is the **audit only**. Nothing is implemented yet. The
purpose of this document is to enumerate what visually-flat,
visually-inconsistent, or visually-missing things exist on top
of Umbrella Modern v1 (`8af6832`) so the user can direct the
next pass. After the user reviews this, the implementation work
lands in follow-up commits on the same branch.

Branch: `anotsodev-ui-ux-beautification` (renamed from
`anotsodev-fuzzy-enigma` for this work).

> **Historical note:** references to the Android app below are
> point-in-time observations from when this audit was written.
> The project now follows Umbrella_web
> (`securityfirst/Umbrella_web`) as its sole upstream reference.

---

## Constraints carried into the audit

These are non-negotiable and were used to scope every observation
below. They are restated from the kickoff so the audit doesn't
drift.

- **Stack is locked.** Next.js 16 + React 19 + Prisma 5.22 +
  next-intl 4 + better-auth 1.7.7 + Tailwind 4. **No new deps.**
- **All 7 locales render.** `en`, `ar`, `es`, `fa`, `fr`, `ru`,
  `zh-Hant`. RTL on `ar` and `fa`. New user-facing copy must go
  into all 7 `messages/<lang>.json` files.
- **Sign-out goes through the server.** Don't touch the
  `header-auth.tsx` sign-out path (load-bearing privacy
  statement promise).
- **No analytics / tracking / 3rd-party scripts.** Privacy
  statement is load-bearing.
- **No `cf-access-*` header reads.** Deployment posture stays
  where `spec.md` left it.
- **Stock photos are committed into the repo.** No hot-linking
  Pexels at runtime.
- **Smoke stays green** (`bin/smoke`); check count bumps if new
  routes are added.
- **Lint stays at 0 errors.**
- **Push posture: do not push to origin without explicit user
  instruction.**

---

## Surface inventory (what exists today)

| Surface | Route | Notes |
|---|---|---|
| Homepage | `app/[lang]/page.tsx` | Phase tag, title, subtitle, intro, 2 CTAs, top-level category card grid |
| Categories index | `app/[lang]/categories/page.tsx` | One section, flat card grid |
| Category detail | `app/[lang]/categories/[category]/page.tsx` | Children cards + topics as divide-y list |
| Topic detail | `app/[lang]/categories/[category]/[slug]/page.tsx` | Prose body, prev/next nav, no figure |
| Pathways index | `app/[lang]/pathways/page.tsx` | Grouped by category, card grid |
| Pathway detail | `app/[lang]/pathways/[slug]/page.tsx` | Title + intro + `ChecklistRunner` |
| Forms index | `app/[lang]/forms/page.tsx` | Card grid, title + screen/field count |
| Form detail | `app/[lang]/forms/[slug]/page.tsx` | Wizard, `FormRunner` |
| Search | `app/[lang]/search/page.tsx` | Hits list, plain input |
| How-to-use | `app/[lang]/how-to-use/page.tsx` | Step list with Android screenshots (English copy only) |
| Sign-in | `app/[lang]/sign-in/page.tsx` | Inline-styled page; needs to be made consistent with the rest |
| Terms | `app/[lang]/terms/page.tsx` | Renders `privacy-statement-v1.md` |
| Root 404 | `app/not-found.tsx` | Locale picker + search box |
| Header / footer | `app/[lang]/layout.tsx` | Inline — no shared components |

Components in `components/`: `checklist-runner.tsx`,
`form-runner.tsx`, `header-auth.tsx`, `local-storage-notice.tsx`,
`locale-picker.tsx`, `merge-prompt.tsx`, `search-form.tsx`.

Existing assets: `public/how-to-use/*.png` (12 Android
screenshots, ~830 KB total), plus the default Next.js SVGs in
`public/` (unused — leftover from `create-next-app`).

---

## Token + spacing + typography

These are root-cause issues. Fix once, propagate everywhere.

### T1. Color tokens are ad-hoc

`globals.css` defines `--background` / `--foreground` and
inlines a separate dark palette via `prefers-color-scheme`.
Every other surface hardcodes `zinc-*`, `amber-*`, `emerald-*`,
`red-600`, `crimson`. Some pages mix:

- `text-zinc-600 dark:text-zinc-400`
- `bg-emerald-500` (progress bars)
- `bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300` (sync pill)
- `bg-amber-50 text-amber-900` (notice + merge)
- `bg-zinc-900 text-white` (primary button on home)
- `text-[#2563eb]` (article body link)

**Plan:** introduce semantic tokens in `globals.css` that map
zinc/amber/emerald to roles:

- `--surface-*` (page, card, panel, sunken)
- `--border-*` (default, hover, accent)
- `--text-*` (primary, secondary, muted, inverse)
- `--accent-*` (primary CTA, success, warning, info)

Then rework components to consume tokens rather than
hard-coding `zinc-NNN`. Tailwind's `@theme` already has hooks
for this; the work is mostly renaming classes, no new deps.

### T2. Spacing is inconsistent

Homepage uses `py-16` for the hero and `mb-12`. Categories and
topics use `py-12`. How-to-use uses `py-12`. Forms index uses
`py-12`. Topic detail uses `py-12`. Pathway/form detail use
`py-12`.

Internally:
- `mt-4`, `mt-6`, `mt-8`, `mt-10`, `mt-12`, `mt-16` are all
  used interchangeably for "section gap".
- Card padding is `p-4` everywhere — fine, but cards on the home
  page and on the categories index have no `gap` consistent with
  pathway/form cards. (They do — `gap-3`. Good.)

**Plan:** standardise a 4-step spacing rhythm in the audit doc
and apply it: section gap = `mb-10`, sub-section gap = `mb-6`,
card padding = `p-5`, hero block = `py-12`. Encoded as
Tailwind utilities (no new tokens needed); the work is
mechanical.

### T3. Typography is mostly consistent, with gaps

- Display headings use `text-3xl font-semibold tracking-tight`
  consistently.
- Hero uses `text-4xl sm:text-5xl` (good — it's larger than the
  other h1s, which is intentional).
- Body is `text-base` (default) or `text-sm` for muted secondary.
  This is fine, but the **topic-detail article body** uses
  `text-[1.0625rem]` (inlined in `.prose-umbrella`), which is
  the only body-typography override in the app.

**Plan:** keep the prose override; document it. No change.

### T4. Buttons are inconsistent

Three button shapes in use today:
1. **Primary** — `bg-zinc-900 text-white` (homepage CTA, search
   submit on 404). Used twice.
2. **Secondary** — `border border-zinc-300 hover:bg-zinc-100`
   (mark-all/clear on checklist, next/prev on form, clear-all
   buttons, locale picker). Used ~10 places.
3. **Accent success** — `border-emerald-600 bg-emerald-600
   text-white` (form "Finish & export" only). Used once.

Plus inline-styled buttons in `sign-in/page.tsx` (uses
`style={{}}`, not Tailwind). This file is the visual outlier.

**Plan:** extract `<Button variant="primary|secondary|success|ghost">`
in `components/button.tsx`. Use the token names from T1. Refit
every button in the app to it. The sign-in page becomes Tailwind
via the same primitive. Smoke and lint stay green (no new
external dep, no behavior change).

### T5. Card primitive is repeated

The "rounded-lg border, hover state, p-4 padding" card appears
in:
- `app/[lang]/page.tsx` (top-level categories)
- `app/[lang]/categories/page.tsx` (top-level categories)
- `app/[lang]/categories/[category]/page.tsx` (sub-categories)
- `app/[lang]/pathways/page.tsx` (pathway cards)
- `app/[lang]/forms/page.tsx` (form cards)

All five use the same classes but with subtle copy-paste drift
(some include `bg-white dark:bg-zinc-900`, some don't; hover
classes differ in 2 places).

**Plan:** `components/category-card.tsx` (suggested in the
kickoff). Used by all five. Accepts `{ href, title, subtitle?,
image? }` so the future image pass slots in cleanly. The
"image-less" version is the v1 starting point — once Pexels
assets land, the image variant replaces the icon-less card.

### T6. The "sync status pill" is duplicated

Same shape lives in `checklist-runner.tsx` and `form-runner.tsx`
with identical copy keys (`sync.synced`, `sync.local`,
`sync.syncedTooltip`, `sync.localTooltip`). Pure duplication.

**Plan:** extract `<SyncStatusPill kind="pathway|form" />` in
`components/sync-status-pill.tsx`. Both runners consume it.

### T7. Localised date strings are absent

`topic/[category]/[slug]/page.tsx` renders
`new Date(topic.updatedAt).toISOString().slice(0, 10)`. ISO
date format is the same in every locale. Acceptable, but worth a
follow-up to render a localised short date via `Intl.DateTimeFormat`
in the future.

**Plan:** leave as-is for this pass. Log as a v1.x polish item.

---

## Empty states + missing affordances

The reader has reasonable happy paths but lacks a handful of
empty states and illustrations.

### E1. No shared empty-state primitive

Used in three places today, each a different shape:
- `app/[lang]/pathways/page.tsx` — `t("empty")` paragraph
- `app/[lang]/forms/page.tsx` — `t("empty")` paragraph
- `app/[lang]/categories/[category]/page.tsx` — `t("browseTopics")`
  with a literal `—` if no topics
- `app/[lang]/pathways/[slug]/page.tsx` — `ChecklistRunner` shows
  `labels.empty` if totalItems == 0

**Plan:** `components/empty-state.tsx` accepts `{ title, body,
action? }`. Use it everywhere a list can be empty. The body
copy is i18n. For the pathways/forms index empty state, add a
small illustration slot (a Pexels photo works once the asset
pass lands).

### E2. Search "no results" has no illustration

`search/page.tsx` shows
`{t("noResults", { query: q })}` for zero-hit searches.
Plain paragraph. No suggestion, no illustration.

**Plan:** an empty-state with "We couldn't find anything for
'{query}'. Try a broader term, or browse a category." Body +
i18n. Optional Pexels illustration.

### E3. Hero has no image, no dual CTA, no visual hook

The current homepage hero is text only:
- Eyebrow ("Phase 1 reader")
- h1 ("Umbrella, on the web")
- subtitle
- intro
- two side-by-side buttons ("Explore categories", "Search")

It's not bad — it's just flat. No hero image. No visual identity.

**Plan:** `components/hero.tsx` with the kickoff spec — image +
headline + dual CTA. Image asset comes from the Pexels pass.
The hero image should be chosen to match the security/travel
theme (see "Photo direction" below). RTL flips the image
position via `dir`.

### E4. Topic pages have no inline figure

`topic/[category]/[slug]/page.tsx` is a bare
`<article>` with prose. Upstream topics already have inline
images in the content HTML (`prose-umbrella img` styles them
with rounded corners). But the page itself has no hero figure.

**Plan:** add `components/topic-figure.tsx` that takes a
`src + credit` and renders a captioned image above the h1, only
when an image is provided. Default behaviour is no figure — so
existing topics without curated hero images stay text-only. The
import job could optionally set a `heroImageUrl` field on
content rows later; this PR doesn't require a schema change.

### E5. Sign-in page is the visual outlier

`app/[lang]/sign-in/page.tsx` uses inline `style={{}}` for
layout (maxWidth 420, margin 4rem auto, padding 0 1rem) and
unstyled `<h1>`, `<p>`, `<label>`, `<input>`, `<button>`. It
is the only page in the app that bypasses Tailwind. Visual
consistency with the rest of the site is broken on
`/<lang>/sign-in`.

**Plan:** rewrite with the design system. Use the Button
primitive (T4). Add an eyebrow above the h1 ("Account" →
"Sign in to sync your progress across devices"). Add a small
trust panel ("No password. We send you a one-time link to your
inbox. We delete the link the moment you sign out.") — also
helps users who are anxious about the magic-link pattern in a
security app.

### E6. Onboarding / first-run is implicit

`local-storage-notice.tsx` does first-run notification. But
there's no "welcome to Umbrella" page that ties the catalog
shape to the user. The how-to-use page covers Android-style
onboarding with screenshots, but the user has to find it.

**Plan:** add an onboarding card on the homepage (under the
hero) — three short paragraphs "Read", "Plan", "Capture" with
one icon/illustration each, each linking to its respective
surface. i18n across 7 locales. Doesn't replace the how-to-use
page; supplements it.

### E7. Footer is a single line. Could carry more.

Currently:
- © Umbrella · Licensed under GPLv3
- No analytics · anonymous by default · sign in to sync
- Privacy | Source

The footer is fine for v1 but reads as ad-hoc. A proper
`components/footer.tsx` would let us add the future credits
link, a "Last updated" date, and small print about the content
source without copy-pasting the layout string into 7 message
files.

**Plan:** extract `components/footer.tsx`, used by the layout.
i18n keys: `footer.license`, `footer.dataNote`, `footer.privacy`,
`footer.source`, `footer.credits` (new — for the Pexels page).

---

## Photo direction (Pexels)

Stock source: **Pexels** (`https://www.pexels.com/`). License is
free for commercial use; no attribution required by Pexels, but
we'll credit anyway because (a) the privacy statement promises
provenance-style transparency, and (b) future photographers
deserve credit. Credits will live at
`app/[lang]/credits/page.tsx` (`/credits` link in the footer).

**Acquisition strategy:** manual download for v1 — pre-curate
the 8-12 photos we need, commit them under `public/images/`, no
runtime API call, no `PEXELS_API_KEY` env var. This matches
the spec's "prod pre-downloads and commits so the runtime never
hits Pexels" stance. (We don't need the API; the dataset is
small and we want a fixed visual identity, not a different photo
every deploy.)

**Aesthetic guardrails (NOT stockphoto-corporate):**

- **Avoid:** grinning headset call-center agents, "diverse team
  shaking hands", laptops on a beach, anything that reads as
  LinkedIn-stock.
- **Lean toward:** editorial reportage. Travel and transit
  imagery (boarding passes, passports, transit hubs, security
  tape on a laptop, blurred-city-from-airplane-wing), phones
  with security UI, low-key colour grading, muted palette.
  Black-and-white reportage is fair game if it matches the
  category.
- **People:** present is fine, **but** anonymous / silhouette /
  back-of-head / hands-only shots. No direct eye contact
  unless the category demands it.
- **Diversity:** real diversity. Umbrella is used daily by
  people from many cultures; the photo set should reflect that
  without flattening it into a single "traveller" trope.
- **Palette:** muted greens, blues, slate; warm-amber
  highlights (matches the existing `emerald` accent on the
  progress bars and the `amber` accents on the notice + merge
  prompt). Avoid saturated corporate primaries.

**Suggested photo slots (final picks deferred until after this
audit is reviewed):**

| Slot | Surface | Theme |
|---|---|---|
| Homepage hero | `components/hero.tsx` | Transit hub or quiet airport moment; no logos |
| Topic "network" | optional `topic-figure.tsx` | Hands on a laptop, screen off-frame |
| Topic "physical safety" | optional | Documentary reportage, low-key |
| Empty state: search | `components/empty-state.tsx` | Quiet / minimal; a "no signal" / map-pin vibe is OK |
| Empty state: pathways | `components/empty-state.tsx` | Clipboard / notebook / pen |
| Empty state: forms | `components/empty-state.tsx` | Pen + paper, low contrast |
| How-to-use intro | `app/how-to-use/page.tsx` | First card / hero replacement — possibly leave Android screenshots and just add a header photo |
| Credits page header | `app/[lang]/credits/page.tsx` | Soft, neutral |

The credits page itself lists every downloaded photo with
photographer name + Pexels URL. We don't need an attribution
contract with Pexels, but we make the attribution legible.

---

## Aesthetic preflight (themes + RTL)

### A1. Theme tokens

Today the only theming is `prefers-color-scheme`. We should
keep that. No theme picker in v1 — the spec doesn't call for
one, and the privacy statement explicitly avoids user-state
features.

**Plan:** stay on `prefers-color-scheme` only. Document the
token layout in `globals.css` so a future theme picker can slot
in cleanly.

### A2. RTL correctness

`ar` and `fa` get `dir="rtl"` on `<html>`. Existing uses of
`me-*`, `ms-*`, `start`, `end` are correct. Where directional
classes appear, they're mostly `me-2` / `start`, good.

**One concrete RTL issue:** in the header, the locale picker
uses `absolute end-0 z-10` (correct for RTL — "end" follows
direction). The HeaderAuth dropdown also uses `absolute end-0
z-20 mt-1`. Good.

The merge prompt `merge-prompt.tsx` and the sync-status pill
in the runners are flex-based — they auto-flip. Good.

**Plan:** during the card / button refactor, verify every
`mr-*` / `ml-*` becomes `me-*` / `ms-*` (some still exist in
the prose stylesheet; not in any JSX). Add a quick manual
check: open `/ar/categories` and `/fa/forms` and look for any
visual asymmetry.

### A3. Spacing rhythm for RTL

RTL doesn't change spacing — both `me-*` and `ms-*` flip
correctly under Tailwind 4. The card grid
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) does not need
flipping. Good.

### A4. Image with text overlay (RTL)

A future hero with image-and-text-overlay needs the text on
the start side (right in RTL). `components/hero.tsx` will use
`<div className="order-1 md:order-2">` style if image and text
are side-by-side, or absolute positioning with start offsets,
not left/right. Audit will check this when the hero lands.

---

## Privacy + accessibility considerations

These are non-negotiable and shape the design.

### P1. No third-party assets at runtime

Stock photos are committed into `public/images/`. No Pexels
hot-link. No `PEXELS_API_KEY` env var required for prod. (The
env var is allowed in `.env.example` for dev convenience but
the runtime does not import it.) Smoke stays green because the
runtime only serves `public/images/*`.

### P2. No third-party scripts

The credits page is a plain static page. No embed, no JS
analytics, no font CDN. All photos are local. Lint + smoke
remain clean.

### P3. Image `alt` text

Every new `<img>` (or `next/image`) needs meaningful `alt`
text. Decorative photos get `alt=""`. For the credits page,
the alt text is the photographer's name + photo description
(sighted users read it; screen readers don't get noise).

### P4. Color contrast

Existing zinc-900 / white, emerald-50 / emerald-700, amber-50 /
amber-900 are all AA at the sizes they're used. New tokens
should pick combinations that are AA by default. Don't pick
`text-zinc-500` on white for body copy — that's been borderline
in the screenshots; keep it for muted secondary only.

### P5. Focus rings

Tailwind's defaults are stripped in `globals.css` only by
implication (we don't override `outline: none`). Confirm by
manual tab-through after refactor: every button, link, input,
checkbox, radio must show a visible focus ring. Lint doesn't
check this.

---

## Lint + smoke + spec compliance

### L1. Lint baseline

Current state: `eslint.config.mjs` extends `eslint-config-next`
core-web-vitals and typescript. Two known lint suppressions in
`checklist-runner.tsx` and `form-runner.tsx`
(`react-hooks/set-state-in-effect`) are documented in `spec.md`
and intentional — keep them.

**Plan:** after the refactor, run `npx eslint .` (no new errors
introduced). Don't suppress warnings without documenting.

### L2. Smoke coverage

Current `bin/smoke` probes (the actual list):

1. `/` (followed redirect)
2. `/api/health` (404 OK until Phase 0 lands)
4. `/en/categories`
5. `/en/categories/communications`
6. `/en/search`
7. `/en/search?q=encryption`
8-13. `/{ar,es,fa,fr,ru,zh-Hant}/search?q=internet` × 6
14-20. `/{ar,es,fa,fr,ru,zh-Hant}/pathways` × 7
21-23. A picked `/pathways/<slug>` × 3 locales
24-30. `/{ar,es,fa,fr,ru,zh-Hant}/forms` × 7
31-33. A picked `/forms/<form_slug>` × 3 locales
34. `/api/auth/get-session`
35. `POST /api/auth/sign-out`
36-42. `/{ar,es,fa,fr,ru,zh-Hant}/sign-in` × 7
43-46. `/api/me/pathway/test` × 2 (GET + POST /sync, both expect 401)
47-50. `/api/me/form/test` × 2 (GET + POST /sync, both expect 401)
51-64. `/{ar,es,fa,fr,ru,zh-Hant}/{how-to-use,terms}` × 14
65-71. `/{ar,es,fa,fr,ru,zh-Hant}/does-not-exist` × 7

That's ~71 explicit checks. The audit doesn't change routes —
the credits page is the only new route, so we'll add one probe
per locale for `/<lang>/credits` (7 more checks, ~78 total).

**Plan:** add `/<lang>/credits` smoke coverage in 7 locales.
Bump the per-locale count comment in `bin/smoke` if any.

### L3. No `dynamic = "force-dynamic"`

Every DB-touching route in the app uses
`export const instant = false` (Next 16 `cacheComponents: true`
rejects the old spelling — see `spec.md`). The new credits
route is a static page — no DB calls, no `instant = false`
needed. The new homepage hero still calls `getTopLevelCategories`,
so `instant = false` stays on `app/[lang]/page.tsx`. Smoke
exercises every locale × home page already.

### L4. i18n key parity

Current shape: all 6 non-English locales have the same top-level
keys as `en.json`, except for `auth.title`,
`auth.magicLinkExplainer`, `auth.emailLabel`, `auth.sendLink`,
`auth.sending`, `auth.checkYourEmail` (6 keys). Those fall back
to English via the `withFallback` shim in `i18n.ts`.

**Plan:** don't fix the auth gap in this PR — it's a content
translatency issue, not a UI issue, and the fallback works.
New keys this PR introduces (`hero.*`, `footer.credits`,
`empty.title/body`, etc.) must be added to all 7 message files
in lockstep.

---

## New components + routes the audit recommends

(Re-stating the kickoff list, refined.)

| New file | Purpose |
|---|---|
| `components/button.tsx` | Variant-driven button (T4) |
| `components/card.tsx` | Shared card primitive (T5) |
| `components/sync-status-pill.tsx` | Sync indicator shared by both runners (T6) |
| `components/empty-state.tsx` | Shared empty-state primitive (E1, E2) |
| `components/hero.tsx` | Homepage hero with image + dual CTA (E3) |
| `components/topic-figure.tsx` | Optional captioned inline figure for topic pages (E4) |
| `components/footer.tsx` | Extract footer from layout (E7) |
| `app/[lang]/credits/page.tsx` | Pexels attribution page |
| `public/images/hero-*.jpg` | Hero photo |
| `public/images/topic-*.jpg` | Topic page figures (optional, category-keyed) |
| `public/images/empty-*.jpg` | Empty-state illustrations |
| `dev-docs/pexels-credits.md` | Source of truth for the credits page (file-based, like privacy) |

**Hard stops respected:**

- No new third-party service or library. (Photos are static
  assets.)
- No change to the privacy statement. (The `privacy-statement-v1.md`
  file is untouched.)
- No change to deployment posture. (Composes + Cloudflare stay
  as-is.)
- No change to the auth flow. (`header-auth.tsx` sign-out is
  untouched; better-auth contract preserved.)
- No push to origin. (Branch stays local until user requests
  push.)
- No `PENDING_REVIEW` gate change. (`terms/page.tsx` constant
  stays as-is.)
- No `Umbrella_android` changes (read-only).
- No hot-linking Pexels at runtime. (Assets are `public/images/`.)
- No analytics / tracking / third-party scripts.

---

## What this audit does NOT cover (deliberately deferred)

- **Animations.** v1 is static. No motion was requested in the
  kickoff. Future pass.
- **Loading states beyond `isPending`.** The runners render fine
  with localStorage. Networked async paths (search results,
  sync pills) use `pending` flags from `useTransition` already.
  No skeleton screen was requested.
- **A proper theme picker.** Stays on `prefers-color-scheme`.
- **Custom illustrations.** Stock photos only — drawing custom
  illustrations is out of scope for v1.
- **Dark-mode-tuned photography.** Photos will look fine in both
  light and dark mode if we pick muted palettes. A dark-only
  variant pass is a future item.
- **Localisation date formats** (T7). Logged but not done.
- **The existing `auth.*` i18n gap** (the 6 missing keys in
  non-en locales). Pre-existing; not this PR's job.
- **`/account` page.** There's no `/account` page yet despite
  `header-auth.tsx` linking to it. That's a separate auth PR.

---

## Open questions for the user (before any code lands)

1. **Hero copy.** The kickoff says "image + headline + dual CTA".
   Should the headline be the current
   `home.title` ("Umbrella, on the web")? It's a v1 placeholder
   tone; the auth-or-otherwise audience may want something
   sharper. Suggest keeping current copy and treating the hero
   polish as visual only — **your call.**
2. **Pexels API key or manual download?** Kickoff leaves this
   open. Recommend **manual download** (committed to repo) for
   the reasons in T-Photo §1. **Confirm?**
3. **Topic-figure defaulting.** Should every topic page get a
   curated hero image by default, or should figures be opt-in
   per topic (only set when an import-time field is populated)?
   Recommend **opt-in** for v1 — preserves the data shape and
   keeps the noise out. **Confirm?**
4. **How-to-use intro photo.** Should we replace the Android
   screenshots entirely with web screenshots, or keep Android
   shots + add a single web hero? Recommend **keep Android shots
   + add a small web-style note** ("screenshots from the Android
   build; the web build is functionally equivalent") and leave
   the body alone. **Confirm?**
5. **Footer credits link.** Add `/<lang>/credits` (Pexels
   attribution) and link from the footer? **Recommend yes.**
6. **`/account` page.** Header links to it but it doesn't exist
   yet. Out of scope for this PR (auth PR owns it). **Confirm?**

---

## Status

**Audit complete. Awaiting user direction before any code
change.** The branch is `anotsodev-ui-ux-beautification`,
working tree clean. No commits have been made against the
audit.