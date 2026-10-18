// Pathways index — list every checklist (pathway) for a language.
// The upstream data is three-level (curated "Pathways" category plus
// `Domain / Subtopic / Level` categories), which is too much for one
// scrolling page or one flat tab row, so the page groups it into
// domains → subtopics → level-ordered cards and hands the structure
// to PathwayTabs (client) for tabbed navigation. Progress is stored
// per checklist as before.

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { getAllChecklists } from "@/lib/reader";
import { levelFromSlug } from "@/lib/levels";
import { EmptyState } from "@/components/empty-state";
import {
  PathwayTabs,
  type PathwayTabDomain,
  type PathwayTabItem,
} from "@/components/pathway-tabs";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
};

// Level rank from the checklist slug suffix. Level names are not
// localized upstream (every locale shows Beginner/Advanced/Expert),
// so the slug suffix is a stable ordering key. Unknown suffixes sort
// last; Array.sort is stable, so DB order is preserved among them.
const LEVEL_RANK: Record<string, number> = {
  "-beginner": 0,
  "-advanced": 1,
  "-expert": 2,
};

function levelRank(slug: string): number {
  for (const suffix of Object.keys(LEVEL_RANK)) {
    if (slug.endsWith(suffix)) return LEVEL_RANK[suffix];
  }
  return 3;
}

// "Domain / Subtopic / Level" → { domain, subtopic }. Categories
// without the slash format (Pathways) return null.
function splitCategory(title: string): {
  domain: string;
  subtopic: string;
} | null {
  const parts = title.split(" / ");
  if (parts.length < 3) return null;
  return { domain: parts[0], subtopic: parts.slice(1, -1).join(" / ") };
}

function toTabItem(c: {
  id: string;
  slug: string;
  title: string;
  itemCount: number;
}): PathwayTabItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    itemCount: c.itemCount,
  };
}

// Card title for a checklist. Slash-category checklists are titled
// "Beginner"/"Advanced"/"Expert" upstream — meaningless without the
// section heading — so the subtopic becomes the card title and the
// level is rendered as a localized meta line by PathwayTabs (via
// levelFromSlug). Flat-category checklists (curated Pathways) have
// real titles and no level suffix; they render as-is.
function cardTitle(item: PathwayTabItem, sectionTitle: string): string {
  return levelFromSlug(item.slug) ? sectionTitle : item.title;
}

export default async function PathwaysIndex({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("pathways");
  const checklists = await getAllChecklists(lang);

  // Build domains → subtopics → items. DB order is already grouped
  // by category (getAllChecklists orders by categoryId), so first-
  // seen order of domains and subtopics is stable.
  const domainMap = new Map<
    string,
    {
      title: string;
      // "" subtopic = flat category (no slash format)
      subs: Map<string, { slug: string; title: string; items: PathwayTabItem[] }>;
    }
  >();

  for (const c of checklists) {
    const parsed = splitCategory(c.categoryTitle);
    const domainKey = parsed ? parsed.domain : c.categoryTitle;
    const subKey = parsed ? parsed.subtopic : "";

    let d = domainMap.get(domainKey);
    if (!d) {
      d = { title: domainKey, subs: new Map() };
      domainMap.set(domainKey, d);
    }
    let s = d.subs.get(subKey);
    if (!s) {
      s = { slug: c.categorySlug, title: subKey, items: [] };
      d.subs.set(subKey, s);
    }
    s.items.push(toTabItem(c));
  }

  const domains: PathwayTabDomain[] = Array.from(domainMap.values()).map(
    (d) => ({
      slug: d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: d.title,
      sections: Array.from(d.subs.values()).map((s) => ({
        ...s,
        items: [...s.items]
          .sort((a, b) => levelRank(a.slug) - levelRank(b.slug))
          .map((item) => ({ ...item, title: cardTitle(item, s.title) })),
      })),
    })
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-balance text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 text-fg-muted">{t("intro")}</p>

      {domains.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            variant="pathway"
            title={t("emptyState.title")}
            description={t("emptyState.body")}
          />
        </div>
      ) : (
        <div className="mt-8">
          <PathwayTabs domains={domains} lang={lang} />
        </div>
      )}
    </main>
  );
}
