// Postgres FTS-backed search page.
//
// Reads ?q= from the URL, runs searchContent(lang, q) from lib/reader,
// and renders a ranked list with a snippet. The form is a plain GET so
// search results are shareable URLs and the back button works.
//
// Note: HTML in `snippet` comes from the same upstream pipeline as the
// topic body (stripped of tags by Postgres, then truncated at 240
// chars in the SQL). No user input is interpolated into HTML.

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { searchContent } from "@/lib/reader";
import { SearchForm } from "@/components/search-form";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const { q = "" } = await searchParams;
  const t = await getTranslations("search");

  const hits = q.trim() ? await searchContent(lang, q, 30) : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      <SearchForm
        current={lang}
        initialQuery={q}
        placeholder={t("placeholder")}
      />

      {q.trim() ? (
        hits.length > 0 ? (
          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
            {t("resultsCount", { count: hits.length, query: q })}
          </p>
        ) : (
          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
            {t("noResults", { query: q })}
          </p>
        )
      ) : (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          {t("hint")}
        </p>
      )}

      <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {hits.map((hit) => (
          <li key={String(hit.id)} className="py-4">
            <Link
              href={`/${lang}/categories/${hit.categorySlug}/${hit.slug}`}
              className="block group"
            >
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {hit.categoryTitle}
              </span>
              <h2 className="mt-1 text-lg font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
                {hit.title}
              </h2>
              {hit.snippet ? (
                <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {hit.snippet}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
