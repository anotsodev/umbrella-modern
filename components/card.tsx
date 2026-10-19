// Card primitive. Two shapes:
//
//   <LinkCard href={...} title={...} subtitle={...} />
//   <Card><h3>...</h3><p>...</p></Card>
//
// Five call sites in the app today differ only in the link target
// and the inner content; this primitive absorbs the visual contract
// (rounded, border, hover state, padding) so a future image pass
// slots in via the optional `imageSrc` prop without touching every
// consumer.

import Link from "next/link";
import type { ReactNode } from "react";

const CARD_CLASSES =
  "group block rounded-lg border border-line bg-surface p-5 transition-colors " +
  "hover:border-line-strong hover:bg-surface-sunken";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${CARD_CLASSES} ${className}`.trim()}>{children}</div>
  );
}

type LinkCardProps = {
  href: string;
  title: string;
  subtitle?: string;
  meta?: string;
  /** Slot rendered above the title (e.g. a level pill). */
  header?: ReactNode;
  /** Slot rendered at the bottom, separated by a hairline. */
  footer?: ReactNode;
  /** Right-side square thumbnail slot (~25% of card width). */
  thumb?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  titleSize?: "hidden" | "sm" | "md" | "lg";
};

const TITLE_CLASS: Record<"hidden" | "sm" | "md" | "lg", string> = {
  hidden: "sr-only",
  sm: "text-base font-medium text-fg",
  md: "text-lg font-medium text-fg",
  lg: "text-xl font-semibold text-fg",
};

// Meta sits between header and title on pathways cards (difficulty
// → item count, with the checklist name hidden for screen readers
// since the section heading carries it), so it steps up to sm
// there; on default-size cards it stays the small footnote line.
const META_CLASS: Record<"hidden" | "sm" | "md" | "lg", string> = {
  hidden: "text-sm text-fg-subtle",
  sm: "text-xs text-fg-subtle",
  md: "text-xs text-fg-subtle",
  lg: "text-xs text-fg-subtle",
};

export function LinkCard({
  href,
  title,
  subtitle,
  meta,
  header,
  footer,
  thumb,
  imageSrc,
  imageAlt,
  titleSize = "md",
}: LinkCardProps) {
  const body = (
    <>
      {imageSrc ? (
        // Decorative hero images are passed in with explicit alt;
        // the title below carries the same information for screen
        // readers so the image alt is intentionally short.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={imageAlt ?? ""}
          loading="lazy"
          className="mb-3 aspect-[16/9] w-full rounded-md object-cover"
        />
      ) : null}
      {header ? <div className="mb-2">{header}</div> : null}
      {meta ? <p className={META_CLASS[titleSize]}>{meta}</p> : null}
      <h3 className={TITLE_CLASS[titleSize]}>{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
      ) : null}
      {footer ? (
        <div className="mt-3 border-t border-line pt-3 text-xs text-fg-subtle">
          {footer}
        </div>
      ) : null}
    </>
  );

  if (thumb) {
    return (
      <Link href={href} className={`${CARD_CLASSES} flex items-center gap-4`}>
        <div className="min-w-0 flex-1">{body}</div>
        <div
          aria-hidden="true"
          className="flex size-20 shrink-0 items-center justify-center rounded-md border border-line bg-surface-sunken text-fg-subtle transition-colors group-hover:border-line-strong group-hover:bg-surface"
        >
          {thumb}
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className={CARD_CLASSES}>
      {body}
    </Link>
  );
}
