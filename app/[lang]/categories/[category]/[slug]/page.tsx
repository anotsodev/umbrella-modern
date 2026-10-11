import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n";
import {
  getBreadcrumbs,
  getCategory,
  getContent,
  getNeighbours,
} from "@/lib/reader";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string; category: string; slug: string }>;
};

export default async function TopicPage({ params }: Props) {
  const { lang, category: categorySlug, slug } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("topic");
  const tBread = await getTranslations("breadcrumb");

  const [category, topic] = await Promise.all([
    getCategory(lang as Locale, categorySlug),
    getContent(lang as Locale, categorySlug, slug),
  ]);
  if (!category || !topic) notFound();

  const [breadcrumbs, neighbours] = await Promise.all([
    getBreadcrumbs(lang as Locale, categorySlug),
    getNeighbours(lang as Locale, category.id, topic.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <nav className="mb-6 text-sm text-fg-muted" aria-label="Breadcrumb">
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
        <Link
          href={`/${lang}/categories/${categorySlug}`}
          className="hover:underline"
        >
          {category.title}
        </Link>
      </nav>

      <article>
        <h1 className="mb-2 text-4xl font-semibold tracking-tight">
          {topic.title}
        </h1>
        <p className="mb-8 text-sm text-fg-muted">
          {t("updated")}: {new Date(topic.updatedAt).toISOString().slice(0, 10)}
        </p>

        <div
          className="prose-umbrella"
          // Content.html is produced by the import job from a trusted
          // upstream markdown source; the pipeline preserves anchor hrefs
          // and rewrites image srcs into /content/... paths.
          dangerouslySetInnerHTML={{ __html: topic.html }}
        />
      </article>

      <nav
        className="mt-12 flex items-center justify-between border-t border-line pt-6"
        aria-label="Topic navigation"
      >
        {neighbours.prev ? (
          <Link
            href={`/${lang}/categories/${categorySlug}/${neighbours.prev.slug}`}
            className="text-sm text-fg-muted hover:text-fg"
          >
            ← {t("prev")}: {neighbours.prev.title}
          </Link>
        ) : (
          <span />
        )}
        {neighbours.next ? (
          <Link
            href={`/${lang}/categories/${categorySlug}/${neighbours.next.slug}`}
            className="text-end text-sm text-fg-muted hover:text-fg"
          >
            {t("next")}: {neighbours.next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
