import { Command } from "commander";

import { networkService } from "../../services/network/network.service";

export function discoverCommand(program: Command) {
  program
    .command("discover")

    .argument("<target>", "localhost / subnet / ip / domain")

    .description("Discover hosts and network information")

    .addHelpText(
      "after",

      `
Examples:

  vh net discover localhost

  vh net discover 192.168.0.0/24

  vh net discover 192.168.0.15

  vh net discover gemlay.com
`,
    )

    .action(async (target) => {
      await networkService.discover(target);
    });
}
