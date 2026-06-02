import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

export function gpuCommand(program: Command) {
  program
    .command("gpu")

    .description("Push current branch and create upstream if needed")

    .addHelpText(
      "after",

      `
Examples:

  vh gpu

Workflow:

  1. Detect current branch
  2. Create upstream
  3. Push branch
`,
    )

    .action(async () => {
      await gitService.pushUpstream();
    });
}
