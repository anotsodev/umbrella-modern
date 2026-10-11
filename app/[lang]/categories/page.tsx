import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n";
import { getAllCategories } from "@/lib/reader";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function CategoriesIndex({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("categories");
  const tBread = await getTranslations("breadcrumb");
  const all = await getAllCategories(lang as Locale);
  const topLevel = all.filter((c) => c.parentId === null);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href={`/${lang}`} className="hover:underline">
          {tBread("home")}
        </Link>
        <span className="mx-1">/</span>
        <span>{tBread("categories")}</span>
      </nav>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">{t("intro")}</p>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t("topLevel")}</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topLevel.map((cat) => (
            <li key={String(cat.id)}>
              <Link
                href={`/${lang}/categories/${cat.slug}`}
                className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                <h3 className="text-base font-medium">{cat.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
