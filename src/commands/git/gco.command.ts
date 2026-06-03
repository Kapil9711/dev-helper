import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

import { pickBranch } from "../../core/helper/branch.helper";

import { safeCommand } from "../../core/helper/command.helper";

export function gcoCommand(program: Command) {
  program

    .command("gco")

    .argument("[branch]", "Branch name")

    .description("Checkout existing branch")

    .addHelpText(
      "after",

      `
Examples:

  vh git gco main

  vh git gco develop

  vh git gco
`,
    )

    .action((branch) =>
      safeCommand(async () => {
        if (!branch) {
          branch = await pickBranch();
        }

        await gitService.checkout(branch);
      }),
    );
}
