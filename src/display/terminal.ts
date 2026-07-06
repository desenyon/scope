import type { ScopeReport } from "../types.ts";
import {
  tty, R, bold, dim, fg, bg, paint, gradient, strip, vis, pad, padL, truncate, fmt, W,
  hr, panel, gradientBar, langColor,
} from "./theme.ts";

// ── Primitives ────────────────────────────────────────────────────────────────

function chip(label: string, color = fg.muted): string {
  return paint(` ${label} `, fg.ink, bg.accent, color);
}

function pill(text: string, color = fg.cyan): string {
  return paint(` ${text} `, color, bg.card);
}

function section(title: string, subtitle?: string): string {
  const head = `  ${paint("▎", fg.violet)} ${paint(title, bold, fg.ink)}`;
  const sub = subtitle ? paint(`  ${subtitle}`, dim, fg.muted) : "";
  return `\n${head}${sub}\n${hr("─", fg.faint)}`;
}

function statRow(cards: { value: string; label: string; color: string }[]): string {
  const cw = 12;
  const gap = " ";
  const box = (s: string) => paint("│", fg.faint) + padL(s, cw) + paint("│", fg.faint);
  const top = "  " + cards.map(() => paint("┌" + "─".repeat(cw) + "┐", fg.faint)).join(gap);
  const val = "  " + cards.map((c) => box(paint(c.value, bold, c.color))).join(gap);
  const lbl = "  " + cards.map((c) => box(paint(c.label, dim, fg.muted))).join(gap);
  const bot = "  " + cards.map(() => paint("└" + "─".repeat(cw) + "┘", fg.faint)).join(gap);
  return [top, val, lbl, bot].join("\n");
}

function healthGauge(score: number): string {
  const color = score >= 80 ? fg.green : score >= 50 ? fg.yellow : fg.orange;
  const filled = Math.round((score / 100) * 28);
  const track = gradientBar(score / 100, 28);
  return [
    paint("  HEALTH", dim, fg.muted),
    `  ${paint(String(score), bold, color)}${paint("/100", dim, fg.muted)}  ${track}`,
  ].join("\n");
}

function stackedLangBar(languages: ScopeReport["languages"], totalCode: number, width = 40): string {
  if (!totalCode) return "";
  const segs: string[] = [];
  let used = 0;
  for (const lang of languages.slice(0, 6)) {
    const w = Math.max(1, Math.round((lang.code / totalCode) * width));
    if (used + w > width) break;
    segs.push(paint("█".repeat(w), langColor(lang.language)));
    used += w;
  }
  if (used < width) segs.push(paint("·".repeat(width - used), fg.faint));
  return segs.join("");
}

function kv(key: string, value: string, keyW = 14): string {
  return paint(pad(key, keyW), dim, fg.muted) + value;
}

function twoCol(left: string[], right: string[], colW = 36): string {
  const rows: string[] = [];
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) {
    const l = left[i] ?? "";
    const r = right[i] ?? "";
    rows.push("  " + pad(l, colW) + r);
  }
  return rows.join("\n");
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function renderHero(report: ScopeReport): string {
  const name = report.identity.name ?? "Unknown Project";
  const inner = W - 4;
  const border = (s: string) => paint("  │", fg.violet) + pad(s, inner) + paint("│", fg.violet);
  const lines: string[] = [""];

  lines.push(paint("  ╭" + "─".repeat(inner) + "╮", fg.violet));
  lines.push(border(""));

  const logo = gradient("  scope");
  const tagline = paint("  project intelligence", dim, fg.muted);
  lines.push(border(logo + tagline));

  lines.push(border(""));

  const chips: string[] = [];
  if (report.identity.version) chips.push(chip(`v${report.identity.version}`, fg.cyan));
  if (report.identity.license) chips.push(chip(report.identity.license, fg.yellow));
  if (report.monorepo.isMonorepo) chips.push(chip("monorepo", fg.purple));
  if (report.git.isRepo && report.git.branch) chips.push(chip(report.git.branch, fg.green));

  const titleLine = paint(name, bold, fg.ink) + (chips.length ? "   " + chips.join("") : "");
  lines.push(border("  " + titleLine));

  if (report.identity.description) {
    lines.push(border("  " + truncate(report.identity.description, inner - 4)));
  }

  lines.push(border("  " + paint(truncate(report.path, inner - 4), dim, fg.muted)));
  lines.push(border(""));
  lines.push(paint("  ╰" + "─".repeat(inner) + "╯", fg.violet));

  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function renderTerminal(report: ScopeReport): string {
  const out: string[] = [];

  out.push(renderHero(report));

  // Stats ribbon
  out.push("");
  out.push(statRow([
    { value: fmt(report.totalCode), label: "code lines", color: fg.cyan },
    { value: fmt(report.totalFiles), label: "files", color: fg.green },
    { value: String(report.languages.length), label: "languages", color: fg.purple },
    { value: fmt(report.dependencyCount), label: "dependencies", color: fg.orange },
    { value: String(report.frameworks.length), label: "frameworks", color: fg.pink },
    { value: String(report.health.score), label: "health", color: fg.lime },
  ]));

  // Timing + composition
  out.push("");
  out.push(healthGauge(report.health.score));
  if (report.languages.length > 1) {
    out.push("  " + paint("composition", dim, fg.muted) + "  " + stackedLangBar(report.languages, report.totalCode));
  }
  const meta: string[] = [
    paint(`${report.durationMs}ms`, dim, fg.muted),
    paint(report.codebase.repoSizeHuman, dim, fg.faint),
  ];
  if (report.codebase.primaryLanguage) {
    meta.push(
      paint(report.codebase.primaryLanguage, bold, langColor(report.codebase.primaryLanguage)) +
        paint(` ${report.codebase.primaryLanguagePct}%`, dim, fg.muted)
    );
  }
  out.push("  " + meta.join(paint("  ·  ", fg.faint)));

  // Languages
  out.push(section("Languages", `${fmt(report.totalLines)} total lines across ${report.languages.length} languages`));
  const maxCode = report.languages[0]?.code ?? 1;
  for (const lang of report.languages.slice(0, 10)) {
    if (!lang.code && lang.language === "Markdown") continue;
    const share = report.totalCode > 0 ? Math.round((lang.code / report.totalCode) * 100) : 0;
    out.push(
      "  " +
        pad(paint(lang.language, langColor(lang.language)), 16) +
        gradientBar(lang.code / maxCode, 24) +
        padL(paint(`${share}%`, dim, fg.muted), 5) +
        padL(paint(fmt(lang.code), dim, fg.faint), 10)
    );
  }
  if (report.languages.length > 10) {
    out.push(paint(`  +${report.languages.length - 10} more`, dim, fg.faint));
  }

  // Stack
  if (report.frameworks.length > 0) {
    out.push(section("Stack"));
    const byCat = groupBy(report.frameworks, (f) => f.category);
    for (const [cat, items] of Object.entries(byCat)) {
      const pills = items.map((f) => {
        const v = f.version ? paint(`@${f.version}`, dim, fg.muted) : "";
        return pill(f.name, fg.cyan) + v;
      });
      out.push("  " + paint(cat, dim, fg.yellow) + "  " + pills.join(" "));
    }
  }

  const metaLeft: string[] = [];
  const metaRight: string[] = [];

  if (report.runtimes.length) {
    metaLeft.push(paint("Runtimes", bold, fg.ink));
    for (const rt of report.runtimes.slice(0, 4)) {
      metaLeft.push("  " + paint(rt.name, fg.green) + paint(` ${rt.version}`, fg.cyan));
    }
  }

  if (report.packageManagers.length) {
    metaRight.push(paint("Package managers", bold, fg.ink));
    metaRight.push("  " + report.packageManagers.map((p) => pill(p, fg.orange)).join(" "));
  }

  if (metaLeft.length || metaRight.length) {
    out.push("");
    out.push(twoCol(metaLeft, metaRight));
  }

  // Dependencies
  if (report.dependencies.length > 0) {
    out.push(section("Dependencies", `${report.dependencyCount} total`));
    const prod = report.dependencies.filter((d) => d.type === "production");
    const cols = 2;
    const colW = Math.floor((W - 6) / cols);
    for (let i = 0; i < Math.min(prod.length, 12); i += cols) {
      const cells: string[] = [];
      for (let j = 0; j < cols; j++) {
        const dep = prod[i + j];
        if (!dep) continue;
        cells.push(
          pad(
            paint(dep.name, fg.ink) + paint(` ${dep.version}`, dim, fg.cyan),
            colW
          )
        );
      }
      out.push("  " + cells.join(""));
    }
    if (prod.length > 12) out.push(paint(`  +${prod.length - 12} more production deps`, dim, fg.faint));
  }

  // Git
  if (report.git.isRepo) {
    out.push(section("Git"));
    const gitLeft = [
      kv("branch", paint(report.git.branch ?? "—", fg.green)),
      kv("commits", paint(fmt(report.git.commitCount ?? 0), fg.cyan)),
      kv("contributors", paint(String(report.git.contributors ?? "—"), fg.cyan)),
    ];
    const gitRight = [
      kv("age", paint(report.git.repoAgeDays !== undefined ? `${report.git.repoAgeDays} days` : "—", fg.ink)),
      kv("last commit", paint(truncate(report.git.lastCommit ?? "—", 28), fg.ink)),
      report.git.dirty ? kv("status", paint("uncommitted changes", fg.yellow)) : kv("status", paint("clean", fg.green)),
    ];
    out.push(twoCol(gitLeft, gitRight));
    if (report.git.remote) {
      out.push("  " + paint(truncate(report.git.remote, W - 4), dim, fg.faint));
    }
  }

  // Insight cards (2x2)
  out.push(section("Insights"));

  const devops: string[] = [];
  if (report.devops.docker) devops.push(pill("Docker", fg.blue));
  if (report.devops.dockerCompose) devops.push(pill("Compose", fg.blue));
  if (report.devops.kubernetes) devops.push(pill("K8s", fg.purple));
  if (report.devops.terraform) devops.push(pill("Terraform", fg.orange));
  devops.push(...report.devops.ci.map((c) => pill(c, fg.green)));

  const testing = [
    paint(`${report.testing.testFiles}`, bold, fg.cyan) + paint(" test files", dim, fg.muted),
    report.testing.frameworks.length ? report.testing.frameworks.map((f) => pill(f, fg.teal)).join(" ") : paint("no framework detected", dim, fg.faint),
  ].join("\n  ");

  const security = [
    report.security.hasLockfile ? pill("lockfile", fg.green) : pill("no lockfile", fg.yellow),
    report.security.envFiles.length ? pill(`${report.security.envFiles.length} env files`, fg.orange) : "",
    report.security.secretsPatterns > 0 ? pill(`${report.security.secretsPatterns} secret warnings`, fg.red) : "",
  ].filter(Boolean).join(" ");

  const docs = [
    report.documentation.hasReadme ? pill(`readme · ${report.documentation.readmeLines}L`, fg.green) : pill("no readme", fg.yellow),
    report.documentation.hasDocsFolder ? pill(`docs · ${report.documentation.docFiles} files`, fg.cyan) : "",
  ].filter(Boolean).join(" ");

  const quality = [
    report.quality.typescript ? pill("typescript" + (report.quality.typescriptStrict ? " strict" : ""), fg.blue) : "",
    ...report.quality.linters.map((l) => pill(l.toLowerCase(), fg.yellow)),
    ...report.quality.formatters.map((f) => pill(f.toLowerCase(), fg.lime)),
  ].filter(Boolean).join(" ") || paint("none detected", dim, fg.faint);

  out.push(twoCol(
    [paint("DevOps", bold, fg.ink), "  " + (devops.join(" ") || paint("—", dim, fg.faint))],
    [paint("Testing", bold, fg.ink), "  " + testing],
  ));
  out.push("");
  out.push(twoCol(
    [paint("Security", bold, fg.ink), "  " + security],
    [paint("Docs & quality", bold, fg.ink), "  " + docs, "  " + quality],
  ));

  // Health signals — compact row
  const ok = report.health.signals.filter((s) => s.ok);
  const miss = report.health.signals.filter((s) => !s.ok);
  if (ok.length || miss.length) {
    out.push("");
    if (ok.length) out.push("  " + ok.map((s) => pill(s.label.toLowerCase(), fg.green)).join(" "));
    if (miss.length) out.push("  " + paint("gap", dim, fg.muted) + "  " + miss.map((s) => pill(s.label.toLowerCase(), fg.faint)).join(" "));
  }

  // Extended sections (only when relevant)
  const extras: string[] = [];

  if (report.database.systems.length) {
    extras.push(paint("Database", bold, fg.ink) + "  " + report.database.systems.map((d) => pill(d, fg.blue)).join(" "));
    if (report.database.hasMigrations) extras.push(paint("  migrations", dim, fg.muted) + "  " + report.database.migrationPaths.join(", "));
  }

  if (report.routes.total > 0) {
    extras.push(
      paint("Routes", bold, fg.ink) +
        "  " + pill(`${report.routes.apiRoutes} api`, fg.cyan) +
        "  " + pill(`${report.routes.pageRoutes} pages`, fg.ink) +
        (report.routes.components ? "  " + pill(`${report.routes.components} components`, fg.muted) : "")
    );
  }

  if (report.architecture.patterns.length) {
    extras.push(paint("Architecture", bold, fg.ink) + "  " + report.architecture.patterns.map((p) => pill(p, fg.purple)).join(" "));
  }

  if (report.codebase.todoCount || report.codebase.fixmeCount) {
    extras.push(
      paint("Tech debt", bold, fg.ink) +
        (report.codebase.todoCount ? "  " + pill(`${report.codebase.todoCount} todo`, fg.yellow) : "") +
        (report.codebase.fixmeCount ? "  " + pill(`${report.codebase.fixmeCount} fixme`, fg.orange) : "")
    );
  }

  if (report.codebase.dockerServices.length) {
    extras.push(paint("Services", bold, fg.ink) + "  " + report.codebase.dockerServices.map((s) => pill(s, fg.blue)).join(" "));
  }

  if (extras.length) {
    out.push(section("Details"));
    out.push(extras.map((l) => "  " + l).join("\n"));
  }

  // Structure
  out.push(section("Structure"));
  out.push(
    "  " +
      pill(`${fmt(report.structure.totalFiles)} files`, fg.ink) +
      "  " + pill(`${fmt(report.structure.totalDirectories)} dirs`, fg.muted) +
      "  " + pill(`depth ${report.structure.depth}`, fg.muted)
  );

  if (report.structure.largestFiles.length > 0) {
    out.push("");
    const maxLines = report.structure.largestFiles[0]?.lines ?? 1;
    for (const f of report.structure.largestFiles.slice(0, 5)) {
      out.push(
        "  " +
          pad(truncate(f.path, 42), 44) +
          gradientBar(f.lines / maxLines, 16) +
          "  " +
          paint(fmt(f.lines) + "L", dim, fg.cyan)
      );
    }
  }

  // Footer
  out.push("");
  out.push(hr("╌", fg.faint));
  out.push(
    paint("  scope", gradient) +
      paint(`  ·  ${report.durationMs}ms  ·  `, dim, fg.muted) +
      paint(`${report.locEngine} + ${report.listEngine}`, dim, fg.faint)
  );
  out.push("");

  return out.join("\n");
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}
