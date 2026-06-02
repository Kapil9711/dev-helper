import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gcmCommand(program: Command) {
  program
    .command("gcm")

    .argument("<message>", "Commit message")

    .description("Create git commit")

    .addHelpText(
      "after",

      `
Examples:

  vh gcm "fix login issue"

Workflow:

  1. Create commit
  2. Use provided message
`,
    )

    .action(async (message) => {
      await gitService.commit(message);
    });
}
