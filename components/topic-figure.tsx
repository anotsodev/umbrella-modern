// TopicFigure — inline illustration rendered above a topic
// article. The image comes from lib/topic-images.ts (a static
// category-keyed map with a fallback). The caption carries the
// credit line for the /credits page; the figure is hidden
// entirely if no image is available, so a broken entry degrades
// to a text-only topic page rather than a 404 image.
//
// Accessibility:
//   - <img> always gets an alt (never empty, since the image
//     is the only carrier of "this is the topic visually" —
//     a decorative image would belong inside the article body)
//   - <figure> + <figcaption> give screen readers a labelled
//     region so the credit is announced alongside the image

import { useTranslations } from "next-intl";
import { pickImage, type TopicImage } from "@/lib/topic-images";

type Props = {
  categorySlug: string;
  topicSlug: string;
};

export function TopicFigure({ categorySlug, topicSlug }: Props) {
  const t = useTranslations("topic");
  const image: TopicImage = pickImage(categorySlug, topicSlug);

  return (
    <figure className="mb-6 overflow-hidden rounded-lg border border-line bg-surface-sunken">
      {/* eslint-disable-next-line @next/next/no-img-element -- the
          photo set comes from a static map in lib/topic-images.ts;
          the import job cannot rewrite these into next/image's
          remote-loader because the runtime must never reach a
          third party. */}
      <img
        src={image.src}
        alt={t("imageAlt", { topic: topicSlug })}
        className="h-56 w-full object-cover sm:h-64"
        loading="lazy"
        decoding="async"
        width={1200}
        height={640}
      />
      <figcaption className="px-3 py-2 text-xs text-fg-muted">
        {image.credit}
      </figcaption>
    </figure>
  );
}
