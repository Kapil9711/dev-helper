import { Command } from "commander";

import { networkService } from "../../services/network/network.service";

export function sslCommand(program: Command) {
  program
    .command("ssl")

    .argument("<domain>", "Domain name")

    .description("Inspect SSL certificate details")

    .addHelpText(
      "after",

      `
Examples:

  vh net ssl google.com

  vh net ssl api.example.com

Shows:

  issuer

  expiry

  TLS version

  days remaining

  SAN domains
`,
    )

    .action(async (domain) => {
      await networkService.ssl(domain);
    });
}
