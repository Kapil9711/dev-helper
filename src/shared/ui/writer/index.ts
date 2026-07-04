export class Writer {
  async write(text: string, delay = 10): Promise<void> {
    for (const char of text) {
      process.stdout.write(char);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  async writeln(text: string, delay = 16): Promise<void> {
    await this.write(text, delay);

    process.stdout.write("\n");
  }
}

export const writer = new Writer();
