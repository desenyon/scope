import type {
  ScriptsInfo, DatabaseInfo, RoutesInfo, ArchitectureInfo, HealthInfo, CodebaseInfo,
} from "./extras.ts";
import type { ProjectIndex } from "../core/index.ts";
import type { ManifestBundle } from "../core/manifests.ts";
import type { LanguageStats, DevOpsInfo, TestingInfo, DocumentationInfo, SecurityInfo, GitInfo } from "../types.ts";

const DB_DEPS: Record<string, string> = {
  pg: "PostgreSQL", postgres: "PostgreSQL", "@prisma/client": "Prisma",
  mysql: "MySQL", mysql2: "MySQL", sqlite3: "SQLite", "better-sqlite3": "SQLite",
  mongodb: "MongoDB", mongoose: "MongoDB", redis: "Redis", ioredis: "Redis",
  "@supabase/supabase-js": "Supabase", firebase: "Firebase", "@planetscale/database": "PlanetScale",
  "drizzle-orm": "Drizzle", typeorm: "TypeORM", sequelize: "Sequelize", knex: "Knex",
  sqlalchemy: "SQLAlchemy", psycopg2: "PostgreSQL", pymongo: "MongoDB", redis: "Redis",
};

const ORM_DEPS = new Set(["prisma", "@prisma/client", "drizzle-orm", "typeorm", "sequelize", "sqlalchemy", "mongoose", "knex"]);

const MIGRATION_DIRS = ["migrations", "prisma/migrations", "db/migrate", "alembic/versions", "supabase/migrations"];

const API_ROUTE_PATTERNS = [
  /^app\/api\/.+\/route\.[jt]sx?$/,
  /^pages\/api\/.+\.[jt]sx?$/,
  /^src\/routes\/.+\.[jt]sx?$/,
  /^src\/api\/.+\.[jt]sx?$/,
  /^routes\/.+\.[jt]sx?$/,
  /^api\/.+\.[jt]sx?$/,
  /^handlers\/.+\.[jt]sx?$/,
];

const PAGE_ROUTE_PATTERNS = [
  /^app\/.+\/page\.[jt]sx?$/,
  /^pages\/.+\.[jt]sx?$/,
  /^src\/pages\/.+\.[jt]sx?$/,
];

const COMPONENT_PATTERNS = [
  /^components\/.+\.[jt]sx?$/,
  /^src\/components\/.+\.[jt]sx?$/,
  /\.(vue|svelte|astro)$/,
];

export function scanScripts(manifests: ManifestBundle): ScriptsInfo {
  const pkg = manifests.packageJson as { scripts?: Record<string, string> } | null;
  const scripts = pkg?.scripts ?? {};
  const keys = Object.keys(scripts);
  const joined = keys.join(" ").toLowerCase();
  return {
    scripts,
    count: keys.length,
    hasBuild: /build|compile/.test(joined),
    hasTest: /test|spec/.test(joined),
    hasLint: /lint|format|check/.test(joined),
    hasDev: /dev|start|serve/.test(joined),
    hasStart: "start" in scripts,
  };
}

export function scanDatabase(index: ProjectIndex, manifests: ManifestBundle, depNames: Set<string>): DatabaseInfo {
  const systems = new Set<string>();
  const orms = new Set<string>();

  for (const [dep, label] of Object.entries(DB_DEPS)) {
    if (depNames.has(dep)) systems.add(label);
  }
  for (const dep of depNames) {
    if (ORM_DEPS.has(dep)) orms.add(dep.replace("@prisma/client", "prisma"));
  }

  if (index.relSet.has("prisma/schema.prisma")) {
    systems.add("Prisma");
    orms.add("prisma");
  }

  const migrationPaths = MIGRATION_DIRS.filter((d) =>
    index.files.some((f) => f.relPath.startsWith(d + "/") || f.relPath === d)
  );

  return {
    systems: [...systems],
    orms: [...orms],
    hasMigrations: migrationPaths.length > 0,
    migrationPaths,
  };
}

export function scanRoutes(index: ProjectIndex): RoutesInfo {
  let apiRoutes = 0;
  let pageRoutes = 0;
  let components = 0;

  for (const f of index.files) {
    const p = f.relPath;
    if (API_ROUTE_PATTERNS.some((r) => r.test(p))) apiRoutes++;
    else if (PAGE_ROUTE_PATTERNS.some((r) => r.test(p))) pageRoutes++;
    if (COMPONENT_PATTERNS.some((r) => r.test(p))) components++;
  }

  return { apiRoutes, pageRoutes, components, total: apiRoutes + pageRoutes };
}

export function scanArchitecture(index: ProjectIndex): ArchitectureInfo {
  const topLevel = new Set<string>();
  const patterns: string[] = [];

  for (const f of index.files) {
    const first = f.relPath.split("/")[0];
    if (first && !first.startsWith(".")) topLevel.add(first);
  }

  const dirs = [...topLevel];
  const hasAppRouter = index.files.some((f) => /^app\/.+\/page\.[jt]sx?$/.test(f.relPath));
  const hasPagesRouter = index.files.some((f) => /^pages\/.+\.[jt]sx?$/.test(f.relPath));
  const hasSrcLayout = dirs.includes("src");

  if (hasAppRouter) patterns.push("Next.js App Router");
  if (hasPagesRouter) patterns.push("Pages Router");
  if (dirs.includes("controllers") || dirs.includes("models") || dirs.includes("views")) patterns.push("MVC");
  if (dirs.includes("domain") && dirs.includes("infrastructure")) patterns.push("Clean Architecture");
  if (dirs.includes("packages") || dirs.includes("apps")) patterns.push("Monorepo layout");
  if (dirs.includes("cmd") && dirs.includes("internal")) patterns.push("Go standard layout");
  if (dirs.includes("lib") && dirs.includes("bin")) patterns.push("Ruby gem layout");
  if (index.files.some((f) => f.relPath.startsWith("src/handlers/"))) patterns.push("Handler pattern");

  return { patterns, topLevelDirs: dirs.sort(), hasSrcLayout, hasAppRouter, hasPagesRouter };
}

export function scanHealth(
  manifests: ManifestBundle,
  index: ProjectIndex,
  ctx: {
    git: GitInfo;
    devops: DevOpsInfo;
    testing: TestingInfo;
    documentation: DocumentationInfo;
    security: SecurityInfo;
  }
): HealthInfo {
  const signals = [
    { label: "README", ok: ctx.documentation.hasReadme },
    { label: "License", ok: manifests.paths.has("LICENSE") || manifests.paths.has("LICENSE.md") },
    { label: "Lockfile", ok: ctx.security.hasLockfile },
    { label: "CI/CD", ok: ctx.devops.ci.length > 0 },
    { label: "Tests", ok: ctx.testing.testFiles > 0 },
    { label: "Git repo", ok: ctx.git.isRepo },
    { label: "Contributing guide", ok: index.relSet.has("CONTRIBUTING.md") },
    { label: "Changelog", ok: index.relSet.has("CHANGELOG.md") },
    { label: "EditorConfig", ok: manifests.paths.has(".editorconfig") },
    { label: "Env example", ok: manifests.paths.has(".env.example") },
  ];

  const score = Math.round((signals.filter((s) => s.ok).length / signals.length) * 100);
  return { score, signals };
}

export async function scanCodebase(
  root: string,
  index: ProjectIndex,
  languages: LanguageStats[],
  manifests: ManifestBundle
): Promise<CodebaseInfo> {
  const repoSizeBytes = index.files.reduce((s, f) => s + f.size, 0);

  let todoCount = 0;
  let fixmeCount = 0;
  let hackCount = 0;

  try {
    const proc = Bun.spawn(
      ["rg", "-o", "\\b(TODO|FIXME|HACK)\\b", root, "-g", "!node_modules", "-g", "!.git", "-g", "!dist", "-g", "!build"],
      { stdout: "pipe", stderr: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    if ((await proc.exited) === 0) {
      for (const line of output.split("\n").filter(Boolean)) {
        if (line === "TODO") todoCount++;
        else if (line === "FIXME") fixmeCount++;
        else if (line === "HACK") hackCount++;
      }
    }
  } catch { /* rg unavailable */ }

  const primary = languages[0];
  const totalCode = languages.reduce((s, l) => s + l.code, 0);
  const envExample = manifests.paths.get(".env.example") ?? "";
  const envVarCount = envExample
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("=")).length;

  const dockerServices: string[] = [];
  const compose = manifests.paths.get("docker-compose.yml") ?? manifests.paths.get("docker-compose.yaml") ?? "";
  if (compose) {
    for (const line of compose.split("\n")) {
      const m = line.match(/^  (\w[\w-]*):$/);
      if (m && !["version", "services", "volumes", "networks"].includes(m[1])) {
        dockerServices.push(m[1]);
      }
    }
  }

  return {
    repoSizeBytes,
    repoSizeHuman: formatBytes(repoSizeBytes),
    todoCount,
    fixmeCount,
    hackCount,
    primaryLanguage: primary?.language,
    primaryLanguagePct: totalCode > 0 ? Math.round((primary.code / totalCode) * 100) : undefined,
    envVarCount,
    dockerServices,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Re-export types for consumers
export type { ScriptsInfo, DatabaseInfo, RoutesInfo, ArchitectureInfo, HealthInfo, CodebaseInfo };
