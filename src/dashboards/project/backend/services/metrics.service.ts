import pidusage from "pidusage";

import { websocketServer } from "../server/websocket.server";

import { processWrapper } from "../wrapper/process.wrapper";

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

          websocketServer.emit(
            "metrics",

            {
              pid,

              cpu: stats.cpu,

              memory: stats.memory,

              elapsed: stats.elapsed,

              uptime: process.uptime(),
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
