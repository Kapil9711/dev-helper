"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sslCommand = sslCommand;
const network_service_1 = require("../../services/network/network.service");
function sslCommand(program) {
    program
        .command("ssl")
        .argument("<domain>", "Domain name")
        .description("Inspect SSL certificate details")
        .addHelpText("after", `
Examples:

  vh net ssl google.com

  vh net ssl api.example.com

Shows:

  issuer

  expiry

  TLS version

  days remaining

  SAN domains
`)
        .action(async (domain) => {
        await network_service_1.networkService.ssl(domain);
    });
}
