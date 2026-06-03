import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

import { pickTracked } from "../../core/helper/git.helper";

import { safeCommand } from "../../core/helper/command.helper";

export function untrackCommand(program: Command) {
  program

    .command("untrack")

    .argument("[target]")

    .description("Stop tracking file/folder")

    .addHelpText(
      "after",

      `
Examples:

  vh git untrack

  vh git untrack src/temp.ts

  vh git untrack src/components
`,
    )

    .action((target) =>
      safeCommand(async () => {
        if (!target) {
          target = await pickTracked();
        }

        await gitService.untrack(target);
      }),
    );
}
