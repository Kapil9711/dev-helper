import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

import { safeCommand } from "../../core/helper/command.helper";

export function finalCommand(program: Command) {
  program

    .command("final")

    .argument("[message]", "Commit message")

    .description("Add + Commit + Push workflow")

    .addHelpText(
      "after",

      `
Examples:

  vh git final

  vh git final "fix login"

  vh git final "dashboard updates"
`,
    )

    .action((message) =>
      safeCommand(async () => {
        await gitService.final(message);
      }),
    );
}
