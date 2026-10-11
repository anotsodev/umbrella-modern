"use client";

// FormRunner — drives a single form schema (screens → items) as a
// step-by-step wizard. Per-field answers are stored in localStorage
// under `umbrella.form.<slug>.answers` so the user can resume later.
// v1 is anonymous; Phase 2 swaps for per-user server state when
// accounts land (the user_forms table is already in the schema).
//
// Round-trip parity with the Android FormService.asHTML() export is
// the design driver: every screen is shown verbatim, every item
// type is rendered with the matching input shape, and the export
// emits a self-contained HTML document (inline CSS, no external
// assets) that opens in a browser and prints cleanly.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FormItem, FormSchema } from "@/lib/reader";
import { useFormSync } from "@/lib/server-state";

type Labels = {
  saveDraft: string;
  clearAll: string;
  exportHtml: string;
  savedLocally: string;
  fieldEmpty: string;
  confirmClear: string;
  prev: string;
  next: string;
  finish: string;
  screenOf: string;
  fieldEmptyText: string;
  exportTitle: string;
  exportedAt: string;
};

type Props = {
  slug: string;
  title: string;
  schema: FormSchema;
  lang: string;
  labels: Labels;
};

// Some upstream items ship without a `label` (e.g. trailing
// text_areas). Fall back to the machine `name` so the form is
// still usable. The caller has no easy way to translate `name`,
// so we surface it as-is.
function displayLabel(item: FormItem): string {
  return item.label && item.label.length > 0 ? item.label : item.name;
}

// The shape of an answer. Strings for text and single_choice;
// arrays of strings for multiple_choice. Items with type "label"
// never appear in the answers map.
type AnswerValue = string | string[];

function storageKey(slug: string): string {
  return `umbrella.form.${slug}.answers`;
}

function loadAnswers(slug: string): Record<string, AnswerValue> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Coerce values back to the expected shape. The DB is the
      // source of truth for *what* the answer is, so we don't try
      // to recover missing keys here.
      return parsed as Record<string, AnswerValue>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveAnswers(slug: string, value: Record<string, AnswerValue>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // localStorage can throw in private-mode / quota scenarios; we
    // don't want answer persistence to break the page render.
  }
}

// HTML export builder. Self-contained document, no external assets,
// prints cleanly via the browser's print dialog. Mirrors the
// shape of the Android asHTML() output (h1 form title, h3 per
// screen, h5 per item name, input/textarea/checkbox/radio per
// item type) but with print-friendly styling and proper HTML
// escaping.
function buildExportHtml(
  formTitle: string,
  schema: FormSchema,
  answers: Record<string, AnswerValue>,
  lang: string,
  labels: Labels,
): string {
  const escape = (s: string): string =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderItem = (item: FormItem): string => {
    if (item.type === "label") {
      return `<p class="label">${escape(displayLabel(item))}</p>`;
    }
    const value = answers[item.name];
    switch (item.type) {
      case "text_input": {
        const v = typeof value === "string" ? value : "";
        return `<div class="field"><div class="field-name">${escape(displayLabel(item))}</div><div class="field-value text">${escape(v || labels.fieldEmpty)}</div></div>`;
      }
      case "text_area": {
        const v = typeof value === "string" ? value : "";
        return `<div class="field"><div class="field-name">${escape(displayLabel(item))}</div><div class="field-value text">${escape(v || labels.fieldEmpty).replace(/\n/g, "<br>")}</div></div>`;
      }
      case "single_choice": {
        const selected = typeof value === "string" ? value : "";
        const opts = (item.options ?? []).map((o) => {
          const isSel = o.value === selected;
          return `<label class="option ${isSel ? "selected" : ""}"><span class="bullet">${isSel ? "●" : "○"}</span><span>${escape(o.label)}</span></label>`;
        });
        return `<div class="field"><div class="field-name">${escape(displayLabel(item))}</div><div class="options">${opts.join("") || `<span class="muted">${escape(labels.fieldEmpty)}</span>`}</div></div>`;
      }
      case "multiple_choice": {
        const selected = Array.isArray(value) ? value : [];
        const opts = (item.options ?? []).map((o) => {
          const isSel = selected.includes(o.value);
          return `<label class="option ${isSel ? "selected" : ""}"><span class="bullet">${isSel ? "☑" : "☐"}</span><span>${escape(o.label)}</span></label>`;
        });
        return `<div class="field"><div class="field-name">${escape(displayLabel(item))}</div><div class="options">${opts.join("") || `<span class="muted">${escape(labels.fieldEmpty)}</span>`}</div></div>`;
      }
    }
  };

  const screens = schema.screens
    .map(
      (s, i) => `<section class="screen">
<h3>${i + 1}. ${escape(s.title)}</h3>
${s.items.map(renderItem).join("\n")}
</section>`,
    )
    .join("\n");

  const exportedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
<meta charset="utf-8">
<title>${escape(formTitle)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #18181b; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.5; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #71717a; font-size: 0.8rem; margin-bottom: 2rem; }
  .screen { margin-bottom: 2rem; page-break-inside: avoid; }
  h3 { font-size: 1.05rem; margin: 0 0 0.5rem; color: #27272a; border-bottom: 1px solid #e4e4e7; padding-bottom: 0.25rem; }
  .field { margin: 0.75rem 0; }
  .field-name { font-weight: 600; font-size: 0.9rem; color: #27272a; }
  .field-value { font-size: 0.95rem; margin-top: 0.25rem; }
  .field-value.text { white-space: pre-wrap; padding: 0.5rem 0.75rem; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 4px; }
  .label { color: #52525b; font-style: italic; font-size: 0.9rem; margin: 0.5rem 0; }
  .options { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.25rem; }
  .option { display: flex; gap: 0.5rem; align-items: flex-start; }
  .option.selected { font-weight: 500; }
  .bullet { display: inline-block; min-width: 1.25em; }
  .muted { color: #a1a1aa; font-style: italic; }
  @media print { body { margin: 0; max-width: none; } .screen { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>${escape(formTitle)}</h1>
<div class="meta">${escape(labels.exportedAt)} ${escape(exportedAt)}</div>
${screens}
</body>
</html>
`;
}

export function FormRunner({ slug, title, schema, lang, labels }: Props) {
  const t = useTranslations("forms");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [hydrated, setHydrated] = useState(false);
  const [screenIndex, setScreenIndex] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const {
    isSignedIn,
    serverAnswers,
    hydratedFromServer,
    synced,
    scheduleSync,
  } = useFormSync(slug, lang);

  // Hydration. Order:
  //   1. localStorage (always — anonymous fallback + merge source)
  //   2. server (when signed in) — server wins on conflict
  useEffect(() => {
    setAnswers(loadAnswers(slug));
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isSignedIn) return;
    if (!hydratedFromServer) return;
    if (serverAnswers === null) return;
    const hasLocalEntries = Object.keys(loadAnswers(slug)).length > 0;
    if (Object.keys(serverAnswers).length > 0 && !hasLocalEntries) {
      setAnswers(serverAnswers);
    }
  }, [hydrated, isSignedIn, hydratedFromServer, serverAnswers, slug]);

  // Persist on every change after hydration, surface a "Draft
  // saved" timestamp for the UI, and (when signed in) debounce
  // a server sync.
  useEffect(() => {
    if (!hydrated) return;
    saveAnswers(slug, answers);
    setSavedAt(new Date().toLocaleTimeString());
    if (isSignedIn) scheduleSync(answers, title);
  }, [slug, answers, hydrated, isSignedIn, scheduleSync, title]);

  const totalScreens = schema.screens.length;
  const currentScreen = schema.screens[screenIndex];

  const setAnswer = useCallback((name: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  }, []);

  const clearAll = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm(labels.confirmClear)) {
      return;
    }
    setAnswers({});
  }, [labels.confirmClear]);

  const exportHtml = useCallback(() => {
    if (typeof window === "undefined") return;
    const html = buildExportHtml(title, schema, answers, lang, labels);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safeTitle = title.replace(/[^a-zA-Z0-9.-]+/g, "_").slice(0, 50) || "form";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a tick so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [title, schema, answers, lang, labels]);

  const inputItems = useMemo(
    () => currentScreen?.items.filter((it) => it.type !== "label") ?? [],
    [currentScreen],
  );

  if (!currentScreen) {
    return (
      <p className="mt-8 text-sm text-zinc-500">
        This form has no screens.
      </p>
    );
  }

  return (
    <section className="mt-8">
      {/* Wizard nav */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          {labels.screenOf
            .replace("{current}", String(screenIndex + 1))
            .replace("{total}", String(totalScreens))}
        </span>
        <div className="flex items-center gap-3">
          {savedAt ? (
            <span className="text-xs text-zinc-500">
              {labels.savedLocally} ({savedAt})
            </span>
          ) : null}
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
              (isSignedIn
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")
            }
            title={
              synced.lastSyncError ??
              (isSignedIn ? t("sync.syncedTooltip") : t("sync.localTooltip"))
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
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={screenIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalScreens}
      >
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200"
          style={{ width: `${((screenIndex + 1) / totalScreens) * 100}%` }}
        />
      </div>

      {/* Current screen */}
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {currentScreen.title}
        </h2>
        <div className="mt-4 space-y-5">
          {currentScreen.items.map((item) => (
            <Field
              key={item.name}
              item={item}
              value={answers[item.name]}
              onChange={(v) => setAnswer(item.name, v)}
            />
          ))}
        </div>
        {inputItems.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            {labels.fieldEmptyText}
          </p>
        ) : null}
      </div>

      {/* Wizard buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={screenIndex === 0}
            onClick={() => setScreenIndex((i) => Math.max(0, i - 1))}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {labels.prev}
          </button>
          {screenIndex < totalScreens - 1 ? (
            <button
              type="button"
              onClick={() => setScreenIndex((i) => Math.min(totalScreens - 1, i + 1))}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {labels.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={exportHtml}
              className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              {labels.finish}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportHtml}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {labels.exportHtml}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {labels.clearAll}
          </button>
        </div>
      </div>
    </section>
  );
}

type FieldProps = {
  item: FormItem;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
};

function Field({ item, value, onChange }: FieldProps) {
  if (item.type === "label") {
    return <p className="text-sm text-zinc-500">{displayLabel(item)}</p>;
  }

  if (item.type === "text_input") {
    return (
      <label className="block">
        <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {displayLabel(item)}
        </span>
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>
    );
  }

  if (item.type === "text_area") {
    return (
      <label className="block">
        <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {displayLabel(item)}
        </span>
        <textarea
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>
    );
  }

  if (item.type === "single_choice") {
    const current = typeof value === "string" ? value : "";
    return (
      <fieldset>
        <legend className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {displayLabel(item)}
        </legend>
        <div className="mt-2 space-y-1.5">
          {(item.options ?? []).map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                type="radio"
                name={item.name}
                value={o.value}
                checked={current === o.value}
                onChange={() => onChange(o.value)}
                className="mt-0.5 h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-zinc-700 dark:text-zinc-300">{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (item.type === "multiple_choice") {
    const current = Array.isArray(value) ? value : [];
    return (
      <fieldset>
        <legend className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {displayLabel(item)}
        </legend>
        <div className="mt-2 space-y-1.5">
          {(item.options ?? []).map((o) => {
            const checked = current.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      onChange(current.filter((v) => v !== o.value));
                    } else {
                      onChange([...current, o.value]);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">{o.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  // Should be unreachable: getForm's validator rejects unknown types.
  return (
    <p className="text-sm text-red-600">
      Unsupported form field type: {String((item as { type: unknown }).type)}
    </p>
  );
}
