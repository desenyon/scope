import type { ScopeReport } from "../types.ts";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function renderMarkdown(report: ScopeReport): string {
  const lines: string[] = [];
  const name = report.identity.name ?? "Unknown Project";

  lines.push(`# Scope Report: ${name}`);
  lines.push("");
  lines.push(`> Generated ${new Date(report.analyzedAt).toLocaleString()} · ${report.durationMs}ms · engine: ${report.locEngine}`);
  lines.push("");
  lines.push(`**Path:** \`${report.path}\``);
  lines.push("");

  // Overview table
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Code Lines | ${formatNumber(report.totalCode)} |`);
  lines.push(`| Total Lines | ${formatNumber(report.totalLines)} |`);
  lines.push(`| Source Files | ${formatNumber(report.totalFiles)} |`);
  lines.push(`| Languages | ${report.languages.length} |`);
  lines.push(`| Dependencies | ${report.dependencyCount} |`);
  lines.push(`| Frameworks | ${report.frameworks.length} |`);
  if (report.identity.version) lines.push(`| Version | ${report.identity.version} |`);
  if (report.identity.license) lines.push(`| License | ${report.identity.license} |`);
  lines.push("");

  if (report.identity.description) {
    lines.push("### Description");
    lines.push("");
    lines.push(report.identity.description);
    lines.push("");
  }

  // Languages
  lines.push("## Languages");
  lines.push("");
  lines.push("| Language | Files | Code | Comments | Blanks | % |");
  lines.push("|----------|------:|-----:|---------:|-------:|--:|");
  for (const lang of report.languages) {
    const pct = report.totalCode > 0 ? Math.round((lang.code / report.totalCode) * 100) : 0;
    lines.push(`| ${lang.language} | ${lang.files} | ${formatNumber(lang.code)} | ${formatNumber(lang.comments)} | ${formatNumber(lang.blanks)} | ${pct}% |`);
  }
  lines.push("");

  // Frameworks
  if (report.frameworks.length > 0) {
    lines.push("## Frameworks & Stack");
    lines.push("");
    lines.push("| Framework | Category | Version | Confidence |");
    lines.push("|-----------|----------|---------|------------|");
    for (const f of report.frameworks) {
      lines.push(`| ${f.name} | ${f.category} | ${f.version ?? "—"} | ${f.confidence} |`);
    }
    lines.push("");
  }

  // Runtimes
  if (report.runtimes.length > 0) {
    lines.push("## Runtimes");
    lines.push("");
    lines.push("| Runtime | Version | Source |");
    lines.push("|---------|---------|--------|");
    for (const rt of report.runtimes) {
      lines.push(`| ${rt.name} | ${rt.version ?? "—"} | ${rt.source} |`);
    }
    lines.push("");
  }

  // Package managers
  if (report.packageManagers.length > 0) {
    lines.push("## Package Managers");
    lines.push("");
    lines.push(report.packageManagers.map((p) => `- ${p}`).join("\n"));
    lines.push("");
  }

  // Dependencies
  if (report.dependencies.length > 0) {
    lines.push("## Dependencies");
    lines.push("");
    lines.push("| Package | Version | Type | Ecosystem |");
    lines.push("|---------|---------|------|-----------|");
    for (const dep of report.dependencies) {
      lines.push(`| ${dep.name} | ${dep.version} | ${dep.type} | ${dep.ecosystem} |`);
    }
    lines.push("");
  }

  // Git
  if (report.git.isRepo) {
    lines.push("## Git");
    lines.push("");
    if (report.git.branch) lines.push(`- **Branch:** ${report.git.branch}`);
    if (report.git.remote) lines.push(`- **Remote:** ${report.git.remote}`);
    if (report.git.commitCount !== undefined) lines.push(`- **Commits:** ${formatNumber(report.git.commitCount)}`);
    if (report.git.contributors !== undefined) lines.push(`- **Contributors:** ${report.git.contributors}`);
    if (report.git.lastCommit) lines.push(`- **Last commit:** ${report.git.lastCommit}`);
    if (report.git.lastCommitDate) lines.push(`- **Last commit date:** ${report.git.lastCommitDate}`);
    if (report.git.dirty) lines.push(`- **Status:** Uncommitted changes`);
    lines.push("");
  }

  // DevOps
  lines.push("## DevOps & Deploy");
  lines.push("");
  lines.push(`- **Docker:** ${report.devops.docker ? "Yes" : "No"}`);
  lines.push(`- **Docker Compose:** ${report.devops.dockerCompose ? "Yes" : "No"}`);
  lines.push(`- **Kubernetes:** ${report.devops.kubernetes ? "Yes" : "No"}`);
  lines.push(`- **Terraform:** ${report.devops.terraform ? "Yes" : "No"}`);
  lines.push(`- **Makefile:** ${report.devops.makefile ? "Yes" : "No"}`);
  if (report.devops.ci.length) lines.push(`- **CI/CD:** ${report.devops.ci.join(", ")}`);
  lines.push("");

  // Testing
  lines.push("## Testing");
  lines.push("");
  lines.push(`- **Test files:** ${report.testing.testFiles}`);
  if (report.testing.frameworks.length) lines.push(`- **Frameworks:** ${report.testing.frameworks.join(", ")}`);
  lines.push(`- **Coverage config:** ${report.testing.coverageConfig ? "Yes" : "No"}`);
  lines.push("");

  // Quality
  lines.push("## Code Quality");
  lines.push("");
  lines.push(`- **TypeScript:** ${report.quality.typescript ? (report.quality.typescriptStrict ? "Yes (strict)" : "Yes") : "No"}`);
  if (report.quality.linters.length) lines.push(`- **Linters:** ${report.quality.linters.join(", ")}`);
  if (report.quality.formatters.length) lines.push(`- **Formatters:** ${report.quality.formatters.join(", ")}`);
  lines.push("");

  // Security
  lines.push("## Security");
  lines.push("");
  lines.push(`- **Lockfile:** ${report.security.hasLockfile ? report.security.lockfiles.join(", ") : "None"}`);
  if (report.security.envFiles.length) lines.push(`- **Env files:** ${report.security.envFiles.join(", ")}`);
  if (report.security.secretsPatterns > 0) lines.push(`- **Potential secret patterns:** ${report.security.secretsPatterns}`);
  lines.push("");

  // Documentation
  lines.push("## Documentation");
  lines.push("");
  lines.push(`- **README:** ${report.documentation.hasReadme ? `Yes (${report.documentation.readmeLines} lines)` : "No"}`);
  lines.push(`- **Docs folder:** ${report.documentation.hasDocsFolder ? `Yes (${report.documentation.docFiles} files)` : "No"}`);
  lines.push("");

  // Structure
  lines.push("## Structure");
  lines.push("");
  lines.push(`- **Total files:** ${formatNumber(report.structure.totalFiles)}`);
  lines.push(`- **Directories:** ${formatNumber(report.structure.totalDirectories)}`);
  lines.push(`- **Max depth:** ${report.structure.depth}`);
  lines.push("");

  if (report.structure.largestFiles.length > 0) {
    lines.push("### Largest Files");
    lines.push("");
    lines.push("| File | Lines | Size |");
    lines.push("|------|------:|-----:|");
    for (const f of report.structure.largestFiles) {
      lines.push(`| \`${f.path}\` | ${formatNumber(f.lines)} | ${formatBytes(f.size)} |`);
    }
    lines.push("");
  }

  // File extensions
  const topExts = Object.entries(report.structure.extensions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (topExts.length > 0) {
    lines.push("### File Extensions");
    lines.push("");
    lines.push("| Extension | Count |");
    lines.push("|-----------|------:|");
    for (const [ext, count] of topExts) {
      lines.push(`| ${ext} | ${count} |`);
    }
    lines.push("");
  }

  // Monorepo
  if (report.monorepo.isMonorepo) {
    lines.push("## Monorepo");
    lines.push("");
    lines.push(`- **Tool:** ${report.monorepo.tool}`);
    lines.push(`- **Packages:** ${report.monorepo.packages}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Report generated by [scope](https://github.com) CLI*`);

  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
