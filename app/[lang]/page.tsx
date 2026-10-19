import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTopLevelCategories } from "@/lib/reader";
import { isLocale, type Locale } from "@/i18n";
import { notFound } from "next/navigation";
import { Hero } from "@/components/hero";
import { WelcomeRow, type WelcomeRowCard } from "@/components/welcome-row";
import { LinkCard } from "@/components/card";

// Reader is per-request, per-language content from Postgres.
// `instant = false` opts out of Next 16's prerender-at-build-time
// attempt; the page renders on every request.
// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("home");
  const tCat = await getTranslations("categories");
  const categories = await getTopLevelCategories(lang as Locale);

  const welcomeCards: [WelcomeRowCard, WelcomeRowCard, WelcomeRowCard] = [
    {
      href: `/${lang}/categories`,
      eyebrow: t("welcome.read.eyebrow"),
      title: t("welcome.read.title"),
      body: t("welcome.read.body"),
      glyph: "📖",
    },
    {
      href: `/${lang}/pathways`,
      eyebrow: t("welcome.plan.eyebrow"),
      title: t("welcome.plan.title"),
      body: t("welcome.plan.body"),
      glyph: "✓",
    },
    {
      href: `/${lang}/forms`,
      eyebrow: t("welcome.capture.eyebrow"),
      title: t("welcome.capture.title"),
      body: t("welcome.capture.body"),
      glyph: "✎",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-16">
      <Hero
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        intro={t("hero.intro")}
        primaryCta={{
          label: t("hero.primaryCta"),
          href: `/${lang}/categories`,
        }}
        secondaryCta={{
          label: t("hero.secondaryCta"),
          href: `/${lang}/search`,
        }}
        image={{
          src: "/images/work.jpg",
          credit: t("hero.photoCredit"),
        }}
        footer={<span>{t("browseFooter")}</span>}
      />

      <WelcomeRow cards={welcomeCards} />

      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          {tCat("topLevel")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={String(cat.id)}>
              <LinkCard
                href={`/${lang}/categories/${cat.slug}`}
                title={cat.title}
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
