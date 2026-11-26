import { Command } from "commander";
import { createServer, type Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import sirv from "sirv";
import { resolve } from "node:path";
import chalk from "chalk";

import { createLogsSocketServer } from "./logs.socket.js";
import { createLogsApi } from "./logs.api.js";
import { createLogsDatabase } from "./logs.database.js";
import { findAvailablePort } from "../../shared/helpers/server/port.helper.ts";
import { BROWSER_CLIENT_SCRIPT } from "./client.script.ts";
import type { IncomingVHEvent } from "./logs.database.ts";

const dashboardDirectory = resolve(__dirname, "../../dashboard");

export interface RunningLogsServer {
  httpServer: HttpServer;
  logsServer: ReturnType<typeof createLogsSocketServer>;
  database: ReturnType<typeof createLogsDatabase>;
  logsApi: ReturnType<typeof createLogsApi>;
  port: number;
  dashboardUrl: string;
}

export async function startLogsServer(
  options: { port?: number | string } = {}
): Promise<RunningLogsServer> {
  const requestedPort = Number(options.port) || 4317;

  if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
    throw new Error("Port must be an integer from 1 to 65535");
  }

  const { port, wasChanged } = await findAvailablePort(requestedPort, "0.0.0.0");
  if (wasChanged) {
    console.log(
      chalk.yellow(`[VH] Notice: Port ${requestedPort} is in use. Using next available port ${port}.`)
    );
  }

  const database = createLogsDatabase();
  const logsApi = createLogsApi(database.dbPath);

  const serveDashboard = sirv(dashboardDirectory, {
    dev: false,
    single: false,
  });

  let logsServerInstance: ReturnType<typeof createLogsSocketServer>;

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    // 1. CORS Preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization, x-vh-app",
      });
      res.end();
      return;
    }

    // 2. Health check
    if (url.pathname === "/health") {
      res.writeHead(200, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      });
      res.end(
        JSON.stringify({
          ok: true,
          service: "vh-logs",
          port,
        })
      );
      return;
    }

    // 3. Universal In-Browser Client Script (/client.js & /vh-client.js)
    if (url.pathname === "/client.js" || url.pathname === "/vh-client.js") {
      res.writeHead(200, {
        "content-type": "application/javascript; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-cache",
      });
      res.end(BROWSER_CLIENT_SCRIPT);
      return;
    }

    // 4. HTTP Event Ingestion API (/api/events & /api/ingest)
    if (
      (url.pathname === "/api/events" || url.pathname === "/api/ingest") &&
      req.method === "POST"
    ) {
      let rawBody = "";
      req.on("data", (chunk) => {
        rawBody += chunk;
        if (rawBody.length > 20 * 1024 * 1024) {
          req.destroy();
        }
      });

      req.on("end", async () => {
        try {
          const parsed = JSON.parse(rawBody || "[]");
          const rawEvents: any[] = Array.isArray(parsed) ? parsed : [parsed];
          const defaultApp = (req.headers["x-vh-app"] as string) || "web-client";

          const events: IncomingVHEvent[] = rawEvents.map((ev) => {
            const eventId = typeof ev.eventId === "string" && ev.eventId ? ev.eventId : randomUUID();
            const appName = typeof ev.appName === "string" && ev.appName
              ? ev.appName
              : (typeof ev.app === "string" && ev.app ? ev.app : defaultApp);
            const timestamp = typeof ev.timestamp === "number" && Number.isFinite(ev.timestamp)
              ? ev.timestamp
              : Date.now();
            const type = ev.type === "network:req" || ev.type === "network:res" ? ev.type : "log";

            if (type === "log") {
              const level = typeof ev.level === "string"
                ? ev.level
                : (typeof ev.data?.level === "string" ? ev.data.level : "info");
              const message = typeof ev.message === "string"
                ? ev.message
                : (typeof ev.data?.message === "string"
                    ? ev.data.message
                    : (typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data ?? ev)));

              return {
                ...ev,
                eventId,
                appName,
                timestamp,
                type: "log",
                level,
                message: message || "(empty log)",
                data: ev.data !== undefined ? ev.data : null,
              };
            }

            return {
              ...ev,
              eventId,
              appName,
              timestamp,
              type,
            };
          });

          const persistedIds = await logsServerInstance.ingestEvents(events);

          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          });
          res.end(
            JSON.stringify({
              ok: true,
              count: events.length,
              eventIds: persistedIds,
            })
          );
        } catch (err: any) {
          res.writeHead(400, {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          });
          res.end(
            JSON.stringify({
              ok: false,
              error: err.message || "Failed to ingest events",
            })
          );
        }
      });
      return;
    }

    // 5. Open Chrome Window API (/api/logs/open-window)
    if (url.pathname === "/api/logs/open-window" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", (c) => (bodyStr += c));
      req.on("end", async () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const { startChromeWindow } = await import("./logs.window.js");
          // Non-blocking trigger in background
          void startChromeWindow({
            port,
            url: body.url,
            app: body.app,
            autoStartServer: false,
          }).catch((err) => {
            console.error(chalk.red(`[VH Window] Error: ${err.message}`));
          });

          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          });
          res.end(JSON.stringify({ ok: true, message: "Chrome window launched" }));
        } catch (e: any) {
          res.writeHead(400, {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    // 6. Handle standard logs database API routes
    if (logsApi.handle(req, res, url.pathname, url.searchParams)) {
      return;
    }

    // 7. Serve the static dashboard UI
    serveDashboard(req, res, () => {
      res.writeHead(404, {
        "content-type": "text/plain; charset=utf-8",
      });
      res.end("Not found");
    });
  });

  logsServerInstance = createLogsSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(port, "0.0.0.0", () => resolve());
  });

  const dashboardUrl = `http://localhost:${port}/`;
  return {
    httpServer,
    logsServer: logsServerInstance,
    database,
    logsApi,
    port,
    dashboardUrl,
  };
}

export const logsCommandRouter = {
  register(program: Command) {
    const logs = program
      .command("logs")
      .description("Application logging & Chrome window observability tools");

    // 1. vh logs serve
    logs
      .command("serve")
      .alias("server")
      .description("Start the VH log collection server")
      .option("-p, --port <port>", "Port to listen on", "4317")
      .action(async (options: { port: string }) => {
        const { port, dashboardUrl, logsApi, logsServer, database } =
          await startLogsServer({ port: options.port });

        console.log(chalk.bold.hex("#06b6d4")("\n┌────────────────────────────────────────────────────────┐"));
        console.log(chalk.bold.hex("#06b6d4")("│                 ⚡ VH LOGS SERVER ⚡                   │"));
        console.log(chalk.bold.hex("#06b6d4")("└────────────────────────────────────────────────────────┘"));
        console.log(chalk.white(`  • Dashboard:     ${chalk.bold.cyan(dashboardUrl)}`));
        console.log(chalk.white(`  • Port:          ${chalk.green(port)}`));
        console.log(chalk.gray(`  • Client Script: ${chalk.white(`http://localhost:${port}/client.js`)}`));
        console.log(chalk.gray(`  • Ingestion API: ${chalk.white(`http://localhost:${port}/api/events`)}`));
        console.log(chalk.gray(`  • Database:      ${chalk.dim(database.dbPath)}`));
        console.log(chalk.cyan(`\nTip: Run ${chalk.bold("`vh logs window [url]`")} to open an automated Chrome capture window.`));
        console.log(chalk.dim("Press Ctrl+C to stop the log server.\n"));

        let shuttingDown = false;
        const shutdown = () => {
          if (shuttingDown) return;
          shuttingDown = true;
          console.log(chalk.yellow("\n[VH] Shutting down log server..."));
          logsApi.close();
          logsServer.close();
          console.log(chalk.gray("[VH] Log server stopped."));
          process.exit(0);
        };

        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      });

    // 2. vh logs window [url]
    logs
      .command("window [url]")
      .alias("browser")
      .description(
        "Launch an automated Chrome window that feeds live logs and network requests from any visited website into your Logs Dashboard"
      )
      .option("-p, --port <port>", "Port of the VH logs server", "4317")
      .option("--cdp-port <port>", "Chrome DevTools Protocol port", "9222")
      .option("--app <name>", "Override app name (default: website domain)")
      .option("--no-server", "Do not auto-start logs server if not running")
      .action(async (url: string | undefined, options: any) => {
        const { startChromeWindow } = await import("./logs.window.js");
        await startChromeWindow({
          url,
          port: options.port,
          cdpPort: options.cdpPort,
          app: options.app,
          autoStartServer: options.server !== false,
        });
      });
  },
};
