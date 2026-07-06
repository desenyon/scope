import { join } from "node:path";
import { readFile } from "node:fs/promises";

export interface ManifestBundle {
  packageJson: Record<string, unknown> | null;
  cargoToml: string | null;
  pyprojectToml: string | null;
  goMod: string | null;
  gemfile: string | null;
  readme: string | null;
  tsconfig: string | null;
  paths: Map<string, string>;
}

const MANIFEST_FILES = [
  "package.json", "Cargo.toml", "pyproject.toml", "go.mod", "Gemfile",
  "README.md", "readme.md", "tsconfig.json", "pnpm-workspace.yaml",
  "lerna.json", "turbo.json", "turbo.jsonc", "nx.json",
  ".nvmrc", ".node-version", ".python-version", ".ruby-version", ".tool-versions",
  "requirements.txt", "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".gitlab-ci.yml", "Jenkinsfile", "Makefile", "makefile",
  "vercel.json", "netlify.toml", "fly.toml", "render.yaml",
  "LICENSE", "LICENSE.md",
  ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.ts",
  ".prettierrc", ".prettierrc.js", ".prettierrc.json", "prettier.config.js",
  "biome.json", ".editorconfig", "jest.config.js", "jest.config.ts",
  "vitest.config.ts", "vitest.config.js", ".coveragerc", "codecov.yml",
  ".env", ".env.local", ".env.development", ".env.production", ".env.example",
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb",
  "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock", "Gemfile.lock", "go.sum",
];

export async function loadManifests(root: string): Promise<ManifestBundle> {
  const paths = new Map<string, string>();

  await Promise.all(
    MANIFEST_FILES.map(async (file) => {
      try {
        const content = await readFile(join(root, file), "utf-8");
        paths.set(file, content);
      } catch { /* not present */ }
    })
  );

  let packageJson: Record<string, unknown> | null = null;
  const pkgContent = paths.get("package.json");
  if (pkgContent) {
    try {
      packageJson = JSON.parse(pkgContent) as Record<string, unknown>;
    } catch { /* invalid */ }
  }

  return {
    packageJson,
    cargoToml: paths.get("Cargo.toml") ?? null,
    pyprojectToml: paths.get("pyproject.toml") ?? null,
    goMod: paths.get("go.mod") ?? null,
    gemfile: paths.get("Gemfile") ?? null,
    readme: paths.get("README.md") ?? paths.get("readme.md") ?? null,
    tsconfig: paths.get("tsconfig.json") ?? null,
    paths,
  };
}

export function manifestExists(bundle: ManifestBundle, file: string): boolean {
  return bundle.paths.has(file);
}
