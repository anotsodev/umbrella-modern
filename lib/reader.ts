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
