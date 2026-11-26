export class Writer {
  async write(text: string, delay?: number): Promise<void> {
    if (!text) return;

    // If delay is explicitly provided, clamp or use it; otherwise calculate
    const characterDelay =
      delay !== undefined
        ? delay <= 0
          ? 0
          : Math.min(delay, 2)
        : this.calculateDelay(text);

    if (characterDelay <= 0) {
      process.stdout.write(text);
      return;
    }

    // Match ANSI escape sequences: \x1b\[[0-9;]*[a-zA-Z] or OSC sequences
    const ansiRegex = /(\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07)/g;
    const tokens = text.split(ansiRegex);

    for (const token of tokens) {
      if (!token) continue;

      // If token is an ANSI escape sequence, emit immediately without delay
      if (token.startsWith("\x1b")) {
        process.stdout.write(token);
        continue;
      }

      for (const char of token) {
        process.stdout.write(char);

        // Don't delay after whitespace/newlines
        if (char === " " || char === "\n" || char === "\r" || char === "\t") {
          continue;
        }

        await new Promise((resolve) => setTimeout(resolve, characterDelay));
      }
    }
  }

  async writeln(text: string = "", delay?: number): Promise<void> {
    await this.write(text, delay);
    process.stdout.write("\n");
  }

  private calculateDelay(text: string): number {
    const length = text.length;
    if (length <= 30) return 2;
    if (length <= 70) return 1;
    return 0;
  }
}

export const writer = new Writer();
