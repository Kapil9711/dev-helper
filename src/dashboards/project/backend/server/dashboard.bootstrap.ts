import open from "open";

import { dashboardServer } from "./dashboard.server";

import { websocketServer } from "./websocket.server";

import { processWrapper } from "../wrapper/process.wrapper";

import { metricsService } from "../services/metrics.service";

type BootstrapOptions = {
  command: string;

  args: string[];
};

export async function dashboardBootstrap({ command, args }: BootstrapOptions) {
  try {
    console.log("\n🚀 Starting Project Dashboard\n");

    /*
     * start http server
     */

    const server = await dashboardServer.start();

    /*
     * attach websocket
     */
    websocketServer.attach(server);

    /*
     * start wrapped project
     */
    await processWrapper.start({
      command,
      args,
    });

    /*
     * start metrics collection
     */
    metricsService.start();

    /*
     * open browser
     */
    await open("http://localhost:5173");

    console.log("✅ Dashboard Ready\n");
  } catch (error) {
    console.log("❌ Failed to start dashboard");

    console.error(error);

    process.exit(1);
  }
}
