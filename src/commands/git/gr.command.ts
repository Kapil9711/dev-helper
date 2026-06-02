import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function grCommand(program: Command) {
  program
    .command("gr")

    .argument("[file]", "File path")

    .description("Restore file changes")

    .addHelpText(
      "after",

      `
Examples:

  vh gr

  vh gr src/index.ts
`,
    )

    .action(async (file) => {
      await gitService.restore(file);
    });
}
