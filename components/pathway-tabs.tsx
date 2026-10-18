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
//     ordered Beginner → Advanced → Expert (slug suffix; level names
//     are not localized upstream).
//   - A flat category (no " / " in the title — only Pathways today)
//     renders as a single grid.
//   - "All categories" keeps the previous fully-grouped layout.
//
// The server (app/[lang]/pathways/page.tsx) builds the domain
// structure; this component owns only the active-tab state.
//
// Accessibility: WAI-ARIA tabs pattern — tablist/tab/tabpanel with
// roving tabindex and arrow/Home/End key navigation.

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LinkCard } from "@/components/card";

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
  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors";
const TAB_SELECTED =
  "border-accent bg-accent text-accent-fg hover:bg-accent-hover";
const TAB_UNSELECTED =
  "border-line bg-surface text-fg-muted hover:border-line-strong hover:bg-surface-sunken hover:text-fg";

export function PathwayTabs({ domains, lang }: Props) {
  const t = useTranslations("pathways");
  const [active, setActive] = useState(-1);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const showAll = active === -1;


  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const last = domains.length; // +1 for the "all" tab at index 0
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
              <span className="ms-1.5 text-xs font-normal opacity-60">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {showAll ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-all`}
          aria-labelledby={`${baseId}-tab-all`}
          className="mt-8 space-y-10"
        >
          {domains.map((d) => (
            <section key={d.slug}>
              <h2 className="text-xl font-medium text-fg">{d.title}</h2>
              {d.sections.length === 1 && d.sections[0].title === "" ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {d.sections[0].items.map((c) => (
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
              ) : (
                d.sections.map((s) => (
                  <div key={s.slug} className="mt-4">
                    <h3 className="text-base font-medium text-fg-muted">
                      {s.title}
                    </h3>
                    <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                      {s.items.map((c) => (
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
                  </div>
                ))
              )}
            </section>
          ))}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active}`}
          aria-labelledby={`${baseId}-tab-${active}`}
        >
          <DomainPanel domain={domains[active]!} lang={lang} />
        </div>
      )}
    </div>
  );
}

// Panel body for one domain: subtopic sections, or a single grid
// when the category has no slash format (empty section title).
function DomainPanel({
  domain,
  lang,
}: {
  domain: PathwayTabDomain;
  lang: string;
}) {
  const t = useTranslations("pathways");

  return domain.sections.length === 1 && domain.sections[0].title === "" ? (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
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
  ) : (
    <div className="mt-8 space-y-8">
      {domain.sections.map((s) => (
        <section key={s.slug}>
          <h2 className="text-xl font-medium text-fg">{s.title}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.items.map((c) => (
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
  );
}
