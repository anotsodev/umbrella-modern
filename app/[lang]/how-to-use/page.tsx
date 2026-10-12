// A short, image-led tour of Umbrella aimed at the people who
// actually use the app — journalists, activists, aid workers,
// human-rights defenders, business travelers in high-risk
// countries. The screenshots come from the Umbrella Web build
// (see public/how-to-use/), which is GPLv3-licensed and shares
// the same project lineage as our fork. The copy is English-only
// in v1; new locales will get translated captions in a follow-up.

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n";
import { notFound } from "next/navigation";

const STEPS = [
  {
    src: "/how-to-use/FEEDS.png",
    titleKey: "web.feeds.title" as const,
    bodyKey: "web.feeds.body" as const,
  },
  {
    src: "/how-to-use/LESSONS.png",
    titleKey: "web.lessons.title" as const,
    bodyKey: "web.lessons.body" as const,
  },
  {
    src: "/how-to-use/CHECKLISTS.png",
    titleKey: "web.checklists.title" as const,
    bodyKey: "web.checklists.body" as const,
  },
  {
    src: "/how-to-use/FORMS.png",
    titleKey: "web.forms.title" as const,
    bodyKey: "web.forms.body" as const,
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "howToUse" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function HowToUsePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const t = await getTranslations("howToUse");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-fg">{t("title")}</h1>
      <p className="mt-3 text-base text-fg-muted">{t("intro")}</p>
      <p className="mt-2 text-sm text-fg-muted">{t("audience")}</p>

      <ol className="mt-10 space-y-12">
        {STEPS.map((step, i) => (
          <li key={step.src} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-fg"
              >
                {i + 1}
              </span>
              <h2 className="text-xl font-semibold text-fg">
                {t(step.titleKey)}
              </h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-surface-sunken">
              {/* Web screenshots from the Umbrella Web build
                  (securityfirst/Umbrella_web, GPLv3). Using <img>
                  rather than next/image so the browser picks the
                  right src without needing `sizes`. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.src}
                alt={t(step.titleKey)}
                className="mx-auto block max-h-[520px] w-auto"
                loading="lazy"
              />
            </div>
            <p className="text-sm leading-relaxed text-fg">
              {t(step.bodyKey)}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-16 rounded-lg border border-line bg-surface-sunken p-6 text-sm text-fg-muted">
        <p>{t("footer")}</p>
        <p className="mt-3 text-xs text-fg-subtle">
          {t("screenshotCredit")}
        </p>
      </div>
    </main>
  );
}
