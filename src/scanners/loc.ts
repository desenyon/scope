import type { LanguageStats } from "../types.ts";
import type { ProjectIndex } from "../core/index.ts";
import { detectLanguage, isTextFile, countLines } from "../utils/walk.ts";

const BATCH_SIZE = 128;

interface TokeiLangV13 {
  blanks: number;
  code: number;
  comments: number;
  reports?: { name: string; stats: { blanks: number; code: number; comments: number } }[];
}

type TokeiReport = Record<string, TokeiLangV13>;

export async function countLocTokei(root: string): Promise<{ languages: LanguageStats[]; totalLines: number; totalCode: number; totalFiles: number } | null> {
  try {
    const proc = Bun.spawn(["tokei", root, "-o", "json"], { stdout: "pipe", stderr: "pipe" });
    const output = await new Response(proc.stdout).text();
    if ((await proc.exited) !== 0) return null;

    const data = JSON.parse(output) as TokeiReport;
    const languages: LanguageStats[] = [];

    for (const [lang, stats] of Object.entries(data)) {
      if (lang === "Total") continue;
      const files = stats.reports?.length ?? 0;
      const { code, comments, blanks } = stats;
      const lines = code + comments + blanks;
      if (files > 0 || code > 0) {
        languages.push({ language: lang, files: files || 1, lines, code, comments, blanks });
      }
    }

    languages.sort((a, b) => b.code - a.code);
    return {
      languages,
      totalLines: languages.reduce((s, l) => s + l.lines, 0),
      totalCode: languages.reduce((s, l) => s + l.code, 0),
      totalFiles: languages.reduce((s, l) => s + l.files, 0),
    };
  } catch {
    return null;
  }
}

export async function countLocNative(index: ProjectIndex): Promise<{ languages: LanguageStats[]; totalLines: number; totalCode: number; totalFiles: number }> {
  const textFiles = index.files.filter((f) => isTextFile(f.ext, f.name) && f.size < 5_000_000);
  const langMap = new Map<string, LanguageStats>();

  for (let i = 0; i < textFiles.length; i += BATCH_SIZE) {
    const batch = textFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const content = await Bun.file(file.absPath).text();
          const language = detectLanguage(file.relPath, file.ext, file.name);
          return { language, ...countLines(content, language) };
        } catch {
          return null;
        }
      })
    );

    for (const r of results) {
      if (!r) continue;
      const existing = langMap.get(r.language) ?? {
        language: r.language, files: 0, lines: 0, code: 0, comments: 0, blanks: 0,
      };
      existing.files++;
      existing.lines += r.lines;
      existing.code += r.code;
      existing.comments += r.comments;
      existing.blanks += r.blanks;
      langMap.set(r.language, existing);
    }
  }

  const languages = [...langMap.values()].sort((a, b) => b.code - a.code);
  return {
    languages,
    totalLines: languages.reduce((s, l) => s + l.lines, 0),
    totalCode: languages.reduce((s, l) => s + l.code, 0),
    totalFiles: languages.reduce((s, l) => s + l.files, 0),
  };
}
