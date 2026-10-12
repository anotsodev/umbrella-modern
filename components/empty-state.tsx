// Empty-state primitive. Used by the search page, the pathway
// index, the forms index, and any other surface that may render
// zero results. The variant prop picks a call-to-action tone:
//
//   - "search"   — "nothing matched your query"
//   - "pathway"  — "no pathways yet"
//   - "form"     — "no forms yet"
//   - "generic"  — fallback for ad-hoc use
//
// The figure is optional; when omitted, a small inline icon
// placeholder is rendered. The variant prop is localisable via
// the `emptyState` namespace in messages/<lang>.json.

import type { ReactNode } from "react";
import Link from "next/link";

export type EmptyStateVariant = "search" | "pathway" | "form" | "generic";

type EmptyStateProps = {
  variant: EmptyStateVariant;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children?: ReactNode;
};

const VARIANT_ICON: Record<EmptyStateVariant, string> = {
  search: "🔍",
  pathway: "🗒",
  form: "📝",
  generic: "✺",
};

export function EmptyState({
  variant,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
      <span aria-hidden="true" className="text-2xl text-fg-subtle">
        {VARIANT_ICON[variant]}
      </span>
      <h3 className="text-base font-medium text-fg">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-fg-muted">{description}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-1 text-sm font-medium text-accent hover:underline"
        >
          {action.label} →
        </Link>
      ) : null}
      {children}
    </div>
  );
}
