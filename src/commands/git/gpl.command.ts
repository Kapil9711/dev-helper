import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gplCommand(program: Command) {
  program
    .command("gpl")

    .description("Pull latest changes from remote branch")

    .argument("[branch]", "Branch to pull from (default: current branch)")

    .addHelpText(
      "after",

      `
Examples:

  vh gpl
    Pull current branch

  vh gpl main
    Pull latest changes from main

  vh gpl develop
    Pull latest changes from develop

Workflow:

  1. Detect target branch
  2. Fetch latest remote changes
  3. Check commit difference
  4. Create upstream if missing
  5. Pull latest commits
`,
    )

    .action(async (branch) => {
      await gitService.pull(branch);
    });
}
