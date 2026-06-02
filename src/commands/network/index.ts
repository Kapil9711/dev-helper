import { Command } from "commander";

import { netInspectCommand } from "./inspect.command";
import { sslCommand } from "./ssl.command";
import { traceCommand } from "./trace.command";
import { portsCommand } from "./ports.command";
import { discoverCommand } from "./discover.command";

export function registerNetworkCommands(program: Command) {
  const net = program
    .command("net")
    .description("Network utilities")
    .addHelpText(
      "after",

      `
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
`,
    );

  netInspectCommand(net);

  sslCommand(net);

  traceCommand(net);
  portsCommand(net);
  discoverCommand(net);
}
