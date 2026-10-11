"use client";

// ChecklistRunner — renders a pathway's items with checkboxes and
// persists per-item completion.
//
// v1: localStorage only. Phase 2: signed-in users sync to the
// server via /api/me/pathway/[slug]/sync, debounced. localStorage
// remains the source of truth for anonymous users and a fallback
// for signed-in users (a failed server write doesn't lose state).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ChecklistItem } from "@/lib/reader";
import { usePathwaySync, useLocalStorageMergePrompt, localStorageKeys } from "@/lib/server-state";
import { MergePrompt } from "./merge-prompt";

type Labels = {
  progress: string;
  markAllDone: string;
  clearAll: string;
  itemCount: string;
  empty: string;
};

type Props = {
  slug: string;
  lang: string;
  items: ChecklistItem[];
  labels: Labels;
};

function loadLocal(slug: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`umbrella.pathway.${slug}.checked`);
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

function saveLocal(slug: string, value: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `umbrella.pathway.${slug}.checked`,
      JSON.stringify(value),
    );
  } catch {
    // localStorage can throw in private-mode / quota scenarios; we
    // don't want progress tracking to break the page render.
  }
}

export function ChecklistRunner({ slug, lang, items, labels }: Props) {
  const t = useTranslations("pathways");
  // Read localStorage on the first client render, not in an
  // effect. The slug is the only thing that affects what we
  // read, and it's known synchronously, so a lazy useState
  // initializer is the right tool. SSR returns the default
  // empty object; the first client render after hydration
  // returns the same value the effect used to compute.
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    loadLocal(slug),
  );

  const {
    isSignedIn,
    serverChecked,
    hydratedFromServer,
    synced,
    scheduleSync,
  } = usePathwaySync(slug, lang);

  // Hydration step 2: when the server data arrives, mirror it
  // into local state. Order:
  //   1. localStorage (always — anonymous fallback + merge source)
  //   2. server (when signed in) — server wins on conflict
  useEffect(() => {
    if (!isSignedIn) return;
    if (!hydratedFromServer) return;
    if (serverChecked === null) return;
    // Server wins on conflict. We use the server's state as-is
    // and mirror it back into localStorage so a future sign-out
    // retains progress on this device.
    const hasLocalEntries = Object.keys(loadLocal(slug)).length > 0;
    if (Object.keys(serverChecked).length > 0 && !hasLocalEntries) {
      // Server data arrived after mount; this is the legitimate
      // "react to async external data" case that the lint rule
      // is over-zealous about.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(serverChecked);
    }
    // If server has nothing and we have local entries, those will
    // get scheduled for sync by the next effect — but only after
    // the user accepts the one-shot merge prompt below.
  }, [isSignedIn, hydratedFromServer, serverChecked, slug]);

  // Persist on every change.
  useEffect(() => {
    saveLocal(slug, checked);
    if (isSignedIn) scheduleSync(checked);
  }, [slug, checked, isSignedIn, scheduleSync]);

  // One-shot prompt to migrate local progress into the signed-in
  // account. Fires the first time a signed-in user visits a
  // pathway that has localStorage entries but no server state.
  const merge = useLocalStorageMergePrompt({
    enabled: isSignedIn && hydratedFromServer,
    hasLocal: Object.keys(checked).length > 0,
    hasServer: serverChecked !== null && Object.keys(serverChecked).length > 0,
    localStorageKey: localStorageKeys.pathway(slug),
    onAccept: () => {
      scheduleSync(checked);
    },
  });

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
      <MergePrompt
        show={merge.showPrompt}
        onAccept={merge.accept}
        onDecline={merge.decline}
        kind="pathway"
      />
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
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
        <span
          className={
            "ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
            (isSignedIn
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")
          }
          title={
            synced.lastSyncError ?? (isSignedIn ? t("sync.syncedTooltip") : t("sync.localTooltip"))
          }
        >
          <span
            className={
              "inline-block h-1.5 w-1.5 rounded-full " +
              (synced.status === "synced"
                ? "bg-emerald-500"
                : isSignedIn
                  ? "bg-amber-500"
                  : "bg-zinc-400")
            }
          />
          {isSignedIn ? t("sync.synced") : t("sync.local")}
        </span>
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
