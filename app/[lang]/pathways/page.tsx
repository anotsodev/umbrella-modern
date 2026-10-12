// Pathways index — list every checklist (pathway) for a language,
// grouped by category. Each card links to the per-checklist page
// where users can tick items off; progress is stored in localStorage
// in v1 (Phase 2 swaps for server-side per-user persistence).

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { getAllChecklists } from "@/lib/reader";
import { LinkCard } from "@/components/card";
import { EmptyState } from "@/components/empty-state";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function PathwaysIndex({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("pathways");
  const checklists = await getAllChecklists(lang);

  // Group by categorySlug. Maintain the DB's ordering (which is
  // already grouped via the orderBy in getAllChecklists).
  const grouped = new Map<
    string,
    { title: string; slug: string; items: typeof checklists }
  >();
  for (const c of checklists) {
    const key = c.categorySlug;
    let g = grouped.get(key);
    if (!g) {
      g = { title: c.categoryTitle, slug: c.categorySlug, items: [] };
      grouped.set(key, g);
    }
    g.items.push(c);
  }
  const groups = Array.from(grouped.values());

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-fg-muted">{t("intro")}</p>

      {groups.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            variant="pathway"
            title={t("emptyState.title")}
            description={t("emptyState.body")}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((g) => (
            <section key={g.slug}>
              <h2 className="text-xl font-medium text-fg">{g.title}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.items.map((c) => (
                  <li key={c.id}>
                    <LinkCard
                      href={`/${lang}/pathways/${c.slug}`}
                      title={c.title}
                      subtitle={t("itemCount", { count: c.itemCount })}
                      titleSize="sm"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
