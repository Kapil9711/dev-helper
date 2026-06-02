"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceCommand = traceCommand;
const network_service_1 = require("../../services/network/network.service");
function traceCommand(program) {
    program
        .command("trace")
        .argument("<host>", "Domain or IP")
        .description("Trace network route to destination")
        .addHelpText("after", `
Examples:

  vh net trace google.com

  vh net trace 8.8.8.8

Shows:

  route hops

  latency

  packet path

  routing failures
`)
        .action(async (host) => {
        await network_service_1.networkService.trace(host);
    });
}
