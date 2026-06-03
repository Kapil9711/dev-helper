import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function fetchCommand(program: Command) {
  program

    .command("fetch")

    .description("Fetch remotes")

    .action(async () => {
      await gitService.fetch();
    });
}
