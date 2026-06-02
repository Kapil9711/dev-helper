import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gploCommand(program: Command) {
  program
    .command("gplo")

    .argument("[branch]", "Branch name")

    .description("Pull directly from origin")

    .addHelpText(
      "after",

      `
Examples:

  vh gplo

  vh gplo main
`,
    )

    .action(async (branch) => {
      await gitService.pullOrigin(branch);
    });
}
