import type { GitInfo } from "../types.ts";

export async function scanGit(root: string): Promise<GitInfo> {
  const info: GitInfo = { isRepo: false };

  try {
    const isRepo = await runGit(root, ["rev-parse", "--is-inside-work-tree"]);
    if (isRepo?.trim() !== "true") return info;
    info.isRepo = true;

    const [branch, remote, commitCount, lastCommit, lastCommitDate, firstCommit, dirty] = await Promise.all([
      runGit(root, ["branch", "--show-current"]),
      runGit(root, ["remote", "get-url", "origin"]).catch(() => null),
      runGit(root, ["rev-list", "--count", "HEAD"]).catch(() => null),
      runGit(root, ["log", "-1", "--format=%s"]).catch(() => null),
      runGit(root, ["log", "-1", "--format=%ci"]).catch(() => null),
      runGit(root, ["log", "--reverse", "--format=%ci", "-1"]).catch(() => null),
      runGit(root, ["status", "--porcelain"]).then((s) => (s?.trim().length ?? 0) > 0).catch(() => false),
    ]);

    info.branch = branch?.trim() || undefined;
    info.remote = remote?.trim() || undefined;
    info.commitCount = commitCount ? parseInt(commitCount.trim(), 10) : undefined;
    info.lastCommit = lastCommit?.trim() || undefined;
    info.lastCommitDate = lastCommitDate?.trim() || undefined;
    info.firstCommitDate = firstCommit?.trim() || undefined;
    if (info.firstCommitDate) {
      const first = new Date(info.firstCommitDate);
      info.repoAgeDays = Math.floor((Date.now() - first.getTime()) / 86_400_000);
    }
    info.dirty = dirty;

    const contributors = await runGit(root, ["shortlog", "-sn", "--all"]).catch(() => null);
    if (contributors) {
      info.contributors = contributors.trim().split("\n").filter(Boolean).length;
    }
  } catch {
    /* not a git repo */
  }

  return info;
}

async function runGit(cwd: string, args: string[]): Promise<string | null> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  const exit = await proc.exited;
  if (exit !== 0) return null;
  return output;
}
