import pidusage from "pidusage";
import { websocketServer } from "../server/websocket.server";
import { processWrapper } from "../wrapper/process.wrapper";
import { projectService } from "./project.service";
import { gitDashboardService } from "./git.service";
import os from "os";
import { systemService } from "./system.service";
import { mem } from "systeminformation";

class MetricsService {
  private timer?: NodeJS.Timeout;

  start() {
    this.timer = setInterval(
      async () => {
        try {
          const pid = processWrapper.getPid();

          if (!pid) {
            return;
          }

          const stats = await pidusage(pid);

          const project = projectService.getInfo();

          const git = await gitDashboardService.getInfo();

          const memory = systemService.getMemory();

          const cpu = systemService.getCpuUsage();

          const machine = systemService.getMachine();

          websocketServer.emit(
            "dashboard:update",

            {
              runtime: {
                pid,

                cpu: cpu,

                memory: memory,

                elapsed: stats.elapsed,

                uptime: process.uptime(),
              },

              project,

              git,
              system: {
                cpu,

                memory,

                machine,
              },
            },
          );
        } catch (error) {
          console.log(error);
        }
      },

      1000,
    );
  }

  stop() {
    clearInterval(this.timer);
  }
}

export const metricsService = new MetricsService();
