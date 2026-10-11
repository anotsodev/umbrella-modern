import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTopLevelCategories } from "@/lib/reader";
import { isLocale, type Locale } from "@/i18n";
import { notFound } from "next/navigation";
import { Button } from "@/components/button";
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
  const tNav = await getTranslations("nav");
  const tCat = await getTranslations("categories");
  const categories = await getTopLevelCategories(lang as Locale);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-2 text-sm uppercase tracking-widest text-fg-muted">
          {t("phase")}
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted">{t("subtitle")}</p>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">{t("intro")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button as="link" href={`/${lang}/categories`} variant="primary">
            {t("exploreCategories")}
          </Button>
          <Button as="link" href={`/${lang}/search`} variant="secondary">
            {tNav("search")}
          </Button>
        </div>
      </header>

      <section>
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
