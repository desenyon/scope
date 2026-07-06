import type { QualityInfo } from "../types.ts";
import type { ManifestBundle } from "../core/manifests.ts";
import { manifestExists } from "../core/manifests.ts";

const LINTER_FILES: Record<string, string> = {
  ".eslintrc": "ESLint", ".eslintrc.js": "ESLint", ".eslintrc.cjs": "ESLint",
  ".eslintrc.json": "ESLint", "eslint.config.js": "ESLint",
  "eslint.config.mjs": "ESLint", "eslint.config.ts": "ESLint",
  ".pylintrc": "Pylint", "ruff.toml": "Ruff", ".rubocop.yml": "RuboCop",
  "clippy.toml": "Clippy", ".golangci.yml": "golangci-lint",
};

const FORMATTER_FILES: Record<string, string> = {
  ".prettierrc": "Prettier", ".prettierrc.js": "Prettier", ".prettierrc.json": "Prettier",
  "prettier.config.js": "Prettier", "biome.json": "Biome", ".editorconfig": "EditorConfig",
  "rustfmt.toml": "rustfmt",
};

export function scanQuality(manifests: ManifestBundle): QualityInfo {
  const info: QualityInfo = { linters: [], formatters: [], typescript: false };

  for (const [file, name] of Object.entries(LINTER_FILES)) {
    if (manifestExists(manifests, file) && !info.linters.includes(name)) info.linters.push(name);
  }

  for (const [file, name] of Object.entries(FORMATTER_FILES)) {
    if (manifestExists(manifests, file) && !info.formatters.includes(name)) info.formatters.push(name);
  }

  if (manifests.tsconfig) {
    info.typescript = true;
    try {
      const parsed = JSON.parse(manifests.tsconfig);
      info.typescriptStrict = parsed.compilerOptions?.strict === true;
    } catch { /* skip */ }
  }

  if (manifestExists(manifests, "jsconfig.json")) info.typescript = true;

  return info;
}
