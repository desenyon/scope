import type { DocumentationInfo } from "../types.ts";
import type { ProjectIndex } from "../core/index.ts";
import type { ManifestBundle } from "../core/manifests.ts";

export function scanDocumentation(index: ProjectIndex, manifests: ManifestBundle): DocumentationInfo {
  const info: DocumentationInfo = { hasReadme: false, hasDocsFolder: false, docFiles: 0 };

  const readme = manifests.readme;
  if (readme) {
    info.hasReadme = true;
    info.readmeLines = readme.split("\n").length;
  }

  const docFiles = index.files.filter(
    (f) => f.relPath.startsWith("docs/") && (f.ext === ".md" || f.ext === ".mdx")
  );
  if (docFiles.length > 0 || index.files.some((f) => f.relPath === "docs")) {
    info.hasDocsFolder = true;
    info.docFiles = docFiles.length;
  }

  return info;
}
