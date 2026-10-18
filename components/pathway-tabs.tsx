"use client";

// PathwayTabs — two-level navigation for the pathways index.
//
// The upstream data is three-level: a curated "Pathways" category
// plus `Domain / Subtopic / Level` categories (e.g. "Communications /
// Censorship / Beginner"). Rendering every leaf as a tab produced a
// ~50-pill wall, so instead:
//
//   - Top-level tabs: "All categories" + one per domain (8-9 pills).
//   - A domain tab shows its subtopics as sections of level cards,
//     ordered Beginner → Advanced → Expert (slug suffix; labels are
//     localized via the `levels` message keys).
//   - A flat category (no " / " in the title — only Pathways today)
//     renders as a single grid.
//   - "All categories" is an overview: one section per domain with a
//     "Browse N checklists" action that switches to that domain's
//     tab, plus the curated Pathways grid. A client-side filter
//     narrows cards in place across all panels.
//
// The server (app/[lang]/pathways/page.tsx) builds the domain
// structure; this component owns the active-tab and filter state.
//
// Accessibility: WAI-ARIA tabs pattern — tablist/tab/tabpanel with
// roving tabindex and arrow/Home/End key navigation. The filter is
// a labelled search input; result counts are announced politely.

import { useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LinkCard } from "@/components/card";
import { levelFromSlug } from "@/lib/levels";

export type PathwayTabItem = {
  id: string;
  slug: string;
  title: string;
  itemCount: number;
};

// One subtopic section inside a domain: heading + level-ordered cards.
export type PathwayTabSection = {
  slug: string;
  title: string;
  items: PathwayTabItem[];
};

export type PathwayTabDomain = {
  slug: string;
  title: string;
  sections: PathwayTabSection[];
};

type Props = {
  domains: PathwayTabDomain[];
  lang: string;
};

const TAB_BASE =
  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
  "touch-manipulation focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const TAB_SELECTED =
  "border-accent bg-accent text-accent-fg hover:bg-accent-hover";
const TAB_UNSELECTED =
  "border-line bg-surface text-fg-muted hover:border-line-strong hover:bg-surface-sunken hover:text-fg";

const FILTER_INPUT_CLASSES =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm " +
  "text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none";

// Card meta line for a checklist with a level suffix (e.g.
// "Beginner · Censorship"). Flat-category checklists (curated
// Pathways) have no level; they render without a meta line. Card
// titles are pre-composed server-side (subtopic as title), so only
// the meta needs the section title here.
function cardMeta(
  item: PathwayTabItem,
  sectionTitle: string,
  levelLabel: (level: string) => string
): string | undefined {
  const level = levelFromSlug(item.slug);
  if (!level) return undefined;
  return `${levelLabel(level)} · ${sectionTitle}`;
}

export function PathwayTabs({ domains, lang }: Props) {
  const t = useTranslations("pathways");
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const showAll = active === -1;
  const normalizedQuery = query.trim().toLowerCase();

  // Filter applies to the active domain panel and the overview.
  // Maps domain slug → matching items; null when not filtering.
  const matches = useMemo(() => {
    const q = normalizedQuery;
    if (!q) return null;
    const out = new Map<string, PathwayTabItem[]>();
    for (const d of domains) {
      const hits: PathwayTabItem[] = [];
      for (const s of d.sections) {
        for (const item of s.items) {
          if (item.title.toLowerCase().includes(q)) {
            hits.push(item);
          }
        }
      }
      if (hits.length > 0) out.set(d.slug, hits);
    }
    return out;
  }, [domains, normalizedQuery]);

  const matchCount = matches
    ? Array.from(matches.values()).reduce((n, items) => n + items.length, 0)
    : 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // Tab indices: 0 = "All categories", 1..domains.length = domains.
    const last = domains.length;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = active + 1 > last ? 0 : active + 1;
    else if (e.key === "ArrowLeft") next = active - 1 < 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  const tabClass = (selected: boolean) =>
    `${TAB_BASE} ${selected ? TAB_SELECTED : TAB_UNSELECTED}`;

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("title")}
        className="flex flex-wrap gap-2"
      >
        <button
          ref={(el) => {
            tabRefs.current[0] = el;
          }}
          role="tab"
          id={`${baseId}-tab-all`}
          aria-selected={showAll}
          aria-controls={`${baseId}-panel-all`}
          tabIndex={showAll ? 0 : -1}
          onClick={() => setActive(-1)}
          onKeyDown={onKeyDown}
          className={tabClass(showAll)}
        >
          {t("allCategories")}
        </button>
        {domains.map((d, i) => {
          const selected = i === active;
          const count = d.sections.reduce((n, s) => n + s.items.length, 0);
          return (
            <button
              key={d.slug}
              ref={(el) => {
                tabRefs.current[i + 1] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
              className={tabClass(selected)}
            >
              {d.title}
              <span className="ms-1.5 text-xs font-normal tabular-nums opacity-60">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <label htmlFor={`${baseId}-filter`} className="sr-only">
          {t("filterLabel")}
        </label>
        <input
          id={`${baseId}-filter`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("filterLabel")}
          className={FILTER_INPUT_CLASSES}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {matches
          ? t("filterResults", { count: matchCount, query: query.trim() })
          : ""}
      </p>

      {showAll ? (
        <OverviewPanel
          domains={domains}
          matches={matches}
          lang={lang}
          baseId={baseId}
          onOpenDomain={setActive}
        />
      ) : (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active}`}
          aria-labelledby={`${baseId}-tab-${active}`}
        >
          <DomainPanel
            domain={domains[active]!}
            lang={lang}
            filterQuery={normalizedQuery}
          />
        </div>
      )}
    </div>
  );
}

// One domain's tab panel: subtopic sections with level-ordered
// cards. While filtering, sections with no matches are hidden and
// an empty state shows when nothing matches at all.
function DomainPanel({
  domain,
  lang,
  filterQuery,
}: {
  domain: PathwayTabDomain;
  lang: string;
  filterQuery: string;
}) {
  const t = useTranslations("pathways");

  const sections = domain.sections
    .map((s) => ({
      ...s,
      items: filterQuery
        ? s.items.filter((i) => i.title.toLowerCase().includes(filterQuery))
        : s.items,
    }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return (
      <p className="mt-8 text-sm text-fg-muted">
        {t("filterEmpty", { query: filterQuery })}
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {sections.map((s) => (
        <section key={s.slug}>
          {s.title ? (
            <h2 className="text-balance text-xl font-medium text-fg">
              {s.title}
            </h2>
          ) : null}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.items.map((item) => (
              <li key={item.id}>
                <LinkCard
                  href={`/${lang}/pathways/${item.slug}`}
                  title={item.title}
                  subtitle={t("itemCount", { count: item.itemCount })}
                  meta={cardMeta(item, s.title, (l) => t(`levels.${l}`))}
                  titleSize="sm"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// "All categories" default view: one section per domain with a
// "Browse N checklists" action that switches to that domain's tab,
// plus the curated Pathways grid. While filtering, sections collapse
// to just the matching cards.
function OverviewPanel({
  domains,
  matches,
  lang,
  baseId,
  onOpenDomain,
}: {
  domains: PathwayTabDomain[];
  matches: Map<string, PathwayTabItem[]> | null;
  lang: string;
  baseId: string;
  onOpenDomain: (index: number) => void;
}) {
  const t = useTranslations("pathways");

  const visible = matches
    ? domains
        .map((d, i) => ({ domain: d, index: i, hits: matches.get(d.slug) }))
        .filter((e) => e.hits && e.hits.length > 0)
    : domains.map((d, i) => ({ domain: d, index: i, hits: undefined }));

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-all`}
      aria-labelledby={`${baseId}-tab-all`}
      className="mt-8 space-y-10"
    >
      {visible.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {t("filterEmpty", { query: "" })}
        </p>
      ) : (
        visible.map(({ domain, index, hits }) => {
          const checklistCount = hits
            ? hits.length
            : domain.sections.reduce((n, s) => n + s.items.length, 0);
          const subtopicCount = domain.sections.filter(
            (s) => s.title !== ""
          ).length;
          return (
            <section key={domain.slug}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-balance text-xl font-medium text-fg">
                  {domain.title}
                </h2>
                <p className="text-xs tabular-nums text-fg-subtle">
                  {t("checklistCount", { count: checklistCount })}
                  {!hits && subtopicCount > 0
                    ? ` · ${t("subtopicsCount", { count: subtopicCount })}`
                    : ""}
                </p>
              </div>
              {hits ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {hits.map((item) => {
                    const section = domain.sections.find((s) =>
                      s.items.some((i) => i.id === item.id)
                    )!;
                    return (
                      <li key={item.id}>
                        <LinkCard
                          href={`/${lang}/pathways/${item.slug}`}
                          title={item.title}
                          subtitle={t("itemCount", { count: item.itemCount })}
                          meta={cardMeta(item, section.title, (l) =>
                            t(`levels.${l}`)
                          )}
                          titleSize="sm"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <DomainOverviewBody
                  domain={domain}
                  domainIndex={index}
                  lang={lang}
                  onOpenDomain={onOpenDomain}
                />
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

// Unfiltered overview body for one domain: a "Browse N checklists"
// button that switches to the domain tab, or the flat Pathways grid.
function DomainOverviewBody({
  domain,
  domainIndex,
  lang,
  onOpenDomain,
}: {
  domain: PathwayTabDomain;
  domainIndex: number;
  lang: string;
  onOpenDomain: (index: number) => void;
}) {
  const t = useTranslations("pathways");

  if (domain.sections.length === 1 && domain.sections[0].title === "") {
    return (
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {domain.sections[0].items.map((c) => (
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
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenDomain(domainIndex)}
      className="mt-3 text-sm font-medium text-accent hover:underline"
    >
      {t("browseDomain", {
        count: domain.sections.reduce((n, s) => n + s.items.length, 0),
      })}
    </button>
  );
}
