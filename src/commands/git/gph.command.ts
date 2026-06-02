import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gphCommand(program: Command) {
  program
    .command("gph")
    .description("Pull latest changes and push current branch to remote")
    .argument(
      "[branch]",
      "Branch to pull before pushing (default: current branch)",
    )
    .addHelpText(
      "after",

      `
Examples:

  vh gph
    Pull current branch then push it

  vh gph main
    Pull from main then push current branch

Workflow:

  1. Detect current branch
  2. Pull latest changes
  3. Create upstream if missing
  4. Push branch to remote
`,
    )
    .action(async (branch) => {
      await gitService.pushWithPull(branch);
    });
}
