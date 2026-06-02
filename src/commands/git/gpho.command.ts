import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gphoCommand(program: Command) {
  program
    .command("gpho")

    .argument("[branch]", "Branch name")

    .description("Push directly to origin")

    .addHelpText(
      "after",

      `
Examples:

  vh gpho

  vh gpho main
`,
    )

    .action(async (branch) => {
      await gitService.pushOrigin(branch);
    });
}
