import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function bgCommand(program: Command) {
  program
    .command("bg")

    .description("List git branches")

    .addHelpText(
      "after",

      `
Examples:

  vh bg
`,
    )

    .action(async () => {
      await gitService.branches();
    });
}
