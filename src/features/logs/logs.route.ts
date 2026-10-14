import { Command } from "commander";
import { createServer } from "node:http";
import { createLogsSocketServer } from "./logs.socket.js";

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

        const httpServer = createServer((req, res) => {
          if (req.url === "/health") {
            res.writeHead(200, {
              "content-type": "application/json",
            });
            res.end(JSON.stringify({ ok: true, service: "vh-logs" }));
            return;
          }

          res.writeHead(404, {
            "content-type": "application/json",
          });
          res.end(JSON.stringify({ error: "Not found" }));
        });

        const logsServer = createLogsSocketServer(httpServer);

        httpServer.listen(port, "0.0.0.0", () => {
          console.log(`[VH] Log server listening on port ${port}`);
          console.log(`[VH] Health check: http://localhost:${port}/health`);
        });

        const shutdown = () => {
          console.log("\n[VH] Shutting down log server...");

          logsServer.io.close(() => {
            console.log("[VH] Log server stopped");
            process.exit(0);
          });
        };

        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      });
  },
};
