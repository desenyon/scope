import { resolve } from "node:path";
import type { AnalyzeOptions, ScopeReport } from "./types.ts";
import { buildProjectIndex } from "./core/index.ts";
import { loadManifests } from "./core/manifests.ts";
import { detectTools } from "./core/tools.ts";
import { countLocTokei, countLocNative } from "./scanners/loc.ts";
import {
  scanIdentity, scanRuntimes, scanMonorepo, detectPackageManagers,
} from "./scanners/identity.ts";
import { scanDependencies } from "./scanners/dependencies.ts";
import { scanFrameworks } from "./scanners/frameworks.ts";
import { scanGit } from "./scanners/git.ts";
import { scanStructure } from "./scanners/structure.ts";
import { scanDevOps } from "./scanners/devops.ts";
import { scanTesting } from "./scanners/testing.ts";
import { scanQuality } from "./scanners/quality.ts";
import { scanSecurity } from "./scanners/security.ts";
import { scanDocumentation } from "./scanners/documentation.ts";

export async function analyze(options: AnalyzeOptions): Promise<ScopeReport> {
  const start = performance.now();
  const path = resolve(options.path);

  // Phase 1: parallel I/O — single index build, manifests, git, tokei
  const [index, manifests, git, tokeiLoc, tools] = await Promise.all([
    buildProjectIndex(path),
    loadManifests(path),
    scanGit(path),
    countLocTokei(path),
    detectTools(),
  ]);

  // Phase 2: LOC fallback + structure (needs index) in parallel with sync scanners
  const loc = tokeiLoc
    ? { ...tokeiLoc, engine: "tokei" as const }
    : { ...(await countLocNative(index)), engine: "native" as const };

  const [structure, security] = await Promise.all([
    scanStructure(index),
    scanSecurity(index, manifests),
  ]);

  // Phase 3: sync scanners (CPU-only, instant)
  const identity = scanIdentity(manifests);
  const runtimes = scanRuntimes(manifests);
  const monorepo = scanMonorepo(manifests);
  const packageManagers = detectPackageManagers(manifests);
  const dependencies = scanDependencies(manifests);
  const devops = scanDevOps(index, manifests);
  const quality = scanQuality(manifests);
  const documentation = scanDocumentation(index, manifests);

  const depNames = new Set(dependencies.map((d) => d.name));
  const frameworks = scanFrameworks(manifests, depNames);
  const testing = scanTesting(index, manifests, depNames);

  if (!identity.name) identity.name = path.split("/").pop();

  return {
    path,
    analyzedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - start),
    identity,
    languages: loc.languages,
    totalLines: loc.totalLines,
    totalCode: loc.totalCode,
    totalFiles: loc.totalFiles,
    frameworks,
    runtimes,
    dependencies,
    dependencyCount: dependencies.length,
    git,
    devops,
    testing,
    quality,
    security,
    documentation,
    monorepo,
    structure,
    packageManagers,
    locEngine: loc.engine,
    listEngine: index.listEngine,
    tools: { tokei: tools.tokei, fd: tools.fd, rg: tools.rg },
  };
}
