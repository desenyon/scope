export interface ToolStatus {
  tokei: boolean;
  fd: boolean;
  rg: boolean;
  bun: boolean;
}

let cached: ToolStatus | null = null;

async function which(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", cmd], { stdout: "pipe", stderr: "pipe" });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

export async function detectTools(): Promise<ToolStatus> {
  if (cached) return cached;
  const [tokei, fd, rg, bun] = await Promise.all([
    which("tokei"), which("fd"), which("rg"), which("bun"),
  ]);
  cached = { tokei, fd, rg, bun };
  return cached;
}

export function resetToolCache(): void {
  cached = null;
}
