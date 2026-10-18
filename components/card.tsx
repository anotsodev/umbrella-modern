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
  "block rounded-lg border border-line bg-surface p-5 transition-colors " +
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
  badge?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  titleSize?: "sm" | "md" | "lg";
};

const TITLE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "text-base font-medium",
  md: "text-lg font-medium",
  lg: "text-xl font-semibold",
};

export function LinkCard({
  href,
  title,
  subtitle,
  meta,
  badge,
  imageSrc,
  imageAlt,
  titleSize = "md",
}: LinkCardProps) {
  return (
    <Link href={href} className={CARD_CLASSES}>
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
      <h3 className={`${TITLE_CLASS[titleSize]} text-fg`}>{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
      ) : null}
      {badge ? <div className="mt-2">{badge}</div> : null}
      {meta ? (
        <p className="mt-2 text-xs text-fg-subtle">{meta}</p>
      ) : null}
    </Link>
  );
}
