import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export type FileEntry = {
  relPath: string; // path relative to root, forward-slash separated
  absPath: string;
};

export type Tree = {
  files: FileEntry[];
  dirs: string[]; // directories relative to root
};

export async function walkContentRoot(
  root: string,
  includeExts: string[],
): Promise<Tree> {
  const files: FileEntry[] = [];
  const dirs: string[] = [];

  async function visit(absDir: string) {
    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }
    for (const entry of entries) {
      const abs = join(absDir, entry.name);
      const rel = relative(root, abs).split(sep).join("/");
      if (entry.isDirectory()) {
        dirs.push(rel);
        await visit(abs);
      } else if (entry.isFile()) {
        if (includeExts.some((ext) => entry.name.endsWith(ext))) {
          files.push({ relPath: rel, absPath: abs });
        }
      }
    }
  }

  await visit(root);
  return { files, dirs };
}

export async function fileExists(absPath: string): Promise<boolean> {
  try {
    await stat(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(absPath: string): Promise<string> {
  return readFile(absPath, "utf8");
}
