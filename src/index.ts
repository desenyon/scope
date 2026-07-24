#!/usr/bin/env bun

import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { analyze } from "./analyze.ts";
import { renderTerminal } from "./display/terminal.ts";
import { renderMarkdown } from "./display/markdown.ts";
import { Spinner } from "./display/spinner.ts";

const args = process.argv.slice(2);
const VERSION = "1.2.1";

function printHelp(): void {
  const g = (t: string) => t.split("").map((c, i) => ["\x1b[38;5;141m", "\x1b[38;5;135m", "\x1b[38;5;39m", "\x1b[38;5;51m"][i % 4] + c).join("") + "\x1b[0m";
  const d = (t: string) => "\x1b[2m" + t + "\x1b[0m";
  console.log(`
  ${g("scope")}  ${d("project intelligence")}

  ${d("Usage")}
    scope [path]              Analyze a project
    scope export [path]       Markdown report
    scope json [path]         JSON output
    scope help                Show this help

  ${d("Options")}
    -o, --output <file>       Save to file
    -q, --quiet               No spinner
    -h, --help                Help
    -V, --version             Version

  ${d("Examples")}
    scope
    scope ~/projects/my-app
    scope export -o REPORT.md
    scope json . | jq '.health.score'
`);
}

function parseArgs(argv: string[]): {
  command: "analyze" | "export" | "json" | "help" | "version";
  path: string;
  output?: string;
  quiet: boolean;
} {
  let command: "analyze" | "export" | "json" | "help" | "version" = "analyze";
  let path = ".";
  let output: string | undefined;
  let quiet = false;

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help" || arg === "help") {
      return { command: "help", path: ".", quiet: false };
    }
    if (arg === "-V" || arg === "--version" || arg === "version") {
      return { command: "version", path: ".", quiet: false };
    }
    if (arg === "-q" || arg === "--quiet") { quiet = true; continue; }
    if (arg === "-o" || arg === "--output") {
      const next = argv[++i];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for -o/--output");
      }
      output = next;
      continue;
    }
    if (arg === "export") { command = "export"; continue; }
    if (arg === "json") { command = "json"; continue; }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
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

  if (command === "version") {
    console.log(`scope ${VERSION}`);
    return;
  }

  const resolvedPath = resolve(path);

  const spinner = !quiet && command === "analyze" ? new Spinner(`scanning ${resolvedPath}`) : null;
  spinner?.start();

  let report;
  try {
    report = await analyze({ path: resolvedPath });
  } catch (err) {
    spinner?.stop();
    throw err;
  }

  spinner?.stop();

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
