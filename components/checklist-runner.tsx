"use client";

// ChecklistRunner — renders a pathway's items with checkboxes and
// persists per-item completion to localStorage. v1 is anonymous
// (no account required); Phase 2 swaps localStorage for per-user
// server state when accounts land.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChecklistItem } from "@/lib/reader";

type Labels = {
  progress: string;
  markAllDone: string;
  clearAll: string;
  itemCount: string;
  empty: string;
};

type Props = {
  slug: string;
  items: ChecklistItem[];
  labels: Labels;
};

function storageKey(slug: string): string {
  return `umbrella.pathway.${slug}.checked`;
}

function loadChecked(slug: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveChecked(slug: string, value: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // localStorage can throw in private-mode / quota scenarios; we
    // don't want progress tracking to break the page render.
  }
}

export function ChecklistRunner({ slug, items, labels }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state on mount. We intentionally don't read
  // localStorage during SSR — the rendered HTML uses an empty map,
  // then a useEffect hydrates the real state on the client.
  useEffect(() => {
    setChecked(loadChecked(slug));
    setHydrated(true);
  }, [slug]);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    saveChecked(slug, checked);
  }, [slug, checked, hydrated]);

  // Only "check" and "umbrella" items are user-actionable. The
  // helper has already attached a sectionTitle to each item by
  // walking the list, so we can safely drop the section dividers
  // from what we render.
  const checkableItems = useMemo(
    () => items.filter((it) => it.kind === "check" || it.kind === "umbrella"),
    [items],
  );
  const totalItems = checkableItems.length;
  const doneCount = useMemo(
    () =>
      checkableItems.reduce((acc, it) => (checked[it.id] ? acc + 1 : acc), 0),
    [checkableItems, checked],
  );
  const percent =
    totalItems === 0 ? 0 : Math.round((doneCount / totalItems) * 100);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const markAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const it of checkableItems) next[it.id] = true;
    setChecked(next);
  }, [checkableItems]);

  const clearAll = useCallback(() => {
    setChecked({});
  }, []);

  // Group consecutive items by section title (DB returns items
  // already ordered; section items introduce a new heading).
  const groups = useMemo(() => {
    const out: { title: string | null; items: ChecklistItem[] }[] = [];
    for (const it of checkableItems) {
      const last = out[out.length - 1];
      if (last && last.title === it.sectionTitle) {
        last.items.push(it);
      } else {
        out.push({ title: it.sectionTitle, items: [it] });
      }
    }
    return out;
  }, [checkableItems]);

  if (totalItems === 0) {
    return (
      <p className="mt-8 text-sm text-zinc-500">
        {labels.empty}
      </p>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          {labels.itemCount}
        </span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {labels.progress.replace("{percent}", String(percent))}
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          onClick={markAll}
          className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {labels.markAllDone}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {labels.clearAll}
        </button>
      </div>

      <div className="mt-6 space-y-8">
        {groups.map((g, gi) => (
          <div key={`${g.title ?? "_root"}-${gi}`}>
            {g.title ? (
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {g.title}
              </h2>
            ) : null}
            <ul className="mt-3 space-y-2">
              {g.items.map((it) => {
                const id = it.id;
                const isChecked = !!checked[id];
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-white p-3 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(id)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span
                        className={
                          "text-sm leading-relaxed " +
                          (isChecked
                            ? "text-zinc-400 line-through dark:text-zinc-500"
                            : "text-zinc-800 dark:text-zinc-200")
                        }
                      >
                        {it.label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
