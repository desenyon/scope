import type { SecurityInfo } from "../types.ts";
import type { ProjectIndex } from "../core/index.ts";
import type { ManifestBundle } from "../core/manifests.ts";

const LOCKFILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb",
  "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock", "Gemfile.lock", "go.sum",
];

const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]/i,
  /secret[_-]?key\s*[:=]/i,
  /password\s*[:=]/i,
  /private[_-]?key\s*[:=]/i,
  /aws[_-]?access/i,
  /BEGIN (RSA |EC )?PRIVATE KEY/,
];

const ENV_FILES = [".env", ".env.local", ".env.development", ".env.production", ".env.example"];

export async function scanSecurity(index: ProjectIndex, manifests: ManifestBundle): Promise<SecurityInfo> {
  const info: SecurityInfo = { envFiles: [], hasLockfile: false, lockfiles: [], secretsPatterns: 0 };

  for (const env of ENV_FILES) {
    if (manifests.paths.has(env)) info.envFiles.push(env);
  }

  for (const lock of LOCKFILES) {
    if (manifests.paths.has(lock)) {
      info.hasLockfile = true;
      info.lockfiles.push(lock);
    }
  }

  const configFiles = index.files
    .filter((f) => (f.ext === ".ts" || f.ext === ".js" || f.ext === ".py" || f.ext === ".yaml") && f.size < 500_000)
    .slice(0, 80);

  const results = await Promise.all(
    configFiles.map(async (f) => {
      if (f.relPath.includes(".example")) return false;
      try {
        const content = await Bun.file(f.absPath).text();
        return SECRET_PATTERNS.some((p) => p.test(content));
      } catch {
        return false;
      }
    })
  );

  info.secretsPatterns = results.filter(Boolean).length;
  return info;
}
