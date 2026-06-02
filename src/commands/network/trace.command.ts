import { Command } from "commander";

import { networkService } from "../../services/network/network.service";

export function traceCommand(program: Command) {
  program
    .command("trace")

    .argument("<host>", "Domain or IP")

    .description("Trace network route to destination")

    .addHelpText(
      "after",

      `
Examples:

  vh net trace google.com

  vh net trace 8.8.8.8

Shows:

  route hops

  latency

  packet path

  routing failures
`,
    )

    .action(async (host) => {
      await networkService.trace(host);
    });
}
