import type { DependencyInfo } from "../types.ts";
import type { ManifestBundle } from "../core/manifests.ts";

function addDeps(
  deps: DependencyInfo[],
  record: Record<string, string> | undefined,
  type: DependencyInfo["type"],
  ecosystem: string
): void {
  if (!record) return;
  for (const [name, version] of Object.entries(record)) {
    deps.push({ name, version: version.replace(/^[\^~>=<]*/, ""), type, ecosystem });
  }
}

export function scanDependencies(manifests: ManifestBundle): DependencyInfo[] {
  const deps: DependencyInfo[] = [];
  const pkg = manifests.packageJson as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  } | null;

  if (pkg) {
    addDeps(deps, pkg.dependencies, "production", "npm");
    addDeps(deps, pkg.devDependencies, "development", "npm");
    addDeps(deps, pkg.peerDependencies, "peer", "npm");
    addDeps(deps, pkg.optionalDependencies, "optional", "npm");
  }

  if (manifests.cargoToml) {
    const depSection = manifests.cargoToml.match(/\[dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (depSection) {
      for (const line of depSection[1].split("\n")) {
        const match = line.match(/^(\w[\w-]*)\s*=\s*"([^"]+)"/);
        if (match) deps.push({ name: match[1], version: match[2], type: "production", ecosystem: "cargo" });
      }
    }
  }

  const requirements = manifests.paths.get("requirements.txt");
  if (requirements) {
    for (const line of requirements.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[.*\])?(?:[=<>!~]+(.+))?/);
      if (match) deps.push({ name: match[1], version: match[2] ?? "*", type: "production", ecosystem: "pip" });
    }
  }

  if (manifests.goMod) {
    for (const line of manifests.goMod.split("\n")) {
      const match = line.trim().match(/^(\S+)\s+v(\S+)/);
      if (match && match[1].includes("/")) {
        deps.push({ name: match[1], version: match[2], type: "production", ecosystem: "go" });
      }
    }
  }

  if (manifests.gemfile) {
    for (const line of manifests.gemfile.split("\n")) {
      const match = line.match(/gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/);
      if (match) deps.push({ name: match[1], version: match[2] ?? "*", type: "production", ecosystem: "ruby" });
    }
  }

  return deps;
}
