import { createServer } from "node:http";
import sirv from "sirv";
import { resolve } from "node:path";
import chalk from "chalk";
import { exec } from "../../shared/helpers/shell/exec.ts";
import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import {
  handleGitStatus,
  handleGitDiff,
  handleGitLog,
  handleGitBranches,
  handleGitAction,
  handleGitCommitShow,
  handleGitStashList,
  handleGitStashDiff,
  handleGitFileRead,
  handleGitFileWrite,
  handleGitLiveFiles,
  handleGitConfigGet,
  handleGitConfigSet,
  handleServerInfo,
} from "../logs/logs.git.api.ts";

const dashboardDirectory = resolve(__dirname, "../../dashboard");

export interface GitDashboardServerOptions {
  port?: number;
  open?: boolean;
}

export async function startGitDashboardServer(
  options: GitDashboardServerOptions = {},
): Promise<void> {
  const port = options.port || 4318;

  const isRepo = await gitHelper.isRepository();
  if (!isRepo) {
    console.error(
      chalk.red(
        "\nError: Current working directory is not a Git repository.\nRun `git init` or switch to a Git repository directory.\n",
      ),
    );
    process.exit(1);
  }

  const [repoRoot, currentBranchInfo] = await Promise.all([
    gitHelper.getRepositoryRoot().catch(() => process.cwd()),
    gitHelper.getCurrentBranch().catch(() => null),
  ]);

  const currentBranch = currentBranchInfo || "main";

  const serveDashboard = sirv(dashboardDirectory, {
    dev: false,
    single: false,
  });

  const httpServer = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization",
      });
      res.end();
      return;
    }

    // Health check
    if (url.pathname === "/health") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
      });
      res.end(JSON.stringify({ ok: true, service: "vh-git", repoRoot, currentBranch }));
      return;
    }

    // Server Info (identifies mode as "git")
    if (url.pathname === "/api/server-info") {
      void handleServerInfo("git", res);
      return;
    }

    // Git Status
    if (url.pathname === "/api/git/status") {
      void handleGitStatus(res);
      return;
    }

    // Git Diff
    if (url.pathname === "/api/git/diff") {
      void handleGitDiff(url.searchParams, res);
      return;
    }

    // Git Log
    if (url.pathname === "/api/git/log") {
      void handleGitLog(url.searchParams, res);
      return;
    }

    // Git Commit Show
    if (url.pathname === "/api/git/commit") {
      void handleGitCommitShow(url.searchParams, res);
      return;
    }

    // Git Branches
    if (url.pathname === "/api/git/branches") {
      void handleGitBranches(res);
      return;
    }

    // Git Stash List
    if (url.pathname === "/api/git/stash") {
      void handleGitStashList(res);
      return;
    }

    // Git Stash Diff
    if (url.pathname === "/api/git/stash/diff") {
      void handleGitStashDiff(url.searchParams, res);
      return;
    }

    // Git Action
    if (url.pathname === "/api/git/action") {
      if (req.method !== "POST") {
        res.writeHead(405, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }
      void handleGitAction(req, res);
      return;
    }

    // Git Live Files (for Live Editor)
    if (url.pathname === "/api/git/live-files") {
      void handleGitLiveFiles(res);
      return;
    }

    // Git File Read / Write (for Live Editor)
    if (url.pathname === "/api/git/file") {
      if (req.method === "POST") {
        void handleGitFileWrite(req, res);
      } else {
        void handleGitFileRead(url.searchParams, res);
      }
      return;
    }

    // Git Config (Get / Set)
    if (url.pathname === "/api/git/config") {
      if (req.method === "POST") {
        void handleGitConfigSet(req, res);
      } else {
        void handleGitConfigGet(res);
      }
      return;
    }

    // Apps & Logs mock/empty endpoints for dashboard compatibility
    if (url.pathname === "/api/apps") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [] }));
      return;
    }
    if (url.pathname === "/api/logs") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [], nextCursor: null }));
      return;
    }

    // Automatic redirect from root `/` to `/git/`
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(302, { Location: "/git/" });
      res.end();
      return;
    }

    // Serve static dashboard export
    serveDashboard(req, res, () => {
      res.writeHead(404, {
        "content-type": "text/plain; charset=utf-8",
      });
      res.end("Not found");
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    const dashboardUrl = `http://localhost:${port}/git/`;
    console.log(chalk.bold.hex("#10b981")("\n=============================================="));
    console.log(chalk.bold.hex("#10b981")("           VH GIT DASHBOARD SERVER            "));
    console.log(chalk.bold.hex("#10b981")("=============================================="));
    console.log(`${chalk.gray("Repository:")}  ${chalk.white.bold(repoRoot)}`);
    console.log(`${chalk.gray("Branch:")}      ${chalk.cyan.bold(currentBranch)}`);
    console.log(`${chalk.gray("Dashboard:")}   ${chalk.green.underline(dashboardUrl)}`);
    console.log(`${chalk.gray("Port:")}        ${chalk.yellow(port)}`);
    console.log(chalk.gray("----------------------------------------------"));
    console.log(chalk.gray("Press Ctrl+C to stop the Git Dashboard server.\n"));

    if (options.open !== false) {
      const openCmd =
        process.platform === "darwin"
          ? `open "${dashboardUrl}"`
          : process.platform === "win32"
          ? `start "" "${dashboardUrl}"`
          : `xdg-open "${dashboardUrl}"`;
      void exec(openCmd).catch(() => {});
    }
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(chalk.yellow("\n[VH] Shutting down Git Dashboard server..."));
    httpServer.close(() => {
      console.log(chalk.green("[VH] Git Dashboard server stopped"));
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
