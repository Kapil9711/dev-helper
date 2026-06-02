import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gcoCommand(program: Command) {
  program
    .command("gco")

    .argument("<branch>", "Branch name")

    .description("Checkout existing branch")

    .addHelpText(
      "after",

      `
Examples:

  vh gco main

  vh gco develop
`,
    )

    .action(async (branch) => {
      await gitService.checkout(branch);
    });
}
