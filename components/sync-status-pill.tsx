// SyncStatusPill — tiny "Synced to your account" / "Local only"
// indicator. Used by both ChecklistRunner and FormRunner. Was
// duplicated in both files; extracted to a single source of truth.
//
// The dot colour tracks the runner's `synced.status` so the
// underlying call (currently in-flight, last write failed, etc.)
// is visible at a glance.

import { useTranslations } from "next-intl";

export type SyncStatus = "synced" | "pending" | "error";

type Props = {
  isSignedIn: boolean;
  status: SyncStatus;
  errorMessage?: string | null;
};

export function SyncStatusPill({ isSignedIn, status, errorMessage }: Props) {
  const t = useTranslations("sync");

  if (!isSignedIn) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted"
        title={t("localTooltip")}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-subtle" />
        {t("local")}
      </span>
    );
  }

  const dotClass =
    status === "synced"
      ? "bg-success"
      : status === "error"
        ? "bg-warn"
        : "bg-warn";

  const tooltip = errorMessage ?? t("syncedTooltip");

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-success-soft-bg px-2 py-0.5 text-[11px] font-medium text-success-soft-fg dark:bg-success-soft-bg-dark dark:text-success-soft-fg-dark"
      title={tooltip}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {t("synced")}
    </span>
  );
}
