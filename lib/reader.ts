// Read-side data helpers for the public reader surface.
//
// All queries are scoped to a single language and use the existing
// `@@unique([languageId, slug])` constraints on Category and Content
// to keep the SQL small and indexed. Hierarchy is encoded in the
// path-joined slug (e.g. "communications-censorship-beginner"); see
// dev-docs/spec.md for why we do not collapse to a final segment.

import { prisma } from "./db";
import type { Locale } from "@/i18n";
import { isLocale } from "@/i18n";

export type CategoryNode = {
  id: bigint;
  slug: string;
  title: string;
  parentId: bigint | null;
  position: number;
};

export type ContentListItem = {
  id: bigint;
  slug: string;
  title: string;
  position: number;
};

export type BreadcrumbPart = {
  slug: string;
  title: string;
};

function assertLocale(lang: string): asserts lang is Locale {
  if (!isLocale(lang)) {
    throw new Error(`Unknown locale: ${lang}`);
  }
}

// Top-level categories for a language. Used on the homepage to show
// the catalogue as cards.
export async function getTopLevelCategories(
  lang: string
): Promise<CategoryNode[]> {
  assertLocale(lang);
  const rows = await prisma.category.findMany({
    where: { languageId: lang, parentId: null },
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      parentId: true,
      position: true,
    },
  });
  return rows;
}

// All categories for a language, flat. Used by the categories index page.
export async function getAllCategories(lang: string): Promise<CategoryNode[]> {
  assertLocale(lang);
  const rows = await prisma.category.findMany({
    where: { languageId: lang },
    orderBy: [{ position: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      parentId: true,
      position: true,
    },
  });
  return rows;
}

// One category, by language + slug. Returns null if not found.
export async function getCategory(
  lang: string,
  slug: string
): Promise<CategoryNode | null> {
  assertLocale(lang);
  const row = await prisma.category.findUnique({
    where: { languageId_slug: { languageId: lang, slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      parentId: true,
      position: true,
    },
  });
  return row;
}

// All topics inside a category, ordered by position.
export async function getCategoryContents(
  lang: string,
  categoryId: bigint
): Promise<ContentListItem[]> {
  assertLocale(lang);
  const rows = await prisma.content.findMany({
    where: { languageId: lang, categoryId, type: "topic" },
    orderBy: { position: "asc" },
    select: { id: true, slug: true, title: true, position: true },
  });
  return rows;
}

// One topic (topic or glossary), with its rendered HTML.
export async function getContent(
  lang: string,
  categorySlug: string,
  topicSlug: string
): Promise<{
  id: bigint;
  slug: string;
  title: string;
  html: string;
  categoryId: bigint;
  updatedAt: Date;
} | null> {
  assertLocale(lang);
  const row = await prisma.content.findFirst({
    where: {
      languageId: lang,
      slug: topicSlug,
      category: { slug: categorySlug },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      html: true,
      categoryId: true,
      updatedAt: true,
    },
  });
  return row;
}

// Resolve a category's breadcrumb trail by walking parent_id upward.
// The root parent has parent_id = null.
export async function getBreadcrumbs(
  lang: string,
  categorySlug: string
): Promise<BreadcrumbPart[]> {
  assertLocale(lang);
  const trail: BreadcrumbPart[] = [];
  let current: string | null = categorySlug;
  // Bound the walk: deep nesting shouldn't exist, but guard against
  // cycles in malformed data.
  for (let i = 0; i < 16 && current; i++) {
    const cat: { slug: string; title: string; parentId: bigint | null } | null =
      await prisma.category.findUnique({
        where: { languageId_slug: { languageId: lang, slug: current } },
        select: { slug: true, title: true, parentId: true },
      });
    if (!cat) break;
    trail.unshift({ slug: cat.slug, title: cat.title });
    if (!cat.parentId) break;
    // parentId is a BigInt; we need the parent slug. One extra query
    // here is fine — the reader page is server-rendered per request
    // and the depth is bounded.
    const parent: { slug: string } | null = await prisma.category.findUnique({
      where: { id: cat.parentId },
      select: { slug: true },
    });
    current = parent?.slug ?? null;
  }
  return trail;
}

// Sibling prev/next inside the same category, ordered by position.
// Returns null on the ends.
export async function getNeighbours(
  lang: string,
  categoryId: bigint,
  topicId: bigint
): Promise<{ prev: ContentListItem | null; next: ContentListItem | null }> {
  assertLocale(lang);
  const current = await prisma.content.findUnique({
    where: { id: topicId },
    select: { position: true },
  });
  if (!current) return { prev: null, next: null };
  const [prev, next] = await Promise.all([
    prisma.content.findFirst({
      where: {
        languageId: lang,
        categoryId,
        type: "topic",
        position: { lt: current.position },
      },
      orderBy: { position: "desc" },
      select: { id: true, slug: true, title: true, position: true },
    }),
    prisma.content.findFirst({
      where: {
        languageId: lang,
        categoryId,
        type: "topic",
        position: { gt: current.position },
      },
      orderBy: { position: "asc" },
      select: { id: true, slug: true, title: true, position: true },
    }),
  ]);
  return { prev, next };
}

export type SearchHit = {
  id: bigint;
  slug: string;
  title: string;
  categorySlug: string;
  categoryTitle: string;
  // Short snippet for the result list. HTML stripped + truncated.
  snippet: string;
  rank: number;
};

// Postgres FTS search over Content for a single language. Uses the
// `simple` config and the GIN index populated by the FTS trigger
// (see prisma/migrations/fts.sql). Returns up to `limit` rows ranked
// by ts_rank.
//
// We use $queryRaw because Prisma can't express tsvector @@ to_tsquery.
// The query is parameterized so user input is escaped.
export async function searchContent(
  lang: string,
  query: string,
  limit: number = 20
): Promise<SearchHit[]> {
  assertLocale(lang);
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Convert user input into a tsquery. Split on whitespace, join with
  // &, and append :* for prefix matching on each term. This handles
  // "intern" → "intern:*" so partial words match the way users expect.
  //
  // Strip characters that would confuse the tsquery parser: parens,
  // ampersands, pipes, colons, quotes, etc. Keep letters (any script),
  // digits, and underscores. Postgres `simple` config tokenises on
  // whitespace, so non-Latin scripts work without stemming.
  const terms = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/[()&|:!"'`~*?\\\/]/g, ""))
    .filter((t) => t.length > 0);
  if (terms.length === 0) return [];
  const tsquery = terms.map((t) => `${t}:*`).join(" & ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (prisma as any).$queryRaw<
    {
      id: bigint;
      slug: string;
      title: string;
      category_slug: string;
      category_title: string;
      snippet: string;
      rank: number;
    }[]
  >`
    SELECT
      c.id,
      c.slug,
      c.title,
      cat.slug AS category_slug,
      cat.title AS category_title,
      substring(
        regexp_replace(
          regexp_replace(coalesce(c.html, ''), '<[^>]+>', ' ', 'g'),
          '\\s+', ' ', 'g'
        ),
        1, 240
      ) AS snippet,
      ts_rank_cd(c.search_vector, to_tsquery('simple', ${tsquery})) AS rank
    FROM contents c
    JOIN categories cat ON cat.id = c.category_id
    WHERE c.language_id = ${lang}
      AND c.type = 'topic'
      AND c.search_vector @@ to_tsquery('simple', ${tsquery})
    ORDER BY rank DESC, c.title ASC
    LIMIT ${limit}
  `;

  return rows.map((r: {
    id: bigint;
    slug: string;
    title: string;
    category_slug: string;
    category_title: string;
    snippet: string;
    rank: number;
  }) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    categorySlug: r.category_slug,
    categoryTitle: r.category_title,
    snippet: r.snippet,
    rank: r.rank,
  }));
}
