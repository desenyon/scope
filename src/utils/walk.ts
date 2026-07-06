import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";

const DEFAULT_IGNORE = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  ".parcel-cache",
  "coverage",
  ".nyc_output",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".venv",
  "venv",
  "env",
  ".env",
  "target",
  "vendor",
  ".idea",
  ".vscode",
  ".DS_Store",
  "*.min.js",
  "*.min.css",
  "*.map",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "Cargo.lock",
  "poetry.lock",
  "Gemfile.lock",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyw", ".pyi",
  ".go", ".rs", ".java", ".kt", ".kts", ".scala",
  ".rb", ".php", ".swift", ".m", ".mm",
  ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx",
  ".cs", ".fs", ".vb",
  ".vue", ".svelte", ".astro",
  ".html", ".htm", ".css", ".scss", ".sass", ".less",
  ".json", ".yaml", ".yml", ".toml", ".xml",
  ".md", ".mdx", ".txt", ".rst",
  ".sql", ".sh", ".bash", ".zsh", ".fish",
  ".dockerfile", ".tf", ".hcl",
  ".graphql", ".gql",
  ".r", ".R", ".jl", ".lua", ".pl", ".pm",
  ".ex", ".exs", ".erl", ".hrl", ".clj", ".cljs",
  ".dart", ".zig", ".nim", ".v", ".vhdl",
  ".proto", ".thrift",
]);

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript",
  ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
  ".py": "Python", ".pyw": "Python", ".pyi": "Python",
  ".go": "Go", ".rs": "Rust", ".java": "Java",
  ".kt": "Kotlin", ".kts": "Kotlin", ".scala": "Scala",
  ".rb": "Ruby", ".php": "PHP",
  ".swift": "Swift", ".m": "Objective-C", ".mm": "Objective-C++",
  ".c": "C", ".h": "C", ".cpp": "C++", ".hpp": "C++", ".cc": "C++", ".cxx": "C++",
  ".cs": "C#", ".fs": "F#", ".vb": "Visual Basic",
  ".vue": "Vue", ".svelte": "Svelte", ".astro": "Astro",
  ".html": "HTML", ".htm": "HTML",
  ".css": "CSS", ".scss": "SCSS", ".sass": "Sass", ".less": "Less",
  ".json": "JSON", ".yaml": "YAML", ".yml": "YAML", ".toml": "TOML", ".xml": "XML",
  ".md": "Markdown", ".mdx": "MDX", ".txt": "Plain Text", ".rst": "reStructuredText",
  ".sql": "SQL", ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell", ".fish": "Shell",
  ".tf": "Terraform", ".hcl": "HCL",
  ".graphql": "GraphQL", ".gql": "GraphQL",
  ".r": "R", ".R": "R", ".jl": "Julia", ".lua": "Lua",
  ".ex": "Elixir", ".exs": "Elixir", ".erl": "Erlang", ".hrl": "Erlang",
  ".clj": "Clojure", ".cljs": "ClojureScript",
  ".dart": "Dart", ".zig": "Zig", ".nim": "Nim",
  ".proto": "Protocol Buffers",
};

const FILENAME_LANG: Record<string, string> = {
  "dockerfile": "Docker", "makefile": "Makefile", "gemfile": "Ruby",
  "rakefile": "Ruby", "vagrantfile": "Ruby",
};

const COMMENT_PATTERNS: Record<string, { single?: string; multi?: [string, string] }> = {
  TypeScript: { single: "//", multi: ["/*", "*/"] },
  JavaScript: { single: "//", multi: ["/*", "*/"] },
  Python: { single: "#", multi: ['"""', '"""'] },
  Go: { single: "//", multi: ["/*", "*/"] },
  Rust: { single: "//", multi: ["/*", "*/"] },
  Java: { single: "//", multi: ["/*", "*/"] },
  Kotlin: { single: "//", multi: ["/*", "*/"] },
  Scala: { single: "//", multi: ["/*", "*/"] },
  Ruby: { single: "#" },
  PHP: { single: "//", multi: ["/*", "*/"] },
  Swift: { single: "//", multi: ["/*", "*/"] },
  "C": { single: "//", multi: ["/*", "*/"] },
  "C++": { single: "//", multi: ["/*", "*/"] },
  "C#": { single: "//", multi: ["/*", "*/"] },
  Shell: { single: "#" },
  SQL: { single: "--", multi: ["/*", "*/"] },
  HTML: { multi: ["<!--", "-->"] },
  CSS: { multi: ["/*", "*/"] },
  SCSS: { single: "//", multi: ["/*", "*/"] },
  Vue: { single: "//", multi: ["/*", "*/"] },
  Svelte: { single: "//", multi: ["/*", "*/"] },
  Terraform: { single: "#", multi: ["/*", "*/"] },
  YAML: { single: "#" },
  Elixir: { single: "#" },
  Erlang: { single: "%" },
  Lua: { single: "--", multi: ["--[[", "]]"] },
  R: { single: "#" },
  Dart: { single: "//", multi: ["/*", "*/"] },
};

export interface WalkEntry {
  absPath: string;
  relPath: string;
  ext: string;
  name: string;
  size: number;
}

export interface WalkResult {
  files: WalkEntry[];
  directories: number;
  maxDepth: number;
}

function shouldIgnore(name: string, isDir: boolean): boolean {
  const lower = name.toLowerCase();
  if (DEFAULT_IGNORE.has(name) || DEFAULT_IGNORE.has(lower)) return true;
  if (name.startsWith(".") && name !== ".env.example") return true;
  if (name.endsWith(".min.js") || name.endsWith(".min.css") || name.endsWith(".map")) return true;
  if (isDir && (name === "node_modules" || name === ".git")) return true;
  return false;
}

export function detectLanguage(filePath: string, ext: string, name: string): string {
  const lowerName = name.toLowerCase();
  if (FILENAME_LANG[lowerName]) return FILENAME_LANG[lowerName];
  if (lowerName === "dockerfile" || lowerName.startsWith("dockerfile.")) return "Docker";
  return EXT_TO_LANG[ext] ?? (ext ? ext.slice(1).toUpperCase() : "Unknown");
}

export function isTextFile(ext: string, name: string): boolean {
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const lower = name.toLowerCase();
  return lower in FILENAME_LANG || lower.startsWith("dockerfile");
}

export async function walkProject(root: string): Promise<WalkResult> {
  const files: WalkEntry[] = [];
  let directories = 0;
  let maxDepth = 0;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) maxDepth = depth;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (shouldIgnore(entry.name, entry.isDirectory())) return;
        const absPath = join(dir, entry.name);
        const relPath = relative(root, absPath);

        if (entry.isDirectory()) {
          directories++;
          await walk(absPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const s = await stat(absPath);
            files.push({
              absPath,
              relPath,
              ext: extname(entry.name).toLowerCase(),
              name: entry.name,
              size: s.size,
            });
          } catch {
            /* skip */
          }
        }
      })
    );
  }

  await walk(root, 0);
  return { files, directories, maxDepth };
}

export function countLines(content: string, language: string): { lines: number; code: number; comments: number; blanks: number } {
  const lines = content.split("\n");
  const total = lines.length;
  let code = 0;
  let comments = 0;
  let blanks = 0;

  const patterns = COMMENT_PATTERNS[language];
  let inMulti = false;
  const multiStart = patterns?.multi?.[0];
  const multiEnd = patterns?.multi?.[1];
  const single = patterns?.single;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blanks++;
      continue;
    }

    if (inMulti) {
      comments++;
      if (multiEnd && trimmed.includes(multiEnd)) inMulti = false;
      continue;
    }

    if (multiStart && trimmed.includes(multiStart)) {
      comments++;
      if (!multiEnd || !trimmed.includes(multiEnd) || trimmed.indexOf(multiStart) === trimmed.lastIndexOf(multiEnd)) {
        if (!multiEnd || trimmed.indexOf(multiStart) < (trimmed.indexOf(multiEnd) ?? Infinity)) {
          inMulti = true;
        }
      }
      continue;
    }

    if (single && trimmed.startsWith(single)) {
      comments++;
      continue;
    }

    code++;
  }

  return { lines: total, code, comments, blanks };
}

export async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function readTextSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export { EXT_TO_LANG };
