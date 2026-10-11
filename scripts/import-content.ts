#!/usr/bin/env tsx
/**
 * umbrella-content import job.
 *
 * Walks the cloned `securityfirst/umbrella-content` repo and upserts everything
 * (languages, categories, topics, forms, checklists) into Postgres via Prisma.
 *
 * Idempotent: re-running on an unchanged upstream is a no-op. Re-running after
 * upstream changes updates only the changed rows.
 *
 * Usage:
 *   CONTENT_DIR=/app/public/content npx tsx scripts/import-content.ts
 *
 * The Docker volume `umbrella-modern-content` is mounted at /app/public/content
 * by compose.yml. The script will clone the upstream repo into CONTENT_DIR on
 * the first run and `git pull --ff-only` on subsequent runs.
 */
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import matter from "gray-matter";
import yaml from "js-yaml";
import YAML from "yaml";
import { PrismaClient, Prisma } from "@prisma/client";

import { slugify } from "./lib/slug.js";
import { isRtl, NATIVE_NAMES, ENGLISH_NAMES } from "./lib/languages.js";
import { walkContentRoot, readTextFile, type FileEntry } from "./lib/fs-walk.js";
import { renderMarkdown } from "./lib/markdown.js";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

const UPSTREAM = "https://github.com/securityfirst/umbrella-content.git";
const UPSTREAM_REF = "master";
const SUPPORTED_LANGS = ["ar", "en", "es", "fa", "fr", "ru", "zh-Hant"] as const;

const CONTENT_DIR = process.env.CONTENT_DIR ?? "/app/public/content";

const prisma = new PrismaClient();

// ---- Upstream fetch ----------------------------------------------------------

function ensureContentClone() {
  const isPopulated =
    existsSync(CONTENT_DIR) &&
    existsSync(join(CONTENT_DIR, "en")) &&
    existsSync(join(CONTENT_DIR, ".git"));

  if (!isPopulated) {
    // CONTENT_DIR may be a Docker volume mountpoint, so we can't rm -rf it
    // while it's mounted. Clone into a sibling tmp dir and move the contents in.
    if (!existsSync(CONTENT_DIR)) {
      mkdir(CONTENT_DIR, { recursive: true });
    }
    const tmp = join(dirname(CONTENT_DIR), `.content-clone-${process.pid}`);
    console.log(`[import] cloning ${UPSTREAM} -> ${tmp}`);
    execSync(`git clone --depth 1 --branch ${UPSTREAM_REF} ${UPSTREAM} ${tmp}`, {
      stdio: "inherit",
    });
    // Move each top-level entry from tmp into CONTENT_DIR. Use `cp -a` so
    // existing files in CONTENT_DIR (like .gitkeep) are preserved.
    const entries = execSync(`ls -1 ${tmp}`).toString().trim().split("\n");
    for (const e of entries) {
      execSync(`cp -a ${tmp}/${e} ${CONTENT_DIR}/`, { stdio: "inherit" });
    }
    execSync(`rm -rf ${tmp}`);
    console.log(`[import] clone staged into ${CONTENT_DIR}`);
    return;
  }
  console.log(`[import] pulling latest from ${UPSTREAM}`);
  execSync(`git -C ${CONTENT_DIR} fetch --depth 1 origin ${UPSTREAM_REF}`, { stdio: "inherit" });
  execSync(`git -C ${CONTENT_DIR} reset --hard origin/${UPSTREAM_REF}`, { stdio: "inherit" });
}

// ---- Language upserts --------------------------------------------------------

async function upsertLanguages() {
  for (const code of SUPPORTED_LANGS) {
    await prisma.language.upsert({
      where: { code },
      create: {
        code,
        name: ENGLISH_NAMES[code] ?? code,
        nativeName: NATIVE_NAMES[code] ?? code,
        rtl: isRtl(code),
      },
      update: {
        name: ENGLISH_NAMES[code] ?? code,
        nativeName: NATIVE_NAMES[code] ?? code,
        rtl: isRtl(code),
      },
    });
  }
}

// ---- Category tree -----------------------------------------------------------

/**
 * Build the category tree for a language. Walks the language directory and
 * turns directories into Category rows with parent links. Special dirs:
 *   - "forms"      -> forms container, no parent category
 *   - "pathways"   -> top-level category "pathways"
 *   - "glossary"   -> top-level category "glossary" containing only topics
 *   - "about"      -> top-level category "about" containing only topics
 *   - "tools"      -> top-level category "tools" with one level of subdirs
 *
 * We don't pre-create rows for files; the topic walk below resolves each file
 * to a category by walking the path up.
 */
type CatRow = { id: bigint; slug: string; parentId: bigint | null };

async function buildCategoryTree(lang: string): Promise<Map<string, CatRow>> {
  // Map: "<lang>/<dir-path>" -> Category row.
  // The key includes lang so callers can't cross languages by accident.
  const map = new Map<string, CatRow>();

  const { dirs } = await walkContentRoot(join(CONTENT_DIR, lang), [".md", ".yml"]);

  for (const rel of dirs.sort()) {
    // rel is e.g. "communications" or "communications/censorship" or "communications/censorship/beginner"
    const segments = rel.split("/");
    for (let i = 1; i <= segments.length; i++) {
      const pathSoFar = segments.slice(0, i).join("/");
      if (map.has(pathSoFar)) continue;
      // The natural upstream URL is the directory path, so the slug is
      // the path-joined lowercased segments. e.g. "communications/censorship/expert"
      // -> "communications-censorship-expert". This is the same key the web
      // app will use for routing, so we keep DB slugs and URL segments aligned.
      const slug = segments.slice(0, i).map(slugify).join("-");
      const parentPath = segments.slice(0, i - 1).join("/");
      const parentRow = parentPath ? map.get(parentPath) ?? null : null;
      const title = segments.slice(0, i)
        .map((s) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "))
        .join(" / ");
      const row = await prisma.category.upsert({
        where: { languageId_slug: { languageId: lang, slug } },
        create: {
          languageId: lang,
          slug,
          title,
          parentId: parentRow ? parentRow.id : null,
        },
        update: {
          title,
          parentId: parentRow ? parentRow.id : null,
        },
        select: { id: true, slug: true, parentId: true },
      });
      map.set(pathSoFar, { id: row.id, slug: row.slug, parentId: row.parentId });
    }
  }

  return map;
}

function categoryKeyForFile(lang: string, relPath: string, catMap: Map<string, CatRow>): string | null {
  // Given a relative path like "communications/censorship/beginner/s_foo.md",
  // return the longest existing directory in catMap. For "about/s_about.md"
  // the answer is "about"; for "pathways/c_security-planning.yml" it's "pathways".
  const segments = relPath.split("/").slice(0, -1);
  for (let i = segments.length; i > 0; i--) {
    const candidate = segments.slice(0, i).join("/");
    if (catMap.has(candidate)) return candidate;
  }
  return null;
}

// ---- Topic import ------------------------------------------------------------

type TopicFrontmatter = { index?: number; title?: string };

async function importTopics(lang: string, catMap: Map<string, CatRow>) {
  const root = join(CONTENT_DIR, lang);
  const { files } = await walkContentRoot(root, [".md"]);
  let count = 0;
  for (const file of files) {
    const fileName = file.relPath.split("/").pop()!;
    if (!fileName.startsWith("s_")) continue;
    const catKey = categoryKeyForFile(lang, file.relPath, catMap);
    if (!catKey) {
      console.warn(`[import]   (skip) no category for ${file.relPath}`);
      continue;
    }
    const cat = catMap.get(catKey)!;
    const source = await readTextFile(file.absPath);
    const { data, content } = matter(source);
    const fm = data as TopicFrontmatter;
    const title = fm.title ?? fileName.replace(/^s_/, "").replace(/\.md$/, "").replace(/-/g, " ");
    const position = Number.isFinite(fm.index) ? Number(fm.index) : 9999;
    // fileDir is the directory of the markdown file, RELATIVE to lang root
    const fileDir = file.relPath.split("/").slice(0, -1).join("/");
    const html = await renderMarkdown(content, { lang, fileDir });

    // Determine content type: glossary/ for the per-term files, otherwise topic
    const type = catKey === "glossary" ? "glossary" : "topic";

    await prisma.content.upsert({
      where: { languageId_mdPath: { languageId: lang, mdPath: file.relPath } },
      create: {
        languageId: lang,
        categoryId: cat.id,
        slug: fileName.replace(/^s_/, "").replace(/\.md$/, ""),
        title,
        mdPath: file.relPath,
        html,
        frontmatter: fm as Prisma.InputJsonValue,
        position,
        type,
      },
      update: {
        categoryId: cat.id,
        title,
        html,
        frontmatter: fm as Prisma.InputJsonValue,
        position,
        type,
      },
    });
    count++;
  }
  console.log(`[import]   ${lang}: ${count} topics`);
}

// ---- Form import -------------------------------------------------------------

const FORM_ITEM_TYPES = new Set([
  "text_input",
  "text_area",
  "label",
  "single_choice",
  "multiple_choice",
]);

type FormItem = {
  name: string;
  type: "text_input" | "text_area" | "label" | "single_choice" | "multiple_choice";
  label: string;
  options?: { label: string; value: string }[];
};
type FormScreen = { title: string; items: FormItem[] };
type FormDoc = { title: string; screens: FormScreen[] };

// Walk the schema once and surface every unsupported item type.
// The web renderer only knows the five known types; silently
// accepting an unknown type would round-trip fine in the DB but
// render as a blank field in the UI, which is the worst failure
// mode. Fail loud at import time instead.
function validateFormSchema(doc: FormDoc, relPath: string): void {
  const seen = new Set<string>();
  for (const [sIdx, screen] of doc.screens.entries()) {
    for (const [iIdx, item] of screen.items.entries()) {
      if (!FORM_ITEM_TYPES.has(item.type)) {
        seen.add(item.type);
        console.error(
          `[import]   ✘ ${relPath}: screens[${sIdx}].items[${iIdx}] has unknown type "${item.type}"`,
        );
      }
    }
  }
  if (seen.size > 0) {
    throw new Error(
      `[import] ${relPath} contains unknown form item types: ${[...seen].join(", ")}. ` +
        `Update the import validator AND the web renderer to handle these types.`,
    );
  }
}

async function importForms(lang: string, catMap: Map<string, CatRow>) {
  const root = join(CONTENT_DIR, lang, "forms");
  if (!existsSync(root)) return;
  // Forms live in a synthetic "forms" category per language (the directory
  // `forms/` already created a Category row).
  const formsCat = catMap.get("forms");
  if (!formsCat) {
    console.warn(`[import]   (skip) no "forms" category for ${lang}`);
    return;
  }
  const { files } = await walkContentRoot(root, [".yml"]);
  let count = 0;
  for (const file of files) {
    const fileName = file.relPath.split("/").pop()!;
    if (!fileName.startsWith("f_")) continue;
    const slug = fileName.replace(/^f_/, "").replace(/\.yml$/, "");
    const raw = await readTextFile(file.absPath);
    const doc = yaml.load(raw) as FormDoc;
    if (!doc?.title || !Array.isArray(doc.screens)) {
      console.warn(`[import]   (skip) malformed form ${file.relPath}`);
      continue;
    }
    validateFormSchema(doc, file.relPath);
    await prisma.form.upsert({
      where: { languageId_slug: { languageId: lang, slug } },
      create: {
        languageId: lang,
        slug,
        categoryId: formsCat.id,
        title: doc.title,
        schema: doc as unknown as Prisma.InputJsonValue,
      },
      update: {
        categoryId: formsCat.id,
        title: doc.title,
        schema: doc as unknown as Prisma.InputJsonValue,
      },
    });
    count++;
  }
  console.log(`[import]   ${lang}: ${count} forms`);
}

// ---- Checklist import --------------------------------------------------------

type ChecklistDoc = {
  index?: number;
  title?: string;
  list: { check: string }[];
};

async function importChecklists(lang: string, catMap: Map<string, CatRow>) {
  const root = join(CONTENT_DIR, lang);
  const { files } = await walkContentRoot(root, [".yml"]);
  let count = 0;
  for (const file of files) {
    const fileName = file.relPath.split("/").pop()!;
    if (!fileName.startsWith("c_")) continue;
    const catKey = categoryKeyForFile(lang, file.relPath, catMap);
    if (!catKey) {
      console.warn(`[import]   (skip) no category for ${file.relPath}`);
      continue;
    }
    const cat = catMap.get(catKey)!;
    const raw = await readTextFile(file.absPath);
    // js-yaml rejects some upstream files (e.g. en/pathways/c_digital-basics.yml)
    // whose multi-line quoted scalars have under-indented continuations. eemeli's
    // `yaml` package is more lenient and parses them. If both fail, the file is
    // genuinely broken upstream and we log+skip.
    let doc: ChecklistDoc;
    try {
      doc = YAML.parse(raw) as ChecklistDoc;
      if (!Array.isArray(doc?.list)) {
        doc = yaml.load(raw) as ChecklistDoc;
      }
    } catch {
      try {
        doc = yaml.load(raw) as ChecklistDoc;
      } catch (err) {
        console.warn(
          `[import]   (skip) YAML parse failed for ${file.relPath}: ${
            (err as Error).message.split("\n")[0]
          }`,
        );
        continue;
      }
    }
    if (!Array.isArray(doc?.list)) {
      console.warn(`[import]   (skip) malformed checklist ${file.relPath}`);
      continue;
    }
    // The checklist's "title" is the parent directory name when not in frontmatter
    // (e.g. en/pathways/c_security-planning.yml -> "Security Planning" from frontmatter,
    // en/communications/censorship/beginner/c_checklist.yml -> "Beginner" derived from dir).
    const dirSegments = file.relPath.split("/").slice(0, -1);
    const lastDir = dirSegments[dirSegments.length - 1] ?? "checklist";
    const title = doc.title
      ?? lastDir
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
    const position = Number.isFinite(doc.index) ? Number(doc.index) : 9999;
    // Upstream uses the literal filename "c_checklist.yml" in many categories,
    // so the bare filename slug collides. Build the slug from the directory
    // path + the part of the filename after "c_", so each checklist has a
    // unique (languageId, slug) key that mirrors its URL position.
    const dirSegmentsForSlug = file.relPath.split("/").slice(0, -1);
    const fileBase = fileName.replace(/^c_/, "").replace(/\.yml$/, "");
    const slugParts = fileBase === "checklist"
      ? dirSegmentsForSlug
      : [...dirSegmentsForSlug, fileBase];
    const slug = slugParts.filter(Boolean).map(slugify).join("-");

    // Upsert the checklist then replace its items.
    const checklist = await prisma.checklist.upsert({
      where: { languageId_slug: { languageId: lang, slug } },
      create: {
        languageId: lang,
        slug,
        categoryId: cat.id,
        title,
        position,
      },
      update: {
        categoryId: cat.id,
        title,
        position,
      },
    });
    await prisma.checklistItem.deleteMany({ where: { checklistId: checklist.id } });
    for (let i = 0; i < doc.list.length; i++) {
      // The yaml parser narrows each entry to a single-key object
      // ({check: string} | {label: string} | ...), but we need to
      // discriminate at runtime, so widen here.
      const raw = doc.list[i] as unknown as
        | string
        | { label?: unknown; check?: unknown; umbrella?: unknown }
        | Record<string, unknown>;
      // Checklist items are one of:
      //   { label: "..." }  — section heading
      //   { check: "..." }  — action item (markdown body)
      //   { umbrella: "umbrella://..." }  — pathway link to another topic
      let kind = "check";
      let label = "";
      let body: string | null = null;
      let href: string | null = null;
      if (typeof raw === "string") {
        label = raw;
        kind = "check";
      } else if (raw && typeof raw === "object") {
        if (typeof raw.label === "string") {
          kind = "section";
          label = raw.label;
        } else if (typeof raw.check === "string") {
          label = truncate(raw.check, 120);
          body = raw.check;
        } else if (typeof raw.umbrella === "string") {
          kind = "umbrella";
          href = raw.umbrella;
          label = `See: ${raw.umbrella.replace(/^umbrella:\/\//, "").replace(/\.md$/, "")}`;
        } else {
          // Unknown shape — stringify the first defined value
          const firstKey = Object.keys(raw)[0];
          if (firstKey) {
            label = `${firstKey}: ${String((raw as Record<string, unknown>)[firstKey])}`;
            body = String((raw as Record<string, unknown>)[firstKey]);
          } else {
            continue;
          }
        }
      } else {
        continue;
      }
      await prisma.checklistItem.create({
        data: {
          checklistId: checklist.id,
          position: i,
          kind,
          label,
          body,
          href,
        },
      });
    }
    count++;
  }
  console.log(`[import]   ${lang}: ${count} checklists`);
}

// ---- Main --------------------------------------------------------------------

async function main() {
  console.log(`[import] CONTENT_DIR=${CONTENT_DIR}`);
  ensureContentClone();
  console.log(`[import] upserting languages...`);
  await upsertLanguages();
  for (const lang of SUPPORTED_LANGS) {
    console.log(`[import] ${lang}: building category tree...`);
    const catMap = await buildCategoryTree(lang);
    console.log(`[import]   ${catMap.size} categories`);
    await importTopics(lang, catMap);
    await importForms(lang, catMap);
    await importChecklists(lang, catMap);
  }
  console.log(`[import] done.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
