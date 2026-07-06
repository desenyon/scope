import { join } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { relative, extname, dirname } from "node:path";

export type ListEngine = "fd" | "rg" | "native";

export interface FileEntry {
  relPath: string;
  absPath: string;
  ext: string;
  name: string;
  size: number;
}

export interface ProjectIndex {
  root: string;
  files: FileEntry[];
  directories: number;
  maxDepth: number;
  listEngine: ListEngine;
  relSet: Set<string>;
}

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", ".nuxt", "dist", "build", "out",
  ".turbo", ".cache", ".parcel-cache", "coverage", ".nyc_output",
  "__pycache__", ".pytest_cache", ".mypy_cache", ".venv", "venv",
  "target", "vendor", ".idea", ".vscode",
]);

function parsePath(root: string, relPath: string): FileEntry {
  const name = relPath.split("/").pop() ?? relPath;
  return {
    relPath,
    absPath: join(root, relPath),
    ext: extname(name).toLowerCase(),
    name,
    size: 0,
  };
}

function computeTreeStats(files: FileEntry[]): { directories: number; maxDepth: number } {
  const dirs = new Set<string>();
  let maxDepth = 0;
  for (const f of files) {
    const parts = f.relPath.split("/");
    maxDepth = Math.max(maxDepth, parts.length - 1);
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }
  return { directories: dirs.size, maxDepth };
}

async function listWithFd(root: string): Promise<string[] | null> {
  try {
    const proc = Bun.spawn(
      ["fd", "-t", "f", "-H", "--no-ignore-vcs", ".", root,
        "--exclude", "node_modules", "--exclude", ".git"],
      { stdout: "pipe", stderr: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    if ((await proc.exited) !== 0) return null;
    return output
      .split("\n")
      .filter(Boolean)
      .map((p) => relative(root, p));
  } catch {
    return null;
  }
}

async function listWithRg(root: string): Promise<string[] | null> {
  try {
    const proc = Bun.spawn(["rg", "--files", root], { stdout: "pipe", stderr: "pipe" });
    const output = await new Response(proc.stdout).text();
    if ((await proc.exited) !== 0) return null;
    return output
      .split("\n")
      .filter(Boolean)
      .map((p) => relative(root, p));
  } catch {
    return null;
  }
}

function shouldIgnoreSegment(name: string): boolean {
  if (IGNORE_DIRS.has(name)) return true;
  if (name.startsWith(".") && name !== ".env.example") return true;
  if (name.endsWith(".min.js") || name.endsWith(".min.css") || name.endsWith(".map")) return true;
  return false;
}

async function listNative(root: string): Promise<FileEntry[]> {
  const files: FileEntry[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (entry) => {
        if (shouldIgnoreSegment(entry.name)) return;
        const absPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(absPath);
        } else if (entry.isFile()) {
          try {
            const s = await stat(absPath);
            const relPath = relative(root, absPath);
            files.push({
              relPath,
              absPath,
              ext: extname(entry.name).toLowerCase(),
              name: entry.name,
              size: s.size,
            });
          } catch { /* skip */ }
        }
      })
    );
  }

  await walk(root);
  return files;
}

async function hydrateSizes(files: FileEntry[]): Promise<void> {
  const needsSize = files.filter((f) => f.size === 0);
  const BATCH = 256;
  for (let i = 0; i < needsSize.length; i += BATCH) {
    await Promise.all(
      needsSize.slice(i, i + BATCH).map(async (f) => {
        try {
          f.size = (await stat(f.absPath)).size;
        } catch { /* skip */ }
      })
    );
  }
}

export async function buildProjectIndex(root: string): Promise<ProjectIndex> {
  let files: FileEntry[];
  let listEngine: ListEngine;

  const fdPaths = await listWithFd(root);
  if (fdPaths) {
    listEngine = "fd";
    files = fdPaths.map((p) => parsePath(root, p));
    await hydrateSizes(files);
  } else {
    const rgPaths = await listWithRg(root);
    if (rgPaths) {
      listEngine = "rg";
      files = rgPaths.map((p) => parsePath(root, p));
      await hydrateSizes(files);
    } else {
      listEngine = "native";
      files = await listNative(root);
    }
  }

  const { directories, maxDepth } = computeTreeStats(files);
  const relSet = new Set(files.map((f) => f.relPath));

  return { root, files, directories, maxDepth, listEngine, relSet };
}

export function filesInDir(index: ProjectIndex, prefix: string): FileEntry[] {
  const norm = prefix.endsWith("/") ? prefix : prefix + "/";
  return index.files.filter((f) => f.relPath.startsWith(norm) || dirname(f.relPath) === prefix);
}

export function hasFile(index: ProjectIndex, relPath: string): boolean {
  return index.relSet.has(relPath);
}

export function hasFileNamed(index: ProjectIndex, name: string): boolean {
  return index.files.some((f) => f.name === name || f.name.toLowerCase() === name.toLowerCase());
}
