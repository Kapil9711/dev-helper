import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function undoCommand(program: Command) {
  program

    .command("undo")

    .description("Advanced git reset")

    .argument(
      "[index]",

      "commits back",

      "1",
    )

    .option(
      "--hard",

      "hard reset",
    )

    .option(
      "--mixed",

      "mixed reset",
    )

    .option(
      "--commit <hash>",

      "reset to commit",
    )

    .action(
      async (
        index,

        options,
      ) => {
        await gitService.undo({
          hard: options.hard,

          mixed: options.mixed,

          commit: options.commit,

          index: Number(index),
        });
      },
    );
}
