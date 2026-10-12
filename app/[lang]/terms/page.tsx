// /[lang]/terms — renders the v1 privacy statement that lives in
// dev-docs/privacy-statement-v1.md. The file is the source of
// truth; this page reads it on every request so the user can
// edit the file and see the page update without a rebuild.
//
// The page shows a yellow "pending review" banner at the top
// because the copy has not been approved by the project
// maintainer. Once the user reviews and removes the
// `PENDING_REVIEW` constant below, the banner goes away.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const PENDING_REVIEW = false;
const PRIVACY_PATH = join(
  process.cwd(),
  "dev-docs",
  "privacy-statement-v1.md",
);

// The terms page reads the privacy-statement file from disk on
// every request so the maintainer can edit dev-docs and see the
// change without a rebuild. That filesystem access makes the
// route uncacheable, so it can't be prerendered — opt out of
// Cache Components' blocking prerender. The DB-free read keeps
// the cost negligible.
export const instant = false;

async function readPrivacyMarkdown(): Promise<string> {
  try {
    const raw = await readFile(PRIVACY_PATH, "utf8");
    // Strip the leading DRAFT status blockquote — it's a comment
    // for the editor, not part of the user-facing copy.
    const cleaned = raw.replace(
      /^>\s+\*\*Status: DRAFT[^\n]*\n(?:^>.*\n)*\n?/m,
      "",
    );
    const file = await remark().use(remarkGfm).use(remarkHtml).process(cleaned);
    return String(file);
  } catch (err) {
    return `<p class="text-warn-soft-fg">Failed to load privacy statement: ${(err as Error).message}</p>`;
  }
}

export default async function TermsPage() {
  const html = await readPrivacyMarkdown();
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {PENDING_REVIEW ? <PendingReviewBanner /> : null}
      <article
        className="prose-umbrella max-w-none"
        // The HTML comes from a controlled file in our own repo
        // (dev-docs/privacy-statement-v1.md). It's not user input.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}

function PendingReviewBanner() {
  return (
    <div
      role="status"
      className="mb-6 rounded-md border border-warn-soft-border bg-warn-soft-bg p-4 text-sm text-warn-soft-fg"
    >
      <p className="font-medium">Pending review</p>
      <p className="mt-1 text-xs">
        This privacy statement is a v1 draft and has not been
        approved by the project maintainer. Do not share this URL
        publicly until review is complete. To update the copy, edit{" "}
        <code>dev-docs/privacy-statement-v1.md</code> and remove
        the <code>PENDING_REVIEW</code> constant in{" "}
        <code>app/[lang]/terms/page.tsx</code>.
      </p>
    </div>
  );
}
