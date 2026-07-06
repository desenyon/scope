const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const VIOLET = "\x1b[38;5;141m";
const DIM = "\x1b[2m";
const R = "\x1b[0m";

export class Spinner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private label: string;

  constructor(label: string) {
    this.label = label;
  }

  start(): void {
    if (!process.stderr.isTTY) return;
    this.timer = setInterval(() => {
      const f = FRAMES[this.frame++ % FRAMES.length];
      process.stderr.write(`\r${VIOLET}${f}${R} ${DIM}${this.label}${R}`);
    }, 80);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (process.stderr.isTTY) process.stderr.write("\r\x1b[2K");
  }
}
