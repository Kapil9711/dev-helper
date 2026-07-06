export class Writer {
  async write(text: string, delay?: number): Promise<void> {
    // If delay is explicitly provided, use it.
    const characterDelay = delay ?? this.calculateDelay(text);

    for (const char of text) {
      process.stdout.write(char);

      // Don't delay after whitespace/newlines
      if (char === " " || char === "\n" || char === "\r") {
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, characterDelay));
    }
  }

  async writeln(text: string, delay?: number): Promise<void> {
    await this.write(text, delay);

    process.stdout.write("\n");
  }

  private calculateDelay(text: string): number {
    const length = text.length;

    if (length <= 30) return 20;
    if (length <= 80) return 10;
    if (length <= 150) return 6;
    if (length <= 300) return 3;

    return 1;
  }
}

export const writer = new Writer();
