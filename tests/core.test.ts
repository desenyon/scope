import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyze } from "../src/analyze.ts";
import { scanGit } from "../src/scanners/git.ts";

const FIXTURE = join(tmpdir(), `scope-test-${process.pid}`);

async function run(cwd: string, cmd: string[], env: Record<string, string> = {}): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const exit = await proc.exited;
  if (exit !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`${cmd.join(" ")} failed: ${err}`);
  }
}

describe("analyze path validation", () => {
  test("rejects missing paths", async () => {
    await expect(analyze({ path: join(FIXTURE, "does-not-exist") })).rejects.toThrow(/Path not found/);
  });

  test("rejects files that are not directories", async () => {
    await mkdir(FIXTURE, { recursive: true });
    const file = join(FIXTURE, "not-a-dir.txt");
    await writeFile(file, "x");
    await expect(analyze({ path: file })).rejects.toThrow(/Not a directory/);
  });
});

describe("scanGit first commit / repo age", () => {
  const repo = join(FIXTURE, "aged-repo");

  beforeAll(async () => {
    await rm(repo, { recursive: true, force: true });
    await mkdir(repo, { recursive: true });
    await run(repo, ["git", "init"]);
    await run(repo, ["git", "config", "user.email", "scope@test.local"]);
    await run(repo, ["git", "config", "user.name", "Scope Test"]);

    await writeFile(join(repo, "a.txt"), "first\n");
    await run(repo, ["git", "add", "a.txt"]);
    await run(repo, ["git", "commit", "-m", "first"], {
      GIT_AUTHOR_DATE: "2020-01-01T12:00:00",
      GIT_COMMITTER_DATE: "2020-01-01T12:00:00",
    });

    await writeFile(join(repo, "a.txt"), "first\nsecond\n");
    await run(repo, ["git", "add", "a.txt"]);
    await run(repo, ["git", "commit", "-m", "second"], {
      GIT_AUTHOR_DATE: "2024-06-01T12:00:00",
      GIT_COMMITTER_DATE: "2024-06-01T12:00:00",
    });
  });

  afterAll(async () => {
    await rm(FIXTURE, { recursive: true, force: true });
  });

  test("uses the root commit for firstCommitDate, not the latest", async () => {
    const git = await scanGit(repo);
    expect(git.isRepo).toBe(true);
    expect(git.commitCount).toBe(2);
    expect(git.lastCommit).toBe("second");
    expect(git.lastCommitDate).toContain("2024-06-01");
    expect(git.firstCommitDate).toContain("2020-01-01");
    expect(git.firstCommitDate).not.toEqual(git.lastCommitDate);
  });

  test("repoAgeDays is measured from the first commit", async () => {
    const git = await scanGit(repo);
    const expected = Math.floor((Date.now() - new Date("2020-01-01T12:00:00").getTime()) / 86_400_000);
    expect(git.repoAgeDays).toBeDefined();
    // Allow one-day skew for timezone / wall-clock differences
    expect(Math.abs((git.repoAgeDays ?? 0) - expected)).toBeLessThanOrEqual(1);
    // Regression: old bug used last commit (~2024), yielding ~700–800 days instead of ~2300+
    expect((git.repoAgeDays ?? 0) > 2000).toBe(true);
  });
});

describe("cli argument parsing", () => {
  test("scope help prints usage and exits 0", async () => {
    const proc = Bun.spawn(["bun", "run", "src/index.ts", "help"], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(out).toContain("Usage");
    expect(out).toContain("scope json");
  });

  test("missing path exits non-zero with a clear error", async () => {
    const proc = Bun.spawn(["bun", "run", "src/index.ts", jsonPath(), "-q"], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;
    expect(code).toBe(1);
    expect(err).toMatch(/Path not found/);
  });
});

function jsonPath(): string {
  return join(tmpdir(), `scope-missing-${process.pid}-${Date.now()}`);
}
