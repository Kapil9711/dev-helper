import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function mergeCommand(program: Command) {
  program

    .command("merge")

    .argument("<branch>")

    .description("Merge branch")

    .action(async (branch) => {
      await gitService.merge(branch);
    });
}
