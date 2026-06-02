"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNetworkCommands = registerNetworkCommands;
const inspect_command_1 = require("./inspect.command");
const ssl_command_1 = require("./ssl.command");
const trace_command_1 = require("./trace.command");
const ports_command_1 = require("./ports.command");
const discover_command_1 = require("./discover.command");
function registerNetworkCommands(program) {
    const net = program
        .command("net")
        .description("Network utilities")
        .addHelpText("after", `
Examples:

  vh net inspect google.com

  vh net ssl google.com

  vh net trace google.com

  vh net ports google.com

  vh net discover localhost

  vh net discover 192.168.0.15

  vh net discover gemlay.com

Available tools:

  inspect    DNS, redirects, timings, IP metadata

  ssl        SSL certificate inspection

  trace      Route hops, latency, path analysis

  ports      Scan ports and detect services

  discover   Discover hosts, devices, and target information
`);
    (0, inspect_command_1.netInspectCommand)(net);
    (0, ssl_command_1.sslCommand)(net);
    (0, trace_command_1.traceCommand)(net);
    (0, ports_command_1.portsCommand)(net);
    (0, discover_command_1.discoverCommand)(net);
}
