import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

import { pickBranch } from "../../core/helper/git.helper";

import { safeCommand } from "../../core/helper/command.helper";

export function delCommand(program: Command) {
  program

    .command("del")

    .argument("[branch]")

    .option(
      "-r, --remote",

      "Delete remote also",
    )

    .description("Delete branch")

    .action(
      (
        branch,

        options,
      ) =>
        safeCommand(async () => {
          if (!branch) {
            branch = await pickBranch();
          }

          await gitService.deleteBranch(
            branch,

            options.remote,
          );
        }),
    );
}
