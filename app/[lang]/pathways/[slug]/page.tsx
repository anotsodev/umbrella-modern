// Single pathway (checklist) page — renders the title, intro, and a
// list of items grouped by section. Item completion state lives in
// the client component (localStorage for v1; per-user in Phase 2).

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { getChecklist } from "@/lib/reader";
import { levelFromSlug } from "@/lib/levels";
import { ChecklistRunner } from "@/components/checklist-runner";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export default async function ChecklistPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const checklist = await getChecklist(lang, slug);
  if (!checklist) notFound();

  const t = await getTranslations("pathways");
  const backHref = `/${lang}/pathways`;
  const backLabel = t("back");

  // Slash-category checklists are titled "Beginner"/"Advanced"/"Expert"
  // upstream — meaningless as a page heading. Compose
  // "Subtopic — Level" from the category path instead, and show the
  // domain as the subtitle. Flat categories (curated Pathways) have
  // real titles; keep them as-is.
  const parts = checklist.categoryTitle.split(" / ");
  const level = levelFromSlug(checklist.slug);
  const heading =
    parts.length >= 3 && level
      ? `${parts.slice(1, -1).join(" / ")} — ${t(`levels.${level}`)}`
      : checklist.title;
  const subtitle =
    parts.length >= 3 && level ? parts[0] : checklist.categoryTitle;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <nav className="text-sm text-fg-muted">
        <Link href={backHref} className="hover:underline">
          ← {backLabel}
        </Link>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {heading}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
      {checklist.intro ? (
        <div
          className="prose-umbrella mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: checklist.intro }}
        />
      ) : null}

      <ChecklistRunner
        slug={checklist.slug}
        lang={lang}
        items={checklist.items}
        labels={{
          progress: t("progress"),
          markAllDone: t("markAllDone"),
          clearAll: t("clearAll"),
          itemCount: t("itemCount", { count: checklist.itemCount }),
          empty: t("empty"),
        }}
      />
    </main>
  );
}
