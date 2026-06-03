import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function initCommand(program: Command) {
  program

    .command("init")

    .description("Initialize repository")

    .action(async () => {
      await gitService.init();
    });
}
