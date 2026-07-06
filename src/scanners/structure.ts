import type { StructureInfo } from "../types.ts";
import type { ProjectIndex } from "../core/index.ts";
import { isTextFile } from "../utils/walk.ts";

export async function scanStructure(index: ProjectIndex): Promise<StructureInfo> {
  const extensions: Record<string, number> = {};
  for (const f of index.files) {
    const ext = f.ext || "(no ext)";
    extensions[ext] = (extensions[ext] ?? 0) + 1;
  }

  const textFiles = index.files
    .filter((f) => isTextFile(f.ext, f.name) && f.size < 2_000_000)
    .sort((a, b) => b.size - a.size)
    .slice(0, 30);

  const withLines = await Promise.all(
    textFiles.map(async (f) => {
      try {
        const content = await Bun.file(f.absPath).text();
        return { path: f.relPath, lines: content.split("\n").length, size: f.size };
      } catch {
        return { path: f.relPath, lines: 0, size: f.size };
      }
    })
  );

  return {
    totalFiles: index.files.length,
    totalDirectories: index.directories,
    extensions,
    largestFiles: withLines.sort((a, b) => b.lines - a.lines).slice(0, 10),
    depth: index.maxDepth,
  };
}
