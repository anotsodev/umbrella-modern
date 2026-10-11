import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTopLevelCategories } from "@/lib/reader";
import { isLocale, type Locale } from "@/i18n";
import { notFound } from "next/navigation";

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
        <p className="mb-2 text-sm uppercase tracking-widest text-zinc-500">
          {t("phase")}
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          {t("subtitle")}
        </p>
        <p className="mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          {t("intro")}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={`/${lang}/categories`}
            className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {t("exploreCategories")}
          </Link>
          <Link
            href={`/${lang}/search`}
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {tNav("search")}
          </Link>
        </div>
      </header>

      <section>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          {tCat("topLevel")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={String(cat.id)}>
              <Link
                href={`/${lang}/categories/${cat.slug}`}
                className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                <h3 className="text-lg font-medium">{cat.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
