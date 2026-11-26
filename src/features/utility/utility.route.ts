import { Command } from "commander";
import { utilityCommandController } from "./utility.controller.ts";

export class UtilityCommandRouter {
  register(program: Command) {
    const util = program
      .command("utility")
      .alias("util")
      .description("Start the MERN Developer Utility Dashboard")
      .option("-p, --port <port>", "Port to listen on", "4320")
      .option("--no-open", "Do not open browser automatically")
      .action(async (options: { port?: string; open?: boolean }) => {
        await utilityCommandController.utilityDashboard(options);
      });

    util
      .command("dashboard")
      .description("Launch the standalone Utility Dashboard")
      .option("-p, --port <port>", "Port to listen on", "4320")
      .option("--no-open", "Do not open browser automatically")
      .action(async (options: { port?: string; open?: boolean }) => {
        await utilityCommandController.utilityDashboard(options);
      });

    util
      .command("serve")
      .description("Serve the Utility Dashboard server")
      .option("-p, --port <port>", "Port to listen on", "4320")
      .option("--no-open", "Do not open browser automatically")
      .action(async (options: { port?: string; open?: boolean }) => {
        await utilityCommandController.utilityDashboard(options);
      });
  }
}

export const utilityCommandRouter = new UtilityCommandRouter();
