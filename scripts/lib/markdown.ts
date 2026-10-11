import { remark } from "remark";
import type { Plugin } from "unified";
import remarkHtml from "remark-html";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Root, Image, Link } from "mdast";

/**
 * remark plugin: rewrite `umbrella://category[/subcat[/level]][/.md]` URIs to
 * internal app paths.
 *
 *   umbrella://communications/censorship         -> /<lang>/communications/censorship
 *   umbrella://communications/censorship/beginner -> /<lang>/communications/censorship/beginner
 *   umbrella://communications/censorship/beginner/s_virtual-private-networks.md
 *                                                 -> /<lang>/communications/censorship/beginner/s_virtual-private-networks
 *
 * The web app maps these to the right surface (checklist vs topic) at render time.
 */
const remarkRewriteUmbrellaLinks: Plugin<[string], Root> = (lang) => {
  return (tree) => {
    visit(tree, "link", (node: Link) => {
      const url = node.url;
      if (!url.startsWith("umbrella://")) return;
      const target = url.slice("umbrella://".length).replace(/\.md$/, "");
      // Strip a trailing filename component (s_foo.md) by keeping the path as-is
      // — the app's [[...slug]] route will resolve s_* to Content and bare paths
      // to Category.
      node.url = `/${lang}/${target}`;
    });
  };
};

/**
 * remark plugin: rewrite `![alt](<path>)` image references to absolute paths
 * under /content/<lang>/. Image paths in umbrella-content are always relative
 * to the .md file's directory; we resolve them here at import time.
 */
const remarkRewriteImages: Plugin<[string, string], Root> = (lang, fileDir) => {
  return (tree) => {
    visit(tree, "image", (node: Image) => {
      const url = node.url;
      if (!url || /^https?:|^data:|^mailto:/.test(url)) return;
      // url is relative to fileDir
      const abs = `${fileDir.replace(/\/$/, "")}/${url}`;
      // collapse ./ and ../ manually
      const parts = abs.split("/").filter(Boolean);
      const stack: string[] = [];
      for (const p of parts) {
        if (p === ".") continue;
        if (p === "..") stack.pop();
        else stack.push(p);
      }
      node.url = `/content/${lang}/${stack.join("/")}`;
    });
  };
};

export async function renderMarkdown(
  source: string,
  opts: { lang: string; fileDir: string },
): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkRewriteImages, opts.lang, opts.fileDir)
    .use(remarkRewriteUmbrellaLinks, opts.lang)
    .use(remarkHtml, { sanitize: false })
    .process(source);
  return String(file);
}
