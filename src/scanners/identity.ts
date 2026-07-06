import type { ProjectIdentity, RuntimeInfo, MonorepoInfo } from "../types.ts";
import type { ManifestBundle } from "../core/manifests.ts";
import { manifestExists } from "../core/manifests.ts";

export function scanIdentity(manifests: ManifestBundle): ProjectIdentity {
  const identity: ProjectIdentity = { authors: [] };
  const pkg = manifests.packageJson as {
    name?: string; description?: string; version?: string; license?: string;
    author?: string | { name: string }; contributors?: { name: string }[];
    repository?: string | { url: string };
  } | null;

  if (pkg) {
    if (pkg.name) identity.name = pkg.name;
    if (pkg.description) identity.description = pkg.description;
    if (pkg.version) identity.version = pkg.version;
    if (pkg.license) identity.license = typeof pkg.license === "string" ? pkg.license : undefined;
    if (pkg.author) identity.authors.push(typeof pkg.author === "string" ? pkg.author : pkg.author.name);
    if (pkg.contributors) identity.authors.push(...pkg.contributors.map((c) => c.name));
    if (pkg.repository) identity.repository = typeof pkg.repository === "string" ? pkg.repository : pkg.repository.url;
  }

  if (manifests.cargoToml && !identity.name) {
    const nameMatch = manifests.cargoToml.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = manifests.cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
    const descMatch = manifests.cargoToml.match(/^description\s*=\s*"([^"]+)"/m);
    if (nameMatch) identity.name = nameMatch[1];
    if (versionMatch) identity.version = versionMatch[1];
    if (descMatch) identity.description = descMatch[1];
  }

  if (manifests.pyprojectToml && !identity.name) {
    const nameMatch = manifests.pyprojectToml.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = manifests.pyprojectToml.match(/version\s*=\s*"([^"]+)"/);
    if (nameMatch) identity.name = nameMatch[1];
    if (versionMatch) identity.version = versionMatch[1];
  }

  if (manifests.goMod && !identity.name) {
    const moduleMatch = manifests.goMod.match(/^module\s+(\S+)/m);
    if (moduleMatch) identity.name = moduleMatch[1].split("/").pop();
  }

  if (manifests.readme && !identity.name) {
    const titleMatch = manifests.readme.match(/^#\s+(.+)/m);
    if (titleMatch) identity.name = titleMatch[1].trim();
  }

  const licenseFile = manifests.paths.get("LICENSE") ?? manifests.paths.get("LICENSE.md");
  if (licenseFile && !identity.license) {
    const spdx = licenseFile.match(/MIT|Apache|GPL|BSD|ISC|Unlicense/i);
    if (spdx) identity.license = spdx[0].toUpperCase();
  }

  return identity;
}

export function scanRuntimes(manifests: ManifestBundle): RuntimeInfo[] {
  const runtimes: RuntimeInfo[] = [];
  const pkg = manifests.packageJson as { engines?: { node?: string; npm?: string; bun?: string } } | null;

  const nvmrc = manifests.paths.get(".nvmrc");
  if (nvmrc) runtimes.push({ name: "Node.js", version: nvmrc.trim(), source: ".nvmrc" });

  const nodeVersion = manifests.paths.get(".node-version");
  if (nodeVersion) runtimes.push({ name: "Node.js", version: nodeVersion.trim(), source: ".node-version" });

  if (pkg?.engines?.node) runtimes.push({ name: "Node.js", version: pkg.engines.node, source: "package.json engines" });
  if (pkg?.engines?.bun) runtimes.push({ name: "Bun", version: pkg.engines.bun, source: "package.json engines" });

  const pythonVersion = manifests.paths.get(".python-version");
  if (pythonVersion) runtimes.push({ name: "Python", version: pythonVersion.trim(), source: ".python-version" });

  if (manifests.pyprojectToml) {
    const pyMatch = manifests.pyprojectToml.match(/requires-python\s*=\s*"([^"]+)"/);
    if (pyMatch) runtimes.push({ name: "Python", version: pyMatch[1], source: "pyproject.toml" });
  }

  if (manifests.goMod) {
    const goMatch = manifests.goMod.match(/^go\s+(\S+)/m);
    if (goMatch) runtimes.push({ name: "Go", version: goMatch[1], source: "go.mod" });
  }

  if (manifests.cargoToml) {
    const editionMatch = manifests.cargoToml.match(/^edition\s*=\s*"([^"]+)"/m);
    const msrvMatch = manifests.cargoToml.match(/rust-version\s*=\s*"([^"]+)"/);
    if (editionMatch) runtimes.push({ name: "Rust", version: `edition ${editionMatch[1]}`, source: "Cargo.toml" });
    if (msrvMatch) runtimes.push({ name: "Rust", version: msrvMatch[1], source: "Cargo.toml rust-version" });
  }

  const toolVersions = manifests.paths.get(".tool-versions");
  if (toolVersions) {
    for (const line of toolVersions.split("\n")) {
      const [tool, ver] = line.trim().split(/\s+/);
      if (tool && ver) runtimes.push({ name: tool, version: ver, source: ".tool-versions" });
    }
  }

  const rubyVersion = manifests.paths.get(".ruby-version");
  if (rubyVersion) runtimes.push({ name: "Ruby", version: rubyVersion.trim(), source: ".ruby-version" });

  return runtimes;
}

export function scanMonorepo(manifests: ManifestBundle): MonorepoInfo {
  const info: MonorepoInfo = { isMonorepo: false, packages: 0 };
  const pkg = manifests.packageJson as { workspaces?: string[] | { packages: string[] } } | null;

  if (pkg?.workspaces) {
    info.isMonorepo = true;
    info.tool = "npm/yarn/pnpm workspaces";
    const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages;
    info.packages = patterns.length;
  }

  if (manifestExists(manifests, "pnpm-workspace.yaml")) {
    info.isMonorepo = true;
    info.tool = "pnpm";
    const content = manifests.paths.get("pnpm-workspace.yaml") ?? "";
    info.packages = content.split("\n").filter((l) => l.trim().startsWith("- ")).length;
  }

  if (manifestExists(manifests, "lerna.json")) {
    info.isMonorepo = true;
    info.tool = "lerna";
  }

  if (manifestExists(manifests, "turbo.json") || manifestExists(manifests, "turbo.jsonc")) {
    info.isMonorepo = true;
    info.tool = info.tool ? `${info.tool} + turborepo` : "turborepo";
  }

  if (manifestExists(manifests, "nx.json")) {
    info.isMonorepo = true;
    info.tool = info.tool ? `${info.tool} + nx` : "nx";
  }

  return info;
}

const PM_LOCKFILES: Record<string, string> = {
  "bun.lock": "bun", "bun.lockb": "bun", "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn", "package-lock.json": "npm", "poetry.lock": "poetry",
  "Pipfile.lock": "pipenv", "uv.lock": "uv", "Cargo.lock": "cargo",
  "go.sum": "go modules", "Gemfile.lock": "bundler",
};

export function detectPackageManagers(manifests: ManifestBundle): string[] {
  const managers: string[] = [];
  for (const [file, pm] of Object.entries(PM_LOCKFILES)) {
    if (manifestExists(manifests, file)) managers.push(pm);
  }
  return managers;
}
