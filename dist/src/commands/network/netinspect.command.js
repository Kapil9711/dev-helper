"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.netInspectCommand = netInspectCommand;
const network_service_1 = require("../../services/network/network.service");
function netInspectCommand(program) {
    program
        .command("net")
        .description("Network helper tools")
        .command("inspect")
        .argument("<url>", "URL or domain to inspect")
        .description("Inspect DNS, redirects, timings, and network info")
        .addHelpText("after", `
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
`)
        .action(async (url) => {
        await network_service_1.networkService.inspect(url);
    });
}
