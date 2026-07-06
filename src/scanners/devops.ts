import type { DevOpsInfo } from "../types.ts";
import type { ProjectIndex } from "../core/index.ts";
import type { ManifestBundle } from "../core/manifests.ts";
import { manifestExists } from "../core/manifests.ts";

export function scanDevOps(index: ProjectIndex, manifests: ManifestBundle): DevOpsInfo {
  const info: DevOpsInfo = {
    docker: false,
    dockerCompose: false,
    ci: [],
    kubernetes: false,
    terraform: false,
    makefile: false,
    githubActions: 0,
  };

  info.docker = manifestExists(manifests, "Dockerfile");
  info.dockerCompose = manifestExists(manifests, "docker-compose.yml") || manifestExists(manifests, "docker-compose.yaml");

  if (index.relSet.has(".github/workflows") || index.files.some((f) => f.relPath.startsWith(".github/workflows/"))) {
    info.ci.push("GitHub Actions");
    info.githubActions = index.files.filter(
      (f) => f.relPath.startsWith(".github/workflows/") && (f.ext === ".yml" || f.ext === ".yaml")
    ).length;
  }

  if (manifestExists(manifests, ".gitlab-ci.yml")) info.ci.push("GitLab CI");
  if (index.files.some((f) => f.relPath === ".circleci/config.yml")) info.ci.push("CircleCI");
  if (manifestExists(manifests, "Jenkinsfile")) info.ci.push("Jenkins");
  info.makefile = manifestExists(manifests, "Makefile") || manifestExists(manifests, "makefile");
  if (manifestExists(manifests, "vercel.json")) info.ci.push("Vercel");
  if (manifestExists(manifests, "netlify.toml")) info.ci.push("Netlify");
  if (manifestExists(manifests, "fly.toml")) info.ci.push("Fly.io");
  if (manifestExists(manifests, "render.yaml")) info.ci.push("Render");

  for (const f of index.files) {
    if (f.ext === ".tf" || f.ext === ".hcl") info.terraform = true;
    if (f.name.match(/deployment\.ya?ml$|service\.ya?ml$|kustomization\.ya?ml$/i)) info.kubernetes = true;
  }

  return info;
}
