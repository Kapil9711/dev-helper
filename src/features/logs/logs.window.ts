import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import chalk from "chalk";
import { findAvailablePort } from "../../shared/helpers/server/port.helper.ts";
import { BROWSER_CLIENT_SCRIPT } from "./client.script.ts";
import type { IncomingVHEvent } from "./logs.database.ts";

export interface ChromeWindowOptions {
  port?: number | string;
  cdpPort?: number | string;
  url?: string;
  app?: string;
  autoStartServer?: boolean;
}

export function findChromeExecutable(): string | null {
  const platform = process.platform;

  if (platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
      join(homedir(), "Applications/Chromium.app/Contents/MacOS/Chromium"),
    ];

    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
  } else if (platform === "win32") {
    const prefixes = [
      process.env.LOCALAPPDATA,
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
    ];

    for (const prefix of prefixes) {
      if (!prefix) continue;
      const c = join(prefix, "Google", "Chrome", "Application", "chrome.exe");
      if (existsSync(c)) return c;
    }
  } else {
    // Linux
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ];

    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
  }

  return null;
}

export async function isServerHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; service?: string };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function startChromeWindow(options: ChromeWindowOptions = {}): Promise<void> {
  const logsPort = Number(options.port) || 4317;
  const requestedCdpPort = Number(options.cdpPort) || 9222;

  // 1. Verify / Auto-start logs server
  const healthy = await isServerHealthy(logsPort);
  if (!healthy) {
    if (options.autoStartServer === false) {
      throw new Error(`VH Log server is not reachable on port ${logsPort}. Please run \`vh logs serve\` first.`);
    }

    console.log(chalk.cyan(`[VH Window] Starting embedded logs server on port ${logsPort}...`));
    const { startLogsServer } = await import("./logs.route.js");
    await startLogsServer({ port: logsPort });
  }

  // 2. Locate Google Chrome
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error(
      "Google Chrome could not be located on your machine. Please ensure Google Chrome or Chromium is installed at default system paths."
    );
  }

  // 3. Resolve CDP Port
  const { port: cdpPort } = await findAvailablePort(requestedCdpPort, "127.0.0.1");

  // 4. Dedicated Debug Profile Dir
  const profileDir = join(homedir(), ".vh-dev-helper", "chrome-profile");
  mkdirSync(profileDir, { recursive: true });

  // 5. Target URL
  let targetUrl = options.url?.trim() || `http://localhost:${logsPort}`;
  if (!/^https?:\/\//i.test(targetUrl) && !/^about:/i.test(targetUrl)) {
    targetUrl = `http://${targetUrl}`;
  }

  console.log(chalk.bold.hex("#06b6d4")("\n┌────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.hex("#06b6d4")("│             ⚡ VH LOGS CHROME WINDOW ⚡                 │"));
  console.log(chalk.bold.hex("#06b6d4")("└────────────────────────────────────────────────────────┘"));
  console.log(chalk.white(`  • Chrome Window:  ${chalk.green.bold("Starting...")}`));
  console.log(chalk.white(`  • Logs Server:    ${chalk.cyan(`http://localhost:${logsPort}`)}`));
  console.log(chalk.gray(`  • CDP Port:       ${chalk.white(cdpPort)}`));
  console.log(chalk.gray(`  • Initial URL:    ${chalk.white(targetUrl)}`));
  console.log(chalk.gray(`  • Profile:        ${chalk.dim(profileDir)}`));
  console.log(chalk.cyan("\n[VH Window] Launching isolated Chrome window with remote debugging...\n"));

  // 6. Spawn Chrome
  const chromeProcess: ChildProcess = spawn(
    chromePath,
    [
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,900",
      targetUrl,
    ],
    {
      detached: false,
      stdio: "ignore",
    }
  );

  chromeProcess.on("error", (err) => {
    console.error(chalk.red(`[VH Window] Failed to spawn Chrome: ${err.message}`));
  });

  // 7. Wait for CDP Endpoint
  let wsDebuggerUrl: string | null = null;
  const maxAttempts = 30;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`, {
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) {
        const data = (await res.json()) as { webSocketDebuggerUrl?: string };
        if (data.webSocketDebuggerUrl) {
          wsDebuggerUrl = data.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 250));
  }

  if (!wsDebuggerUrl) {
    throw new Error(`Failed to connect to Chrome debugging endpoint at port ${cdpPort}. Chrome failed to initialize.`);
  }

  console.log(chalk.green(`✓ Chrome DevTools Protocol connected (${wsDebuggerUrl})`));
  console.log(chalk.yellow(`\nAll console logs and network traffic across tabs will be captured and fed into your dashboard.`));
  console.log(chalk.dim("Press Ctrl+C to close window session.\n"));

  // 8. Connect to CDP WebSocket
  const ws = new WebSocket(wsDebuggerUrl);
  let nextMsgId = 1;
  const pendingRequests = new Map<number, (res: any) => void>();

  function sendCdp(method: string, params: Record<string, any> = {}, sessionId?: string): Promise<any> {
    return new Promise((resolve) => {
      const id = nextMsgId++;
      pendingRequests.set(id, resolve);
      const msg: Record<string, any> = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    });
  }

  // Cache for network response metadata and timing
  interface RequestState {
    method: string;
    url: string;
    startTime: number;
    appName: string;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  }

  const activeNetworkMap = new Map<string, RequestState>();
  const activeSessions = new Map<string, { targetUrl?: string }>();

  async function postEvents(events: IncomingVHEvent[]): Promise<void> {
    if (events.length === 0) return;
    try {
      await fetch(`http://localhost:${logsPort}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(events),
        signal: AbortSignal.timeout(3000),
      });
    } catch (e: any) {
      // Quiet fail if network transient
    }
  }

  function resolveAppName(urlStr: string): string {
    if (options.app) return options.app;
    try {
      const u = new URL(urlStr);
      return u.host || u.hostname || "chrome-window";
    } catch {
      return "chrome-window";
    }
  }

  ws.onopen = async () => {
    // Auto-attach to all targets (existing and future tabs)
    await sendCdp("Target.setAutoAttach", {
      autoAttach: true,
      waitForDebuggerOnStart: false,
      flatten: true,
    });
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data.toString());

      // Response to a direct command
      if (data.id && pendingRequests.has(data.id)) {
        const resolve = pendingRequests.get(data.id)!;
        pendingRequests.delete(data.id);
        resolve(data.result);
        return;
      }

      const method = data.method as string;
      const params = data.params || {};
      const sessionId = data.sessionId as string | undefined;

      // New tab attached
      if (method === "Target.attachedToTarget") {
        const sid = params.sessionId as string;
        activeSessions.set(sid, { targetUrl: params.targetInfo?.url });

        // Enable domains
        await sendCdp("Page.enable", {}, sid);
        await sendCdp("Runtime.enable", {}, sid);
        await sendCdp(
          "Network.enable",
          { maxTotalBufferSize: 10000000, maxResourceBufferSize: 5000000 },
          sid
        );

        // Preload client script into document for in-page hooks
        await sendCdp(
          "Page.addScriptToEvaluateOnNewDocument",
          { source: BROWSER_CLIENT_SCRIPT },
          sid
        );
        return;
      }

      if (method === "Target.detachedFromTarget") {
        if (params.sessionId) activeSessions.delete(params.sessionId);
        return;
      }

      // Page URL navigation
      if (method === "Page.frameNavigated" && params.frame && !params.frame.parentId && sessionId) {
        const session = activeSessions.get(sessionId);
        if (session) {
          session.targetUrl = params.frame.url;
        }
      }

      // 1. Console Logs
      if (method === "Runtime.consoleAPICalled") {
        const session = sessionId ? activeSessions.get(sessionId) : undefined;
        const pageUrl = session?.targetUrl || targetUrl;
        const appName = resolveAppName(pageUrl);

        const args = (params.args || []) as any[];
        const formatted = args
          .map((a: any) => {
            if (a.value !== undefined) return typeof a.value === "string" ? a.value : JSON.stringify(a.value);
            if (a.description) return a.description;
            return a.type || "";
          })
          .join(" ");

        const logType = (params.type || "log") as string;
        const level =
          logType === "warning" ? "warn" : logType === "error" ? "error" : logType === "info" ? "info" : "log";

        const logEvent: IncomingVHEvent = {
          eventId: `cdp_log_${randomUUID().slice(0, 8)}`,
          appName,
          timestamp: Math.round(params.timestamp || Date.now()),
          type: "log",
          level,
          message: formatted || "(console log)",
          data: args.length > 0 ? args.map((a: any) => a.value ?? a.description) : undefined,
        };

        void postEvents([logEvent]);

        // Terminal Live Echo
        const levelBadge =
          level === "error"
            ? chalk.bgRed.black(` ${level.toUpperCase()} `)
            : level === "warn"
            ? chalk.bgYellow.black(` ${level.toUpperCase()} `)
            : chalk.bgBlue.black(` ${level.toUpperCase()} `);

        console.log(`${levelBadge} ${chalk.dim(`[${appName}]`)} ${formatted}`);
        return;
      }

      // 2. Network Request Sent
      if (method === "Network.requestWillBeSent") {
        const req = params.request || {};
        const reqUrl = req.url as string;

        // Ignore internal logs server traffic
        if (reqUrl.startsWith(`http://localhost:${logsPort}/api/events`)) return;

        const appName = resolveAppName(reqUrl);
        const startTime = Math.round((params.wallTime || Date.now() / 1000) * 1000);

        activeNetworkMap.set(params.requestId, {
          method: req.method,
          url: reqUrl,
          startTime,
          appName,
        });

        const reqEvent: IncomingVHEvent = {
          eventId: `cdp_nreq_${randomUUID().slice(0, 8)}`,
          appName,
          timestamp: startTime,
          type: "network:req",
          requestId: params.requestId,
          method: req.method,
          url: reqUrl,
          headers: req.headers,
          body: req.postData,
        };

        void postEvents([reqEvent]);
        return;
      }

      // 3. Network Response Received
      if (method === "Network.responseReceived") {
        const state = activeNetworkMap.get(params.requestId);
        if (state) {
          state.status = params.response?.status;
          state.statusText = params.response?.statusText;
          state.headers = params.response?.headers;
        }
        return;
      }

      // 4. Network Loading Finished (Retrieve body and emit response)
      if (method === "Network.loadingFinished") {
        const state = activeNetworkMap.get(params.requestId);
        if (state) {
          activeNetworkMap.delete(params.requestId);
          const durationMs = Math.max(1, Date.now() - state.startTime);

          let bodyText: string | undefined;
          if (sessionId) {
            try {
              const bodyRes = await sendCdp(
                "Network.getResponseBody",
                { requestId: params.requestId },
                sessionId
              );
              if (bodyRes && bodyRes.body) {
                bodyText = bodyRes.base64Encoded
                  ? Buffer.from(bodyRes.body, "base64").toString("utf8")
                  : bodyRes.body;
              }
            } catch {
              // Body could be stream or already evicted
            }
          }

          const resEvent: IncomingVHEvent = {
            eventId: `cdp_nres_${randomUUID().slice(0, 8)}`,
            appName: state.appName,
            timestamp: Date.now(),
            type: "network:res",
            requestId: params.requestId,
            status: state.status || 200,
            statusText: state.statusText || "OK",
            headers: state.headers,
            body: bodyText,
            durationMs,
          };

          void postEvents([resEvent]);

          // Terminal Live Echo
          const statusChalk =
            (state.status || 200) < 400
              ? chalk.green.bold(state.status || 200)
              : chalk.red.bold(state.status || 500);

          console.log(
            `${chalk.bold.cyan("→")} ${chalk.bold(state.method)} ${state.url} (${statusChalk} · ${chalk.dim(`${durationMs}ms`)})`
          );
        }
        return;
      }

      // 5. Network Loading Failed
      if (method === "Network.loadingFailed") {
        const state = activeNetworkMap.get(params.requestId);
        if (state) {
          activeNetworkMap.delete(params.requestId);
          const durationMs = Math.max(1, Date.now() - state.startTime);

          const resEvent: IncomingVHEvent = {
            eventId: `cdp_nerr_${randomUUID().slice(0, 8)}`,
            appName: state.appName,
            timestamp: Date.now(),
            type: "network:res",
            requestId: params.requestId,
            status: 0,
            error: params.errorText || "Network Failed",
            durationMs,
          };

          void postEvents([resEvent]);

          console.log(
            `${chalk.bold.red("✖")} ${chalk.bold(state.method)} ${state.url} (${chalk.red(params.errorText || "FAILED")})`
          );
        }
        return;
      }
    } catch (e: any) {
      // Ignore parser error on unexpected CDP message
    }
  };

  ws.onerror = () => {
    console.error(chalk.red("[VH Window] WebSocket error occurred on debugging stream."));
  };

  // 9. Graceful Exit on Process Termination or Window Close
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    console.log(chalk.yellow("\n[VH Window] Closing Chrome window session..."));
    try {
      ws.close();
    } catch {}
    try {
      chromeProcess.kill();
    } catch {}
    process.exit(0);
  };

  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  chromeProcess.on("exit", () => {
    if (!closed) {
      console.log(chalk.gray("\n[VH Window] Chrome window was closed by user."));
      cleanup();
    }
  });

  // Keep process open
  await new Promise<void>(() => {});
}
