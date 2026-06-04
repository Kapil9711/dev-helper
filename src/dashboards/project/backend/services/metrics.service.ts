import pidusage from "pidusage";
import { websocketServer } from "../server/websocket.server";
import { processWrapper } from "../wrapper/process.wrapper";
import { projectService } from "./project.service";
import { gitDashboardService } from "./git.service";
import os from "os";
import { systemService } from "./system.service";
import { mem } from "systeminformation";
import { expoConfigService } from "./expo/expo-config.service";
import { buildService } from "./expo/expo-build.service";
import { permissionService } from "./expo/expo-permision.service";
import { assetService } from "./expo/expo-assets.service";
import { riskService } from "./expo/expo-risk.service";
import { expoAnalysisService } from "./expo/expo-anylics.service";
import { dashboardAggregatorService } from "./expo/expo-dashboard.service";
import { packageService } from "./expo/expo-package.service";

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

          const memory = systemService.getMemory();
          const cpu = systemService.getCpuUsage();
          const machine = systemService.getMachine();
          const config = expoConfigService.getConfig();

          const packageInfo = packageService.getPackages();

          const packages = packageInfo.dependencies;

          const dashboard = await dashboardAggregatorService.build({
            config,

            packages,
          });

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
              system: {
                cpu,

                memory,

                machine,
              },
              ...dashboard,
            },
          );
        } catch (error) {
          console.log(error);
        }
      },

      1200,
    );
  }

  stop() {
    clearInterval(this.timer);
  }
}

export const metricsService = new MetricsService();
