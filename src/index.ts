#!/usr/bin/env bun

import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { analyze } from "./analyze.ts";
import { renderTerminal } from "./display/terminal.ts";
import { renderMarkdown } from "./display/markdown.ts";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`
  ${gradient("SCOPE")} — Beautiful project intelligence CLI

  ${dim("Usage:")}
    scope [path]              Analyze a project (default: current directory)
    scope export [path]       Export report as Markdown
    scope json [path]         Output raw JSON report

  ${dim("Options:")}
    -o, --output <file>       Write output to file instead of stdout
    -q, --quiet               Minimal output (no banner)
    -h, --help                Show this help

  ${dim("Examples:")}
    scope                     Analyze current directory
    scope ~/projects/my-app   Analyze specific project
    scope export -o REPORT.md
    scope json | jq '.totalCode'
`);
}

function gradient(text: string): string {
  const colors = ["\x1b[38;5;141m", "\x1b[38;5;135m", "\x1b[38;5;39m", "\x1b[38;5;51m"];
  return text.split("").map((c, i) => colors[i % colors.length] + c).join("") + "\x1b[0m";
}

function dim(text: string): string {
  return "\x1b[2m" + text + "\x1b[0m";
}

function parseArgs(argv: string[]): {
  command: "analyze" | "export" | "json" | "help";
  path: string;
  output?: string;
  quiet: boolean;
} {
  let command: "analyze" | "export" | "json" | "help" = "analyze";
  let path = ".";
  let output: string | undefined;
  let quiet = false;

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") return { command: "help", path: ".", quiet: false };
    if (arg === "-q" || arg === "--quiet") { quiet = true; continue; }
    if (arg === "--version") { console.log("scope 1.1.0"); process.exit(0); }
    if (arg === "-o" || arg === "--output") { output = argv[++i]; continue; }
    if (arg === "export") { command = "export"; continue; }
    if (arg === "json") { command = "json"; continue; }
    if (!arg.startsWith("-")) positional.push(arg);
  }

  if (positional.length > 0) path = positional[0];
  return { command, path, output, quiet };
}

async function main(): Promise<void> {
  const { command, path, output, quiet } = parseArgs(args);

  if (command === "help") {
    printHelp();
    return;
  }

  const resolvedPath = resolve(path);

  if (!quiet && command === "analyze") {
    process.stderr.write("\x1b[38;5;141m\x1b[2m  ◌ Scanning " + resolvedPath + "...\x1b[0m\r");
  }

  const report = await analyze({ path: resolvedPath });

  if (!quiet && command === "analyze") {
    process.stderr.write(" ".repeat(60) + "\r");
  }

  let content: string;

  switch (command) {
    case "json":
      content = JSON.stringify(report, null, 2);
      break;
    case "export":
      content = renderMarkdown(report);
      break;
    default:
      content = renderTerminal(report);
  }

  if (output) {
    await writeFile(output, content, "utf-8");
    if (!quiet) {
      console.log(`\x1b[38;5;82m  ✓ Written to ${output}\x1b[0m`);
    }
  } else {
    console.log(content);
  }
}

main().catch((err) => {
  console.error("\x1b[38;5;203m  ✗ Error:\x1b[0m", err instanceof Error ? err.message : err);
  process.exit(1);
});
