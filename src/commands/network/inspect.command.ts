import { Command } from "commander";

import { networkService } from "../../services/network/network.service";

export function netInspectCommand(program: Command) {
  program
    .command("inspect")

    .argument("<url>", "URL or domain to inspect")

    .description("Inspect DNS, redirects, timings, and network info")

    .addHelpText(
      "after",

      `
Examples:

  vh net inspect google.com

  vh net inspect https://google.com

Shows:

  DNS

  redirect chain

  latency

  TLS timing

  IP info

  response metadata
`,
    )

    .action(async (url) => {
      await networkService.inspect(url);
    });
}
