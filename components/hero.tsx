// Hero block for the homepage. Image + headline + dual CTA in
// a single framed band. Lives above the category grid and the
// Read/Plan/Capture welcome row.
//
// The figure is a 16:9 cover-crop of a curated Pexels photo
// (vendor image, not a runtime call — see lib/topic-images.ts
// and the privacy statement). Decorative alt is "" because the
// headline carries the same information for screen readers.

import type { ReactNode } from "react";
import { Button } from "@/components/button";

type HeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  intro?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image: { src: string; credit: string };
  footer?: ReactNode;
};

export function Hero({
  eyebrow,
  title,
  subtitle,
  intro,
  primaryCta,
  secondaryCta,
  image,
  footer,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-line bg-surface">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="flex flex-col justify-center gap-4 p-8 sm:p-10 lg:col-span-3 lg:p-12">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="max-w-xl text-base text-fg-muted sm:text-lg">
            {subtitle}
          </p>
          {intro ? (
            <p className="max-w-xl text-sm text-fg-muted">{intro}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3">
            <Button as="link" href={primaryCta.href} variant="primary">
              {primaryCta.label}
            </Button>
            {secondaryCta ? (
              <Button as="link" href={secondaryCta.href} variant="secondary">
                {secondaryCta.label}
              </Button>
            ) : null}
          </div>
          {footer ? <div className="mt-2 text-xs text-fg-subtle">{footer}</div> : null}
        </div>
        <div className="relative lg:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt=""
            className="h-64 w-full object-cover sm:h-80 lg:h-full"
            loading="eager"
            decoding="async"
            width="1600"
            height="1067"
          />
          <p className="absolute bottom-2 right-3 rounded bg-bg/70 px-2 py-0.5 text-[10px] text-fg-muted backdrop-blur-sm">
            {image.credit}
          </p>
        </div>
      </div>
    </section>
  );
}
