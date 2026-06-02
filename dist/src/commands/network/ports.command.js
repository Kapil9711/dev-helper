"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portsCommand = portsCommand;
const network_service_1 = require("../../services/network/network.service");
function portsCommand(program) {
    program
        .command("ports")
        .argument("<host>", "Domain or IP")
        .option("--extended", "Scan extended ports")
        .option("--full", "Scan all ports")
        .option("--ports <ports>", "Custom ports ex: 22,80,443")
        .description("Scan network ports")
        .addHelpText("after", `
Examples:

  vh net ports google.com

  vh net ports google.com --extended

  vh net ports google.com --full

  vh net ports google.com --ports 22,80,443
`)
        .action(async (host, options) => {
        await network_service_1.networkService.ports(host, options);
    });
}
