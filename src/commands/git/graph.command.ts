import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function graphCommand(program: Command) {
  program

    .command("graph")

    .description("Show git graph")

    .action(async () => {
      await gitService.graph();
    });
}
