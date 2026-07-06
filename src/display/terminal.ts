import type { ScopeReport } from "../types.ts";

// Beautiful terminal styling without external deps

const supportsColor = process.stdout.isTTY ?? false;

const palette = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Gradient-inspired accent colors
  violet: "\x1b[38;5;141m",
  purple: "\x1b[38;5;135m",
  blue: "\x1b[38;5;39m",
  cyan: "\x1b[38;5;51m",
  teal: "\x1b[38;5;43m",
  green: "\x1b[38;5;82m",
  yellow: "\x1b[38;5;220m",
  orange: "\x1b[38;5;208m",
  red: "\x1b[38;5;203m",
  pink: "\x1b[38;5;212m",
  white: "\x1b[38;5;255m",
  gray: "\x1b[38;5;245m",
  darkGray: "\x1b[38;5;240m",
};

function c(text: string, ...styles: string[]): string {
  if (!supportsColor) return text;
  return styles.join("") + text + palette.reset;
}

function gradientText(text: string): string {
  if (!supportsColor) return text;
  const colors = [palette.violet, palette.purple, palette.blue, palette.cyan];
  return text
    .split("")
    .map((ch, i) => colors[i % colors.length] + ch)
    .join("") + palette.reset;
}

function bar(ratio: number, width = 24): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return c("█".repeat(filled), palette.cyan) + c("░".repeat(empty), palette.darkGray);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function box(title: string, lines: string[], color = palette.violet): string {
  const innerWidth = Math.max(title.length + 2, ...lines.map((l) => stripAnsi(l).length));
  const top = c("╭" + "─".repeat(innerWidth + 2) + "╮", color);
  const header = c("│ ", color) + c(title, palette.bold, palette.white) + " ".repeat(innerWidth - title.length) + c(" │", color);
  const sep = c("├" + "─".repeat(innerWidth + 2) + "┤", color);
  const body = lines.map((l) => {
    const visible = stripAnsi(l);
    const padding = innerWidth - visible.length;
    return c("│ ", color) + l + " ".repeat(Math.max(0, padding)) + c(" │", color);
  });
  const bottom = c("╰" + "─".repeat(innerWidth + 2) + "╯", color);
  return [top, header, sep, ...body, bottom].join("\n");
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function sectionHeader(title: string, icon: string): string {
  return "\n" + c(`  ${icon}  `, palette.cyan) + c(title, palette.bold, palette.white) + "\n" + c("  " + "─".repeat(40), palette.darkGray);
}

export function renderTerminal(report: ScopeReport): string {
  const lines: string[] = [];
  const width = 64;

  // Banner
  lines.push("");
  lines.push(c("  ╔" + "═".repeat(width) + "╗", palette.violet));
  lines.push(c("  ║", palette.violet) + gradientText(pad("  S C O P E", width)) + c("║", palette.violet));
  lines.push(c("  ║", palette.violet) + c(pad("  Project Intelligence", width), palette.gray, palette.italic) + c("║", palette.violet));
  lines.push(c("  ╚" + "═".repeat(width) + "╝", palette.violet));
  lines.push("");

  // Project identity
  const name = report.identity.name ?? "Unknown Project";
  const identityLines = [
    c("Name", palette.gray) + "        " + c(name, palette.bold, palette.white),
    report.identity.version ? c("Version", palette.gray) + "     " + c(`v${report.identity.version}`, palette.cyan) : "",
    report.identity.description ? c("About", palette.gray) + "       " + c(truncate(report.identity.description, 48), palette.gray) : "",
    report.identity.license ? c("License", palette.gray) + "     " + c(report.identity.license, palette.yellow) : "",
    report.monorepo.isMonorepo ? c("Monorepo", palette.gray) + "    " + c(`${report.monorepo.tool} (${report.monorepo.packages} packages)`, palette.purple) : "",
  ].filter(Boolean);

  lines.push(box("PROJECT", identityLines, palette.purple));
  lines.push("");

  // Key metrics row
  const metrics = [
    { label: "Code Lines", value: formatNumber(report.totalCode), color: palette.cyan },
    { label: "Total Lines", value: formatNumber(report.totalLines), color: palette.blue },
    { label: "Files", value: formatNumber(report.totalFiles), color: palette.green },
    { label: "Languages", value: String(report.languages.length), color: palette.violet },
    { label: "Dependencies", value: formatNumber(report.dependencyCount), color: palette.orange },
    { label: "Frameworks", value: String(report.frameworks.length), color: palette.pink },
  ];

  const metricRows = [
    metrics.map((m) => c(pad(m.value, 12), palette.bold, m.color)).join(""),
    metrics.map((m) => c(pad(m.label, 12), palette.dim, palette.gray)).join(""),
  ];
  lines.push("  " + metricRows[0]);
  lines.push("  " + metricRows[1]);
  lines.push("");
  lines.push(c(`  Analyzed in ${report.durationMs}ms`, palette.dim, palette.gray) + c(` · loc: ${report.locEngine} · files: ${report.listEngine}`, palette.dim, palette.darkGray));
  lines.push("");

  // Languages table
  lines.push(sectionHeader("Languages", "◆"));
  const maxCode = report.languages[0]?.code ?? 1;
  const langHeader = "  " + pad("Language", 16) + pad("Files", 8) + pad("Code", 10) + "Distribution";
  lines.push(c(langHeader, palette.dim, palette.gray));
  for (const lang of report.languages.slice(0, 12)) {
    const ratio = lang.code / maxCode;
    const row =
      "  " +
      c(pad(lang.language, 16), palette.white) +
      c(pad(String(lang.files), 8), palette.gray) +
      c(pad(formatNumber(lang.code), 10), palette.cyan) +
      " " + bar(ratio, 20) +
      c(` ${Math.round((lang.code / report.totalCode) * 100)}%`, palette.dim, palette.gray);
    lines.push(row);
  }
  if (report.languages.length > 12) {
    lines.push(c(`  ... +${report.languages.length - 12} more languages`, palette.dim, palette.gray));
  }

  // Frameworks
  if (report.frameworks.length > 0) {
    lines.push(sectionHeader("Frameworks & Stack", "◆"));
    const byCategory = groupBy(report.frameworks, (f) => f.category);
    for (const [category, items] of Object.entries(byCategory)) {
      const tags = items
        .map((f) => {
          const ver = f.version ? c(`@${f.version}`, palette.dim, palette.gray) : "";
          return c(f.name, palette.bold, palette.cyan) + ver;
        })
        .join(c(" · ", palette.darkGray));
      lines.push("  " + c(category, palette.yellow) + "  " + tags);
    }
  }

  // Runtimes
  if (report.runtimes.length > 0) {
    lines.push(sectionHeader("Runtimes", "◆"));
    for (const rt of report.runtimes) {
      lines.push("  " + c(rt.name, palette.bold, palette.green) + c(` ${rt.version}`, palette.cyan) + c(` (${rt.source})`, palette.dim, palette.gray));
    }
  }

  // Package managers
  if (report.packageManagers.length > 0) {
    lines.push(sectionHeader("Package Managers", "◆"));
    lines.push("  " + report.packageManagers.map((p) => c(p, palette.bold, palette.orange)).join(c(" · ", palette.darkGray)));
  }

  // Top dependencies
  if (report.dependencies.length > 0) {
    lines.push(sectionHeader("Dependencies", "◆"));
    const prod = report.dependencies.filter((d) => d.type === "production").slice(0, 15);
    for (const dep of prod) {
      lines.push(
        "  " + c(dep.name, palette.white) + c(` ${dep.version}`, palette.cyan) + c(` [${dep.ecosystem}]`, palette.dim, palette.gray)
      );
    }
    if (report.dependencies.length > 15) {
      lines.push(c(`  ... +${report.dependencies.length - 15} more`, palette.dim, palette.gray));
    }
  }

  // Git
  if (report.git.isRepo) {
    lines.push(sectionHeader("Git", "◆"));
    const gitLines = [
      report.git.branch ? c("Branch", palette.gray) + "       " + c(report.git.branch, palette.green) : "",
      report.git.remote ? c("Remote", palette.gray) + "       " + c(truncate(report.git.remote, 50), palette.gray) : "",
      report.git.commitCount !== undefined ? c("Commits", palette.gray) + "      " + c(formatNumber(report.git.commitCount), palette.cyan) : "",
      report.git.contributors !== undefined ? c("Contributors", palette.gray) + " " + c(String(report.git.contributors), palette.cyan) : "",
      report.git.lastCommit ? c("Last commit", palette.gray) + " " + c(truncate(report.git.lastCommit, 45), palette.white) : "",
      report.git.dirty ? c("  ⚠ Working tree has uncommitted changes", palette.yellow) : "",
    ].filter(Boolean);
    lines.push(gitLines.map((l) => "  " + l).join("\n"));
  }

  // DevOps
  lines.push(sectionHeader("DevOps & Deploy", "◆"));
  const devopsTags: string[] = [];
  if (report.devops.docker) devopsTags.push(c("Docker", palette.bold, palette.blue));
  if (report.devops.dockerCompose) devopsTags.push(c("Docker Compose", palette.bold, palette.blue));
  if (report.devops.kubernetes) devopsTags.push(c("Kubernetes", palette.bold, palette.purple));
  if (report.devops.terraform) devopsTags.push(c("Terraform", palette.bold, palette.orange));
  if (report.devops.makefile) devopsTags.push(c("Makefile", palette.bold, palette.gray));
  if (report.devops.ci.length) devopsTags.push(...report.devops.ci.map((c2) => c(c2, palette.bold, palette.green)));
  lines.push("  " + (devopsTags.length ? devopsTags.join(c(" · ", palette.darkGray)) : c("None detected", palette.dim, palette.gray)));

  // Testing
  lines.push(sectionHeader("Testing", "◆"));
  lines.push(
    "  " +
      c(`${report.testing.testFiles} test files`, palette.cyan) +
      (report.testing.frameworks.length ? c(` · ${report.testing.frameworks.join(", ")}`, palette.white) : "") +
      (report.testing.coverageConfig ? c(" · coverage configured", palette.green) : "")
  );

  // Quality
  lines.push(sectionHeader("Code Quality", "◆"));
  const qualityParts: string[] = [];
  if (report.quality.typescript) qualityParts.push(c("TypeScript" + (report.quality.typescriptStrict ? " (strict)" : ""), palette.bold, palette.blue));
  if (report.quality.linters.length) qualityParts.push(...report.quality.linters.map((l) => c(l, palette.yellow)));
  if (report.quality.formatters.length) qualityParts.push(...report.quality.formatters.map((f) => c(f, palette.green)));
  lines.push("  " + (qualityParts.length ? qualityParts.join(c(" · ", palette.darkGray)) : c("None detected", palette.dim, palette.gray)));

  // Security
  lines.push(sectionHeader("Security", "◆"));
  const secParts: string[] = [];
  secParts.push(report.security.hasLockfile ? c("Lockfile present", palette.green) : c("No lockfile", palette.yellow));
  if (report.security.envFiles.length) secParts.push(c(`Env files: ${report.security.envFiles.join(", ")}`, palette.orange));
  if (report.security.secretsPatterns > 0) secParts.push(c(`${report.security.secretsPatterns} potential secret patterns`, palette.red));
  lines.push("  " + secParts.join(c(" · ", palette.darkGray)));

  // Documentation
  lines.push(sectionHeader("Documentation", "◆"));
  lines.push(
    "  " +
      (report.documentation.hasReadme ? c(`README (${report.documentation.readmeLines} lines)`, palette.green) : c("No README", palette.yellow)) +
      (report.documentation.hasDocsFolder ? c(` · docs/ (${report.documentation.docFiles} files)`, palette.cyan) : "")
  );

  // Health & codebase
  lines.push(sectionHeader("Project Health", "◆"));
  const healthBar = bar(report.health.score / 100, 20);
  lines.push("  " + c(`Score ${report.health.score}/100 `, palette.bold, palette.white) + healthBar);
  const failed = report.health.signals.filter((s) => !s.ok).map((s) => s.label);
  if (failed.length) lines.push(c("  Missing: " + failed.join(", "), palette.dim, palette.gray));

  if (report.codebase.primaryLanguage) {
    lines.push(sectionHeader("Codebase", "◆"));
    lines.push(
      "  " +
        c(report.codebase.primaryLanguage, palette.bold, palette.cyan) +
        c(` (${report.codebase.primaryLanguagePct}% of code)`, palette.gray) +
        c(` · ${report.codebase.repoSizeHuman}`, palette.white) +
        (report.codebase.todoCount ? c(` · ${report.codebase.todoCount} TODOs`, palette.yellow) : "") +
        (report.codebase.fixmeCount ? c(` · ${report.codebase.fixmeCount} FIXMEs`, palette.orange) : "")
    );
    if (report.git.repoAgeDays !== undefined) {
      lines.push(c(`  Repo age: ${report.git.repoAgeDays} days`, palette.dim, palette.gray));
    }
  }

  if (report.database.systems.length || report.database.hasMigrations) {
    lines.push(sectionHeader("Database", "◆"));
    lines.push("  " + (report.database.systems.length ? report.database.systems.map((d) => c(d, palette.blue)).join(c(" · ", palette.darkGray)) : c("None detected", palette.dim, palette.gray)));
    if (report.database.hasMigrations) lines.push(c("  Migrations: " + report.database.migrationPaths.join(", "), palette.gray));
  }

  if (report.routes.total > 0) {
    lines.push(sectionHeader("Routes", "◆"));
    lines.push(
      "  " +
        c(`${report.routes.apiRoutes} API`, palette.cyan) +
        c(` · ${report.routes.pageRoutes} pages`, palette.white) +
        (report.routes.components ? c(` · ${report.routes.components} components`, palette.gray) : "")
    );
  }

  if (report.architecture.patterns.length) {
    lines.push(sectionHeader("Architecture", "◆"));
    lines.push("  " + report.architecture.patterns.map((p) => c(p, palette.purple)).join(c(" · ", palette.darkGray)));
  }

  if (report.scripts.count > 0) {
    lines.push(sectionHeader("Scripts", "◆"));
    const flags = [
      report.scripts.hasDev && "dev",
      report.scripts.hasBuild && "build",
      report.scripts.hasTest && "test",
      report.scripts.hasLint && "lint",
    ].filter(Boolean);
    lines.push("  " + c(`${report.scripts.count} npm scripts`, palette.white) + (flags.length ? c(` · ${flags.join(", ")}`, palette.gray) : ""));
  }

  if (report.codebase.dockerServices.length) {
    lines.push(sectionHeader("Docker Services", "◆"));
    lines.push("  " + report.codebase.dockerServices.map((s) => c(s, palette.blue)).join(c(" · ", palette.darkGray)));
  }

  // Structure
  lines.push(sectionHeader("Structure", "◆"));
  lines.push(
    "  " +
      c(`${formatNumber(report.structure.totalFiles)} files`, palette.white) +
      c(` · ${formatNumber(report.structure.totalDirectories)} directories`, palette.gray) +
      c(` · depth ${report.structure.depth}`, palette.gray)
  );
  if (report.structure.largestFiles.length > 0) {
    lines.push(c("  Largest files:", palette.dim, palette.gray));
    for (const f of report.structure.largestFiles.slice(0, 5)) {
      lines.push("    " + c(pad(f.path, 40), palette.gray) + c(formatNumber(f.lines) + " lines", palette.cyan));
    }
  }

  lines.push("");
  lines.push(c("  ─".repeat(32), palette.darkGray));
  lines.push(c(`  ${report.path}`, palette.dim, palette.gray));
  lines.push("");

  return lines.join("\n");
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}
