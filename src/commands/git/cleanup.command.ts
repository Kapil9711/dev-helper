import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function cleanupCommand(program: Command) {
  program

    .command("cleanup")

    .description("Cleanup merged branches")

    .action(async () => {
      await gitService.cleanup();
    });
}
