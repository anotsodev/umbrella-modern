// Lists every stock photo used on the site, grouped by where
// it appears. Driven by lib/topic-images.ts so the credit list
// and the topic-page figures can never drift — adding a new
// category photo there adds it to this page automatically.
//
// Per the privacy statement: the rest of the site makes a
// promise of transparency. Pexels doesn't require attribution,
// but listing the photographers is the right thing to do and
// matches the brand.

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n";
import { notFound } from "next/navigation";
import { CATEGORY, FALLBACK } from "@/lib/topic-images";

// A curated map of (slug → section key in the messages file).
// Order here is the order shown on the page. Anything in
// CATEGORY that doesn't appear in this map falls under
// sectionTopics. The fallback is always shown last.
type SectionKey =
  | "sectionHero"
  | "sectionHome"
  | "sectionTopics"
  | "sectionPathway"
  | "sectionForms"
  | "sectionEmpty"
  | "sectionFallback";

const SECTION_BY_SLUG: Record<string, SectionKey> = {
  travel: "sectionHero",
  work: "sectionHome",
  "assess-your-risk": "sectionTopics",
  communications: "sectionTopics",
  "emergency-support": "sectionTopics",
  "incident-response": "sectionTopics",
  information: "sectionTopics",
  stress: "sectionPathway",
  tools: "sectionForms",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "credits" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function CreditsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const t = await getTranslations("credits");

  // Build the per-section attribution list. We group by section
  // key in the messages file so the section heading can be
  // localised. The fallback always lands in its own section.
  const sections = new Map<SectionKey, { src: string; attribution: string }[]>();

  for (const [slug, img] of Object.entries(CATEGORY)) {
    const sectionKey: SectionKey = SECTION_BY_SLUG[slug] ?? "sectionTopics";
    const arr = sections.get(sectionKey) ?? [];
    arr.push({ src: img.src, attribution: img.attribution });
    sections.set(sectionKey, arr);
  }
  // Fallback always shown under its own section, last.
  sections.set("sectionFallback", [
    { src: FALLBACK.src, attribution: FALLBACK.attribution },
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-fg">{t("title")}</h1>
      <p className="mt-3 text-base text-fg-muted">{t("intro")}</p>

      <div className="mt-10 space-y-12">
        {Array.from(sections.entries()).map(([key, entries]) => (
          <section key={key}>
            <h2 className="text-xl font-semibold text-fg">{t(key)}</h2>
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface-sunken">
              {entries.map((entry) => (
                <li
                  key={entry.src}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm text-fg">{entry.attribution}</span>
                  <code className="font-mono text-xs text-fg-subtle">
                    {entry.src}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-fg-muted">{t("thankYou")}</p>
    </main>
  );
}
