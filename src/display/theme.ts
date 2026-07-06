export const tty = process.stdout.isTTY ?? false;

export const R = "\x1b[0m";
export const bold = "\x1b[1m";
export const dim = "\x1b[2m";

export const fg = {
  ink: "\x1b[38;5;252m",
  muted: "\x1b[38;5;245m",
  faint: "\x1b[38;5;238m",
  violet: "\x1b[38;5;141m",
  purple: "\x1b[38;5;135m",
  indigo: "\x1b[38;5;99m",
  blue: "\x1b[38;5;39m",
  cyan: "\x1b[38;5;51m",
  teal: "\x1b[38;5;43m",
  green: "\x1b[38;5;82m",
  lime: "\x1b[38;5;118m",
  yellow: "\x1b[38;5;220m",
  orange: "\x1b[38;5;208m",
  red: "\x1b[38;5;203m",
  pink: "\x1b[38;5;212m",
  rose: "\x1b[38;5;204m",
};

export const bg = {
  panel: "\x1b[48;5;235m",
  card: "\x1b[48;5;236m",
  accent: "\x1b[48;5;237m",
};

const GRADIENT = [fg.violet, fg.purple, fg.indigo, fg.blue, fg.cyan];

export function paint(text: string, ...styles: string[]): string {
  if (!tty) return text;
  return styles.join("") + text + R;
}

export function gradient(text: string, colors = GRADIENT): string {
  if (!tty) return text;
  return [...text].map((ch, i) => colors[i % colors.length] + ch).join("") + R;
}

export function strip(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

export function vis(s: string): number {
  return strip(s).length;
}

export function pad(s: string, n: number): string {
  const v = vis(s);
  return v >= n ? s : s + " ".repeat(n - v);
}

export function padL(s: string, n: number): string {
  const v = vis(s);
  return v >= n ? s : " ".repeat(n - v) + s;
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export const W = 78;

export function hr(char = "─", color = fg.faint): string {
  return paint("  " + char.repeat(W - 2), color);
}

export function panel(lines: string[], border = fg.violet): string {
  const inner = lines.map(strip);
  const width = Math.min(W - 4, Math.max(...inner.map((l) => l.length), 20));
  const top = paint("  ╭" + "─".repeat(width + 2) + "╮", border);
  const body = lines.map((l) => {
    const gap = width - vis(l);
    return paint("  │ ", border) + l + " ".repeat(Math.max(0, gap)) + paint(" │", border);
  });
  const bot = paint("  ╰" + "─".repeat(width + 2) + "╯", border);
  return [top, ...body, bot].join("\n");
}

export function bar(ratio: number, width: number, fill: string, empty: string): string {
  const n = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return paint(fill.repeat(n), fg.cyan) + paint(empty.repeat(width - n), fg.faint);
}

export function gradientBar(ratio: number, width: number): string {
  const blocks = ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
  const total = ratio * width;
  const full = Math.floor(total);
  const frac = Math.round((total - full) * (blocks.length - 1));
  let out = "";
  for (let i = 0; i < width; i++) {
    const color = GRADIENT[i % GRADIENT.length];
    if (i < full) out += paint("█", color);
    else if (i === full && frac > 0) out += paint(blocks[frac], color);
    else out += paint("·", fg.faint);
  }
  return out;
}

export const LANG_COLORS: Record<string, string> = {
  TypeScript: fg.blue, JavaScript: fg.yellow, Python: fg.cyan,
  JSON: fg.muted, Markdown: fg.purple, Go: fg.cyan, Rust: fg.orange,
  Ruby: fg.red, Java: fg.orange, HTML: fg.rose, CSS: fg.blue,
  Vue: fg.green, Shell: fg.lime, YAML: fg.teal, SQL: fg.blue,
};

export function langColor(lang: string): string {
  return LANG_COLORS[lang] ?? fg.ink;
}
