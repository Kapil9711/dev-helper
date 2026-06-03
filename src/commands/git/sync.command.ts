import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function syncCommand(program: Command) {
  program

    .command("sync")

    .description("Fetch and pull latest")

    .action(async () => {
      await gitService.sync();
    });
}
