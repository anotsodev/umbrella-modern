import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n";
import {
  getAllCategories,
  getBreadcrumbs,
  getCategory,
  getCategoryContents,
} from "@/lib/reader";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string; category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { lang, category: categorySlug } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("topic");
  const tBread = await getTranslations("breadcrumb");

  const category = await getCategory(lang as Locale, categorySlug);
  if (!category) notFound();

  const [topics, breadcrumbs, allCategories] = await Promise.all([
    getCategoryContents(lang as Locale, category.id),
    getBreadcrumbs(lang as Locale, categorySlug),
    getAllCategories(lang as Locale),
  ]);

  // Children: sub-categories whose parentId is this category's id.
  const children = allCategories.filter(
    (c) => c.parentId === category.id
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href={`/${lang}`} className="hover:underline">
          {tBread("home")}
        </Link>
        <span className="mx-1">/</span>
        <Link href={`/${lang}/categories`} className="hover:underline">
          {tBread("categories")}
        </Link>
        {breadcrumbs.slice(0, -1).map((b) => (
          <span key={b.slug}>
            <span className="mx-1">/</span>
            <Link
              href={`/${lang}/categories/${b.slug}`}
              className="hover:underline"
            >
              {b.title}
            </Link>
          </span>
        ))}
        <span className="mx-1">/</span>
        <span>{category.title}</span>
      </nav>

      <h1 className="mb-6 text-3xl font-semibold tracking-tight">
        {category.title}
      </h1>

      {children.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            <Link
              href={`/${lang}/categories`}
              className="hover:underline"
            >
              {t("inCategory")}
            </Link>{" "}
            {category.title}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((c) => (
              <li key={String(c.id)}>
                <Link
                  href={`/${lang}/categories/${c.slug}`}
                  className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  <h3 className="text-base font-medium">{c.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t("browseTopics")}</h2>
        {topics.length === 0 ? (
          <p className="text-zinc-500">—</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {topics.map((topic) => (
              <li key={String(topic.id)}>
                <Link
                  href={`/${lang}/categories/${categorySlug}/${topic.slug}`}
                  className="block py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
