"use client";

import { useTranslations } from "next-intl";

export function MergePrompt({
  show,
  onAccept,
  onDecline,
  kind,
}: {
  show: boolean;
  onAccept: () => void;
  onDecline: () => void;
  kind: "pathway" | "form";
}) {
  const t = useTranslations("merge");

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="max-w-2xl">
        {kind === "pathway"
          ? t("pathway.body")
          : t("form.body")}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecline}
          className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-900/40"
        >
          {t("decline")}
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
