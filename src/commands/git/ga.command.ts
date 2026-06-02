import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gaCommand(program: Command) {
  program
    .command("ga")

    .description("Stage all modified files")

    .addHelpText(
      "after",

      `
Examples:

  vh ga

Workflow:

  1. Run git add .
  2. Stage all changes
`,
    )

    .action(async () => {
      await gitService.addAll();
    });
}
