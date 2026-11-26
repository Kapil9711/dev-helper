import { startUtilityDashboardServer } from "./utility.server.ts";

export class UtilityCommandController {
  async utilityDashboard(options: { port?: string; open?: boolean } = {}) {
    const port = options.port ? Number(options.port) : 4320;
    await startUtilityDashboardServer({
      port,
      open: options.open !== false,
    });
  }
}

export const utilityCommandController = new UtilityCommandController();
