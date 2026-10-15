import { Command } from "commander";
import { createServer } from "node:http";
import sirv from "sirv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createLogsSocketServer } from "./logs.socket.js";
import { createLogsApi } from "./logs.api.js";
import { createLogsDatabase } from "./logs.database.js";

// Compiled route file:
// dist/features/logs/logs.route.js
//
// Published dashboard:
// dist/dashboard/index.html
const dashboardDirectory = resolve(__dirname, "../../dashboard");

export const logsCommandRouter = {
  register(program: Command) {
    const logs = program
      .command("logs")
      .description("Application logging tools");

    logs
      .command("serve")
      .description("Start the VH log collection server")
      .option("-p, --port <port>", "Port to listen on", "4317")
      .action((options: { port: string }) => {
        const port = Number(options.port);

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error("Port must be an integer from 1 to 65535");
        }

        const database = createLogsDatabase();
        const logsApi = createLogsApi(database.dbPath);

        const serveDashboard = sirv(dashboardDirectory, {
          dev: false,
          single: false,
        });

        const httpServer = createServer((req, res) => {
          const url = new URL(req.url ?? "/", "http://localhost");

          // Health endpoint
          if (url.pathname === "/health") {
            res.writeHead(200, {
              "content-type": "application/json",
            });

            res.end(
              JSON.stringify({
                ok: true,
                service: "vh-logs",
              }),
            );

            return;
          }

          // API routes must be handled before static files.
          if (logsApi.handle(req, res, url.pathname, url.searchParams)) {
            return;
          }

          // Serve the exported dashboard and its assets.
          serveDashboard(req, res, () => {
            res.writeHead(404, {
              "content-type": "text/plain; charset=utf-8",
            });

            res.end("Not found");
          });
        });

        const logsServer = createLogsSocketServer(httpServer);

        httpServer.listen(port, "0.0.0.0", () => {
          console.log(`[VH] Log server listening on port ${port}`);
          console.log(`[VH] Dashboard: http://localhost:${port}/`);
          console.log(`[VH] Health check: http://localhost:${port}/health`);
          console.log(`[VH] Logs API: http://localhost:${port}/api/logs`);
          console.log(
            `[VH] Network API: http://localhost:${port}/api/network-requests`,
          );
          console.log(`[VH] Apps API: http://localhost:${port}/api/apps`);
          console.log(`[VH] Database: ${database.dbPath}`);
        });

        let shuttingDown = false;

        const shutdown = () => {
          if (shuttingDown) return;
          shuttingDown = true;

          console.log("\n[VH] Shutting down log server...");

          logsApi.close();

          logsServer.io.close(() => {
            database.close();
            console.log("[VH] Log server stopped");
            process.exit(0);
          });
        };

        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      });
  },
};
