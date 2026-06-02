import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gsCommand(program: Command) {
  program
    .command("gs")

    .description("Show repository status")

    .addHelpText(
      "after",

      `
Examples:

  vh gs

Shows:

  modified files
  staged files
  branch status
`,
    )

    .action(async () => {
      await gitService.status();
    });
}
