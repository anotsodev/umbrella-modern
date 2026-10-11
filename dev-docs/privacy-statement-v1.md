# Umbrella Privacy Statement (v1 draft)

> **Status: DRAFT — pending user review.** This copy is wired into
> the runtime `/terms` page behind a yellow "pending review" banner.
> Edit this file to update the live page. The page re-reads the file
> on every request, so no rebuild is needed.

This statement describes what data Umbrella — the open-source web
rebuild of the security-information app — collects, how it's used,
and what choices you have. It applies to the web app at
`umbrella.example.org` (the production domain is not yet
finalized; this is a placeholder).

## Short version

- **No analytics, no tracking, no advertising.** No third-party
  scripts, no cookies for advertising, no fingerprinting.
- **You can use Umbrella anonymously.** Read topics, fill
  checklists, fill forms, export your answers. Nothing leaves
  your device.
- **If you sign in, we store the minimum needed to sync your
  progress across devices**: your email address, your per-pathway
  progress, your form answers, and the locale you last viewed
  from. That's it. We do not collect your name, your IP address,
  your device fingerprint, or anything else.
- **We invalidate your server session immediately when you sign
  out.** The session record in our database is deleted the moment
  you click "Sign out" — the cookie is cleared in the same call.
  The same code path is exercised on every browser, every device,
  every time.
- **You'll be able to export or delete your data** from your
  account page. (We are adding these controls in a follow-up
  release. Until they're live, contact us at the email below and
  we'll handle export or deletion manually.)
- **We will not sell, rent, or share your data with anyone.** The
  service is self-hosted by the project maintainers; we do not
  rely on third-party data processors beyond the email-sending
  provider (Resend) and the database host.
- **Content is open-source** under GPLv3. The guide content
  itself is mirrored from
  [`securityfirst/umbrella-content`](https://github.com/securityfirst/umbrella-content)
  on a daily basis.

## Two ways to use Umbrella

### 1. Anonymous (default)

When you first visit Umbrella, no account is created. You can
browse the topic library in any of the supported languages,
search, fill in the action-pathway checklists, fill in the
safety-planning forms, and export any of those to a printable
HTML file on your device.

Your progress on pathways and forms is saved in your browser's
`localStorage` under keys that start with `umbrella.`. We do not
see this data — it never leaves your device. If you clear your
browser data, switch browsers, or use a private window, your
progress starts from zero on that device.

### 2. Signed-in (opt-in)

If you want your progress to sync across devices, you can sign in
with an email address. We send you a one-time sign-in link
(a "magic link") — no password to remember or lose. When you
sign in:

- We create an account record tied to your email.
- We create a session, which is stored as a hashed token in an
  HTTP-only cookie. We do not log the raw token.
- Your pathway check states, form answers, and the locale you
  last viewed from are saved to our database under your account.
- Subsequent changes are debounced (about 500ms) and synced
  automatically.

## What we collect if you sign in

| Data | Purpose | Retention |
|---|---|---|
| Email address | Sign-in, account identification, export/delete requests | Until you delete your account |
| Per-pathway check states | Sync your progress across devices | Until you delete your account |
| Per-form answer snapshots | Sync your progress across devices | Until you delete your account |
| Last-viewed locale | Show you the right language on next visit | Until you delete your account |
| Hashed session token | Keep you signed in | Until you sign out. When you click "Sign out", the server-side session record is deleted immediately. The cookie is also removed. |

We do **not** collect:

- Your name (we don't ask for it; we don't derive it)
- Your IP address (we do not log request IPs)
- Your device fingerprint
- Pages you visit or how long you spend on them
- Your contacts, your location, or anything from your device

## How we send the sign-in email

Sign-in emails are sent through [Resend](https://resend.com), a
transactional email provider. When you click "send sign-in link",
your email address is sent to Resend for the sole purpose of
delivering the link. Resend's own privacy policy applies to that
one transmission.

If you prefer that your email never reaches a US-based service,
self-hosting the project and replacing the email transport with a
provider of your choice is encouraged — see the project README
for details.

## Data export and deletion

From the account page, signed-in users can:

- **Export my data** — receive a JSON file containing your email,
  your pathway progress, and your form answers. The export is
  generated on demand and emailed to you (the same address is
  used for both sign-in and delivery).
- **Delete my account** — permanently delete your account record
  and all data associated with it (pathway progress, form
  answers, sessions, magic-link records). This is irreversible.

Requests are processed immediately. There is no "soft delete"
window — once you confirm, the data is gone.

## Hosting

- **Application:** self-hosted Docker on a single VPS, operated
  by the project maintainers.
- **Database:** Postgres, on the same VPS as the application.
- **Access layer:** Cloudflare Zero Trust, in front of the
  application. Only authorized users can reach the site. We do
  not see the user's IP address; Cloudflare's edge IP is what
  reaches the application.
- **Email delivery:** [Resend](https://resend.com) — used only
  to send magic-link sign-in emails.
- **Region:** us-east.

## Where data is hosted

- **Database** (Postgres) — the project maintainers' VPS, in a
  single US-east region (us-east). Daily encrypted backups are
  kept for 30 days. Backups are deleted on account deletion as
  part of the purge.
- **Email** — Resend (US). Used only for sign-in links.
- **Application code and content** — open-source on GitHub. The
  content itself (`securityfirst/umbrella-content`) is mirrored
  daily via the import job.

## Cookies

Umbrella sets one cookie: a session cookie that identifies you
once you sign in. The cookie is HTTP-only (not accessible to
JavaScript) and SameSite=Lax. It is removed when you sign out
or when the session expires.

Anonymous users receive no cookies.

## Children

Umbrella is not directed at children under 13 and we do not
knowingly collect data from children. The content covers
sensitive safety topics; please consider whether the app is
appropriate for any minor in your care before sharing it.

## Changes to this statement

If we make a material change to this statement — for example, if
we add a new category of data we collect — we will post a notice
on the home page and update the "last updated" date below.
Significant changes will not be retroactive; they apply to data
collected after the change.

## License

Umbrella is open-source software, released under the
[GNU General Public License v3](https://www.gnu.org/licenses/gpl-3.0.html).
The guide content is mirrored from
[`securityfirst/umbrella-content`](https://github.com/securityfirst/umbrella-content),
which is also GPLv3-licensed.

## Contact

To report a privacy concern, request data export or deletion, or
ask a question:

- Email: `privacy@anotsodev.me`
- GitHub issues: `https://github.com/anotsodev/umbrella-modern/issues`

---

*Last updated: 2026-10-11. This is a v1 draft pending review by
the project maintainer.*
