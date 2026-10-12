// Map each topic page to a stock photo. The TopicFigure component
// reads this; the topic page renders the figure above the article
// body, with the photographer credit in the caption (per the
// /credits page promise in the privacy statement).
//
// Selection rules:
//   1. Every topic gets a figure. Decision 3 in the design pass
//      was explicit about this — no "default text-only" path.
//   2. Resolution order: topicSlug (per-topic override) →
//      categorySlug (the parent category's curated photo) →
//      FALLBACK (a generic security photo for any topic without
//      a curated match).
//   3. All photos are committed to public/images/ and served from
//      the Next.js public root. The runtime never reaches out to
//      a third party (privacy promise).
//   4. Photos come from sources that allow free commercial use
//      without attribution (we credit anyway at /credits). Each
//      entry below carries the photographer + source for the
//      credits file.
//
// Maintenance:
//   - To add a per-topic override: `TOPIC["some-topic-slug"] = "..."`
//   - To swap a category photo: edit the CATEGORY entry below
//   - To add a new category: append to CATEGORY; the topic page
//     will pick it up automatically via the walk in pickImage()
//
// The category slugs here are the top-level DB category slugs
// (one photo per top-level category), so the 9 curatable
// categories get curated photos. Child categories (e.g.
// "communications-mobile-phones-beginner") inherit the
// "communications" photo.

export type TopicImage = {
  // Path under /public, served from the site root. e.g. "/images/travel.jpg"
  src: string;
  // Alt text shown when the image fails to load or for screen readers.
  // Localised via the message files; the lookup happens in TopicFigure.
  altKey: "imageAlt";
  // The credit line shown in the caption and aggregated in /credits.
  credit: string;
  // Source attribution for the /credits page. Format: "Photographer Name (Source)".
  attribution: string;
};

const FALLBACK: TopicImage = {
  src: "/images/security-fallback.jpg",
  altKey: "imageAlt",
  credit: "Combination padlock (default for topics without a curated photo)",
  attribution: "Pixabay (Pexels)",
};

const CATEGORY: Record<string, TopicImage> = {
  travel: {
    src: "/images/travel.jpg",
    altKey: "imageAlt",
    credit: "Airplane window view with passport and tickets",
    attribution: "Gül Işık (Pexels)",
  },
  work: {
    src: "/images/work.jpg",
    altKey: "imageAlt",
    credit: "Cozy cafe workspace with laptop and coffee",
    attribution: "Gül Işık (Pexels)",
  },
  "assess-your-risk": {
    src: "/images/assess.jpg",
    altKey: "imageAlt",
    credit: "A planner notebook and pen for risk assessment",
    attribution: "Natalia S (Pexels)",
  },
  communications: {
    src: "/images/communications.jpg",
    altKey: "imageAlt",
    credit: "A person typing a message on a phone",
    attribution: "cottonbro studio (Pexels)",
  },
  "emergency-support": {
    src: "/images/emergency.jpg",
    altKey: "imageAlt",
    credit: "First aid and survival kits laid out",
    attribution: "Roger Brown (Pexels)",
  },
  "incident-response": {
    src: "/images/incident.jpg",
    altKey: "imageAlt",
    credit: "Two gray bullet security cameras on a wall",
    attribution: "Scott Webb (Pexels)",
  },
  information: {
    src: "/images/information.jpg",
    altKey: "imageAlt",
    credit: "Books on a shelf in a library",
    attribution: "Pixabay (Pexels)",
  },
  stress: {
    src: "/images/stress.jpg",
    altKey: "imageAlt",
    credit: "Hands resting during meditation",
    attribution: "Tuğba Özsoy (Pexels)",
  },
  tools: {
    src: "/images/tools.jpg",
    altKey: "imageAlt",
    credit: "A set of wrenches and tools in a portable case",
    attribution: "Artem Podrez (Pexels)",
  },
};

// Per-topic overrides. Use sparingly — the category-level mapping
// covers most cases. Add a row here when a specific topic deserves
// a different photo than its siblings (e.g. a topic on radio
// equipment wants a radio-specific photo).
const TOPIC: Record<string, TopicImage> = {};

// Walk a category path and return the most specific curated photo.
// The category path is a hyphenated slug like
// "communications-mobile-phones-beginner"; we try the full slug
// first, then progressively shorter prefixes, then the fallback.
//
// This means a topic in "communications-mobile-phones-beginner"
// will pick up the "communications" photo unless someone adds a
// per-prefix override in CATEGORY above (which is a reasonable
// extension point if you want a more specific photo for
// "communications-radios-and-satellite-phones").
function lookupCategoryPhoto(categorySlug: string): TopicImage {
  const segments = categorySlug.split("-");
  while (segments.length > 0) {
    const key = segments.join("-");
    const hit = CATEGORY[key];
    if (hit) return hit;
    segments.pop();
  }
  return FALLBACK;
}

// Pick the right TopicImage for a given (categorySlug, topicSlug).
// Order: TOPIC[topicSlug] → walk CATEGORY from most specific to
// top-level → FALLBACK.
export function pickImage(
  categorySlug: string,
  topicSlug: string,
): TopicImage {
  const topicHit = TOPIC[topicSlug];
  if (topicHit) return topicHit;
  return lookupCategoryPhoto(categorySlug);
}

// Build the full credits list for the /credits page. Walks CATEGORY
// and TOPIC, deduplicates by src, and returns each photo's
// attribution in a stable order. Attribution is language-neutral
// in v1 (per the design pass scope).
export function allAttributions(): { src: string; attribution: string }[] {
  const seen = new Set<string>();
  const out: { src: string; attribution: string }[] = [];
  const push = (img: TopicImage) => {
    if (seen.has(img.src)) return;
    seen.add(img.src);
    out.push({ src: img.src, attribution: img.attribution });
  };
  push(FALLBACK);
  for (const img of Object.values(CATEGORY)) push(img);
  for (const img of Object.values(TOPIC)) push(img);
  return out;
}
