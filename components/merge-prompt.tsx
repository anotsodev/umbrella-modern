"use client";

import { useTranslations } from "next-intl";
import { Button } from "./button";

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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn-soft-border bg-warn-soft-bg px-4 py-3 text-sm text-warn-soft-fg">
      <p className="max-w-2xl">
        {kind === "pathway"
          ? t("pathway.body")
          : t("form.body")}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onDecline}>
          {t("decline")}
        </Button>
        <Button variant="warn" size="sm" onClick={onAccept}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
