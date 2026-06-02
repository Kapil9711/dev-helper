import { Command } from "commander";

import { networkService } from "../../services/network/network.service";

export function portsCommand(program: Command) {
  program
    .command("ports")

    .argument("<host>", "Domain or IP")

    .option("--extended", "Scan extended ports")

    .option("--full", "Scan all ports")

    .option("--ports <ports>", "Custom ports ex: 22,80,443")

    .description("Scan network ports")

    .addHelpText(
      "after",

      `
Examples:

  vh net ports google.com

  vh net ports google.com --extended

  vh net ports google.com --full

  vh net ports google.com --ports 22,80,443
`,
    )

    .action(async (host, options) => {
      await networkService.ports(host, options);
    });
}
