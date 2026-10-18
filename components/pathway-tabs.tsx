"use client";

// PathwayTabs — tabbed navigation for the pathways index. The
// checklist count per category is too large for a single scrolling
// page, so categories become tabs and only the active category's
// cards render. Server passes the grouped data; this component owns
// only the active-tab state.
//
// Accessibility: WAI-ARIA tabs pattern — tablist/tab/tabpanel with
// roving tabindex and arrow-key navigation.

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LinkCard } from "@/components/card";

export type PathwayTabGroup = {
  slug: string;
  title: string;
  items: {
    id: string;
    slug: string;
    title: string;
    itemCount: number;
  }[];
};

type Props = {
  groups: PathwayTabGroup[];
  lang: string;
};

export function PathwayTabs({ groups, lang }: Props) {
  const t = useTranslations("pathways");
  const [active, setActive] = useState(-1);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const showAll = active === -1;
  const group = showAll ? undefined : groups[active]!;


  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const last = groups.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

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
          className={
            showAll
              ? "rounded-full border border-accent bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
              : "rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-sunken hover:text-fg"
          }
        >
          {t("allCategories")}
        </button>
        {groups.map((g, i) => {
          const selected = i === active;
          return (
            <button
              key={g.slug}
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
              className={
                selected
                  ? "rounded-full border border-accent bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                  : "rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-sunken hover:text-fg"
              }
            >
              {g.title}
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
      ) : (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active}`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className="mt-6"
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {group!.items.map((c) => (
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
      )}
    </div>
  );
}
