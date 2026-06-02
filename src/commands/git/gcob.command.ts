import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gcobCommand(program: Command) {
  program
    .command("gcob")

    .argument("<branch>", "New branch name")

    .description("Create and switch branch")

    .addHelpText(
      "after",

      `
Examples:

  vh gcob feature/auth

Workflow:

  1. Create branch
  2. Checkout branch
`,
    )

    .action(async (branch) => {
      await gitService.checkoutBranch(branch);
    });
}
