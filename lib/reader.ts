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

// ---- Checklists (pathways) ----------------------------------------------

export type ChecklistItem = {
  id: string; // BigInt from the DB, stringified for client-side keying
  position: number;
  kind: string; // "check" | "section" | "umbrella"
  label: string;
  body: string | null;
  href: string | null;
  // The label of the most recent "section" item before this one.
  // null for items before the first section header. Used by the
  // reader UI to render section headings.
  sectionTitle: string | null;
};

export type ChecklistSummary = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryTitle: string;
  itemCount: number;
};

export type ChecklistDetail = ChecklistSummary & {
  // Optional intro pulled from the first "umbrella" item body (a
  // cross-reference to a topic) or a leading markdown body, if the
  // import job populated one. null when there's nothing to show.
  intro: string | null;
  items: ChecklistItem[];
};

// All checklists for a language, grouped by their parent category. The
// reader surface uses this to render the /<lang>/pathways index.
export async function getAllChecklists(
  lang: string
): Promise<ChecklistSummary[]> {
  assertLocale(lang);
  const rows = await prisma.checklist.findMany({
    where: { languageId: lang },
    orderBy: [{ categoryId: "asc" }, { position: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      category: { select: { slug: true, title: true } },
      _count: { select: { items: true } },
    },
  });
  return rows.map((r) => ({
    id: String(r.id),
    slug: r.slug,
    title: r.title,
    categorySlug: r.category.slug,
    categoryTitle: r.category.title,
    itemCount: r._count.items,
  }));
}

// One checklist with its items, ordered by position. Returns null if
// the slug doesn't exist for the language.
export async function getChecklist(
  lang: string,
  slug: string
): Promise<ChecklistDetail | null> {
  assertLocale(lang);
  const row = await prisma.checklist.findUnique({
    where: { languageId_slug: { languageId: lang, slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      category: { select: { slug: true, title: true } },
      items: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          kind: true,
          label: true,
          body: true,
          href: true,
        },
      },
    },
  });
  if (!row) return null;

  // Walk items once: track the most recent section heading and
  // capture the first umbrella-kind body as the optional intro.
  let sectionTitle: string | null = null;
  let intro: string | null = null;
  const items: ChecklistItem[] = row.items.map((it) => {
    if (it.kind === "section") {
      sectionTitle = it.label;
    } else if (intro === null && it.kind === "umbrella" && it.body) {
      intro = it.body;
    }
    return {
      id: String(it.id),
      position: it.position,
      kind: it.kind,
      label: it.label,
      body: it.body,
      href: it.href,
      sectionTitle,
    };
  });

  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    categorySlug: row.category.slug,
    categoryTitle: row.category.title,
    itemCount: items.length,
    intro,
    items,
  };
}

// ---- Forms ----------------------------------------------------------------

// Form schema as stored in the DB (matches the upstream f_*.yml shape).
// `text_input` and `text_area` produce strings; `single_choice` produces
// a single value string; `multiple_choice` produces an array of value
// strings. `label` is a non-input heading and never appears in answers.
export type FormItemType =
  | "text_input"
  | "text_area"
  | "label"
  | "single_choice"
  | "multiple_choice";

export type FormOption = { label: string; value: string };
export type FormItem = {
  name: string;
  type: FormItemType;
  // Optional in the upstream data. The renderer falls back to `name`.
  label?: string;
  options?: FormOption[];
};
export type FormScreen = { title: string; items: FormItem[] };
export type FormSchema = { title: string; screens: FormScreen[] };

export type FormSummary = {
  id: string; // BigInt, stringified
  slug: string;
  title: string;
  screenCount: number;
  itemCount: number;
};

export type FormDetail = FormSummary & {
  schema: FormSchema;
};

const FORM_ITEM_TYPES: ReadonlySet<FormItemType> = new Set<FormItemType>([
  "text_input",
  "text_area",
  "label",
  "single_choice",
  "multiple_choice",
]);

// Sanity-check a schema before handing it to the client. The import
// job already enforces this (scripts/import-content.ts), but the DB
// row can outlive a code change, so we re-verify on read. A bad row
// causes a 500 with a descriptive error rather than a blank field
// in the UI.
function assertValidFormSchema(doc: unknown): FormSchema {
  if (!doc || typeof doc !== "object") {
    throw new Error("form schema is not an object");
  }
  const d = doc as { title?: unknown; screens?: unknown };
  if (typeof d.title !== "string" || !Array.isArray(d.screens)) {
    throw new Error("form schema missing title or screens");
  }
  for (const [sIdx, screen] of d.screens.entries()) {
    if (!screen || typeof screen !== "object") {
      throw new Error(`form schema screens[${sIdx}] is not an object`);
    }
    const s = screen as { title?: unknown; items?: unknown };
    if (typeof s.title !== "string" || !Array.isArray(s.items)) {
      throw new Error(`form schema screens[${sIdx}] missing title or items`);
    }
    for (const [iIdx, item] of s.items.entries()) {
      if (!item || typeof item !== "object") {
        throw new Error(
          `form schema screens[${sIdx}].items[${iIdx}] is not an object`,
        );
      }
      const it = item as { name?: unknown; type?: unknown; label?: unknown; options?: unknown };
      if (typeof it.name !== "string" || typeof it.type !== "string") {
        throw new Error(
          `form schema screens[${sIdx}].items[${iIdx}] missing name or type`,
        );
      }
      // `label` is optional in the upstream data (some text_area
      // items ship with no label). The renderer falls back to
      // `name` in that case. We only require it to be a string
      // when present.
      if (it.label !== undefined && typeof it.label !== "string") {
        throw new Error(
          `form schema screens[${sIdx}].items[${iIdx}].label is not a string`,
        );
      }
      if (!FORM_ITEM_TYPES.has(it.type as FormItemType)) {
        throw new Error(
          `form schema screens[${sIdx}].items[${iIdx}] has unknown type "${it.type}". ` +
            `Update the validator (lib/reader.ts) AND the renderer (components/form-runner.tsx) ` +
            `AND the import job (scripts/import-content.ts) to handle this type.`,
        );
      }
      if ((it.type === "single_choice" || it.type === "multiple_choice") &&
          !Array.isArray(it.options)) {
        throw new Error(
          `form schema screens[${sIdx}].items[${iIdx}] (${it.type}) missing options array`,
        );
      }
    }
  }
  return d as unknown as FormSchema;
}

// All forms for a language. Returns a flat summary list ordered by
// title; forms don't belong to a topic category, so there's no
// category grouping.
export async function getAllForms(lang: string): Promise<FormSummary[]> {
  assertLocale(lang);
  const rows = await prisma.form.findMany({
    where: { languageId: lang },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      schema: true,
    },
  });
  return rows.map((r) => {
    const schema = assertValidFormSchema(r.schema);
    const itemCount = schema.screens.reduce(
      (acc, s) =>
        acc + s.items.filter((it) => it.type !== "label").length,
      0,
    );
    return {
      id: String(r.id),
      slug: r.slug,
      title: r.title,
      screenCount: schema.screens.length,
      itemCount,
    };
  });
}

// One form with its full schema. Returns null if the slug doesn't
// exist for the language. Throws if the schema is malformed (see
// assertValidFormSchema for the error shape).
export async function getForm(
  lang: string,
  slug: string,
): Promise<FormDetail | null> {
  assertLocale(lang);
  const row = await prisma.form.findUnique({
    where: { languageId_slug: { languageId: lang, slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      schema: true,
    },
  });
  if (!row) return null;
  const schema = assertValidFormSchema(row.schema);
  const itemCount = schema.screens.reduce(
    (acc, s) =>
      acc + s.items.filter((it) => it.type !== "label").length,
    0,
  );
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    screenCount: schema.screens.length,
    itemCount,
    schema,
  };
}
