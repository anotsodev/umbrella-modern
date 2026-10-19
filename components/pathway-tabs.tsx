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

import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  Star,
  type LucideIcon,
} from "lucide-react";
import { LinkCard } from "@/components/card";
import { levelFromSlug } from "@/lib/levels";
import { ICONS, subtopicIconKey } from "@/lib/subtopic-icons";

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

// Level text colors follow the app's soft-token scale:
// Beginner = success (emerald), Advanced = warn (amber),
// Expert = danger (red). Rendered as plain colored text (no pill).
const LEVEL_TEXT_CLASSES: Record<string, string> = {
  beginner: "text-success-soft-fg dark:text-success-soft-fg-dark",
  advanced: "text-warn-soft-fg dark:text-warn-soft-fg-dark",
  expert: "text-danger-soft-fg dark:text-danger-soft-fg-dark",
};

// Difficulty icon per level — 1–3 filled stars — tinted to the
// level color. Static registry so consumers use member access
// (react-hooks/static-components).
const LEVEL_ICONS: Record<
  string,
  { Icon: LucideIcon; count: number; text: string } | undefined
> = {
  beginner: {
    Icon: Star,
    count: 1,
    text: "text-success-soft-fg dark:text-success-soft-fg-dark",
  },
  advanced: {
    Icon: Star,
    count: 2,
    text: "text-warn-soft-fg dark:text-warn-soft-fg-dark",
  },
  expert: {
    Icon: Star,
    count: 3,
    text: "text-danger-soft-fg dark:text-danger-soft-fg-dark",
  },
};

// Colored difficulty label for a checklist card, styled like the
// card title but tinted to the level color (no pill). Flat-category
// checklists (curated Pathways) have no level and render nothing.
function LevelBadge({ slug }: { slug: string }) {
  const t = useTranslations("pathways");
  const level = levelFromSlug(slug);
  if (!level) return null;
  return (
    <span
      className={`text-base font-medium ${LEVEL_TEXT_CLASSES[level] ?? ""}`}
    >
      {t(`levels.${level}`)}
    </span>
  );
}

// Decorative icon for a subtopic/domain section heading, keyed by
// the section slug (locale-independent). aria-hidden: the heading
// text carries the meaning.
function SectionIcon({ slug }: { slug: string }) {
  const Icon = ICONS[subtopicIconKey(slug)];
  return (
    <Icon
      aria-hidden="true"
      className="size-5 shrink-0 text-fg-subtle"
      strokeWidth={1.75}
    />
  );
}

// Right-side thumbnail tile for a pathway card: a 1–3 star
// difficulty rating (tinted to the level color) for leveled
// checklists, falling back to the subtopic icon for flat
// categories. Decorative — the card title carries the meaning.
function CardThumb({ slug }: { slug: string }) {
  const level = levelFromSlug(slug);
  const entry = level ? LEVEL_ICONS[level] : undefined;
  if (entry) {
    const LevelIcon = entry.Icon;
    return (
      <span className={`flex gap-0.5 ${entry.text}`}>
        {Array.from({ length: entry.count }, (_, i) => (
          <LevelIcon
            key={i}
            aria-hidden="true"
            className="size-6 fill-current"
            strokeWidth={1.5}
          />
        ))}
      </span>
    );
  }
  const Icon = ICONS[subtopicIconKey(slug)];
  return <Icon aria-hidden="true" className="size-8" strokeWidth={1.5} />;
}
// The URL hash is the source of truth for the active tab
// (/en/pathways#communications survives reloads and shared links),
// read through useSyncExternalStore. history.replaceState doesn't
// fire hashchange, so writes notify subscribers manually.
const hashListeners = new Set<() => void>();

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  hashListeners.add(callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    hashListeners.delete(callback);
  };
}

function getHashSlug() {
  return window.location.hash.slice(1);
}

function getServerHashSlug() {
  return "";
}

function setHash(slug: string) {
  const { pathname, search } = window.location;
  window.history.replaceState(
    null,
    "",
    slug ? `#${slug}` : pathname + search
  );
  for (const cb of hashListeners) cb();
}

export function PathwayTabs({ domains, lang }: Props) {
  const t = useTranslations("pathways");
  const [query, setQuery] = useState("");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const slugToIndex = useMemo(
    () => new Map(domains.map((d, i) => [d.slug, i])),
    [domains]
  );
  const hashSlug = useSyncExternalStore(
    subscribeToHash,
    getHashSlug,
    getServerHashSlug
  );
  const active = slugToIndex.get(hashSlug) ?? -1;

  // Single entry point for tab changes so the hash stays in sync.
  // replaceState: switching tabs shouldn't pollute browser history.
  function openDomain(index: number) {
    setHash(index === -1 ? "" : (domains[index]?.slug ?? ""));
  }

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
    openDomain(next);
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
          onClick={() => openDomain(-1)}
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
              onClick={() => openDomain(i)}
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
          onOpenDomain={openDomain}
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
            <h2 className="flex items-center gap-2 text-balance text-xl font-medium text-fg">
              <SectionIcon slug={s.slug} />
              {s.title}
            </h2>
          ) : null}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.items.map((item) => (
              <li key={item.id}>
                <LinkCard
                  href={`/${lang}/pathways/${item.slug}`}
                  title={item.title}
                  header={<LevelBadge slug={item.slug} />}
                  meta={t("itemCount", { count: item.itemCount })}
                  thumb={<CardThumb slug={item.slug} />}
                  titleSize="hidden"
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
// "Browse N checklists" action that switches to that domain's tab.
// While filtering, sections collapse to just the matching cards.
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
                <h2 className="flex items-center gap-2 text-balance text-xl font-medium text-fg">
                  <SectionIcon slug={domain.slug} />
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
                    return (
                      <li key={item.id}>
                        <LinkCard
                          href={`/${lang}/pathways/${item.slug}`}
                          title={item.title}
                          header={
                            <LevelBadge slug={item.slug} />
                          }
                          meta={t("itemCount", { count: item.itemCount })}
                          thumb={<CardThumb slug={item.slug} />}
                          titleSize="hidden"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDomain(index)}
                  className="mt-3 text-sm font-medium text-accent hover:underline"
                >
                  {t("browseDomain", { count: checklistCount })}
                </button>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
