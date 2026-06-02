"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverCommand = discoverCommand;
const network_service_1 = require("../../services/network/network.service");
function discoverCommand(program) {
    program
        .command("discover")
        .argument("<target>", "localhost / subnet / ip / domain")
        .description("Discover hosts and network information")
        .addHelpText("after", `
Examples:

  vh net discover localhost

  vh net discover 192.168.0.0/24

  vh net discover 192.168.0.15

  vh net discover gemlay.com
`)
        .action(async (target) => {
        await network_service_1.networkService.discover(target);
    });
}
