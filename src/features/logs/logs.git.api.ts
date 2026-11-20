import type { IncomingMessage, ServerResponse } from "node:http";
import { exec } from "../../shared/helpers/shell/exec.ts";
import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(body));
}

function sanitizeArg(val: string): string {
  // Allow normal file paths, branch names, commit hashes without dangerous shell chars
  return val.replace(/[`$;&|<>"\n\r]/g, "");
}

export async function handleGitStatus(res: ServerResponse): Promise<void> {
  try {
    const isRepo = await gitHelper.isRepository();
    if (!isRepo) {
      sendJson(res, 200, {
        isRepo: false,
        currentBranch: null,
        files: [],
        summary: null,
        repoRoot: "",
      });
      return;
    }

    const [status, repoRoot] = await Promise.all([
      gitHelper.getStatus(),
      gitHelper.getRepositoryRoot().catch(() => ""),
    ]);

    sendJson(res, 200, {
      isRepo: true,
      currentBranch: status.currentBranch,
      files: status.files,
      summary: status.summary,
      repoRoot,
    });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to get git status" });
  }
}

export async function handleGitDiff(
  searchParams: URLSearchParams,
  res: ServerResponse,
): Promise<void> {
  try {
    const file = searchParams.get("file");
    const staged = searchParams.get("staged") === "true";

    let cmd = staged ? "git diff --staged" : "git diff";
    if (file) {
      cmd += ` -- "${sanitizeArg(file)}"`;
    }

    const result = await exec(cmd, { timeout: 30000 });
    sendJson(res, 200, { diff: result.stdout, error: result.stderr || null });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to get diff" });
  }
}

export async function handleGitLog(
  searchParams: URLSearchParams,
  res: ServerResponse,
): Promise<void> {
  try {
    const limitStr = searchParams.get("limit") || "50";
    const limit = Math.min(Math.max(Number(limitStr) || 50, 1), 100);

    const cmd = `git log -n ${limit} --pretty=format:"%H|%h|%an|%ae|%ad|%ar|%d|%p|%s" --date=short`;
    const result = await exec(cmd, { timeout: 30000 });

    if (!result.success) {
      sendJson(res, 200, { commits: [] });
      return;
    }

    const commits = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [
          hash,
          shortHash,
          author,
          email,
          date,
          relativeDate,
          rawRefs,
          rawParents,
          ...messageParts
        ] = line.split("|");

        let refs: string[] = [];
        if (rawRefs) {
          const trimmed = rawRefs.trim().replace(/^\(|\)$/g, "").trim();
          if (trimmed) {
            refs = trimmed.split(",").map((r) => r.trim()).filter(Boolean);
          }
        }

        const parents = rawParents ? rawParents.trim().split(" ").filter(Boolean) : [];

        return {
          hash: hash || "",
          shortHash: shortHash || "",
          author: author || "",
          email: email || "",
          date: date || "",
          relativeDate: relativeDate || "",
          refs,
          parents,
          message: messageParts.join("|") || "",
        };
      });

    sendJson(res, 200, { commits });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to get git log" });
  }
}

export async function handleGitCommitShow(
  searchParams: URLSearchParams,
  res: ServerResponse,
): Promise<void> {
  try {
    const hash = searchParams.get("hash");
    if (!hash) {
      sendJson(res, 400, { error: "Commit hash is required" });
      return;
    }
    const cleanHash = sanitizeArg(hash);
    const result = await exec(`git show --stat --patch "${cleanHash}"`, {
      timeout: 30000,
    });
    sendJson(res, 200, {
      hash: cleanHash,
      output: result.stdout,
      error: result.stderr || null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to show commit" });
  }
}

export async function handleGitBranches(res: ServerResponse): Promise<void> {
  try {
    const branches = await gitHelper.getBranches("all");
    sendJson(res, 200, { branches });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to get branches" });
  }
}

export async function handleGitAction(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let bodyStr = "";
  req.on("data", (chunk: Buffer) => {
    bodyStr += chunk.toString("utf8");
    if (bodyStr.length > 1e6) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    try {
      const payload = (JSON.parse(bodyStr || "{}") || {}) as {
        action?: string;
        files?: string[];
        file?: string;
        message?: string;
        branch?: string;
        subAction?: string;
      };

      const action = payload.action;

      if (!action) {
        sendJson(res, 400, { error: "Action is required" });
        return;
      }

      let cmd = "";

      switch (action) {
        case "stage": {
          const files = Array.isArray(payload.files) ? payload.files : [];
          if (files.length === 0 || files.includes(".")) {
            cmd = "git add -A";
          } else {
            const cleanFiles = files.map((f) => `"${sanitizeArg(f)}"`).join(" ");
            cmd = `git add ${cleanFiles}`;
          }
          break;
        }

        case "unstage": {
          const files = Array.isArray(payload.files) ? payload.files : [];
          if (files.length === 0 || files.includes(".")) {
            cmd = "git restore --staged .";
          } else {
            const cleanFiles = files.map((f) => `"${sanitizeArg(f)}"`).join(" ");
            cmd = `git restore --staged ${cleanFiles}`;
          }
          break;
        }

        case "commit": {
          const message = (payload.message || "").trim();
          if (!message) {
            sendJson(res, 400, { error: "Commit message is required" });
            return;
          }
          // Escape single quotes for shell string
          const safeMsg = message.replace(/'/g, "'\\''");
          cmd = `git commit -m '${safeMsg}'`;
          break;
        }

        case "push": {
          cmd = "git push";
          break;
        }

        case "pull": {
          cmd = "git pull";
          break;
        }

        case "checkout": {
          const branch = (payload.branch || "").trim();
          if (!branch) {
            sendJson(res, 400, { error: "Branch name is required" });
            return;
          }
          cmd = `git checkout "${sanitizeArg(branch)}"`;
          break;
        }

        case "discard": {
          const file = (payload.file || "").trim();
          if (!file) {
            sendJson(res, 400, { error: "File path is required" });
            return;
          }
          const cleanFile = sanitizeArg(file);
          // Try restoring working copy; if it's untracked, clean it
          cmd = `git restore "${cleanFile}" 2>/dev/null || git clean -f "${cleanFile}"`;
          break;
        }

        case "stash": {
          const subAction = payload.subAction || "push";
          if (subAction === "pop") {
            cmd = "git stash pop";
          } else if (subAction === "apply") {
            cmd = "git stash apply";
          } else if (subAction === "drop") {
            cmd = "git stash drop";
          } else if (subAction === "list") {
            cmd = "git stash list";
          } else {
            const msg = (payload.message || "").trim();
            cmd = msg
              ? `git stash push -m '${msg.replace(/'/g, "'\\''")}'`
              : "git stash push";
          }
          break;
        }

        default: {
          sendJson(res, 400, { error: `Unsupported git action: ${action}` });
          return;
        }
      }

      const result = await exec(cmd, { timeout: 60000 });

      sendJson(res, result.success ? 200 : 400, {
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        command: cmd,
        durationMs: result.durationMs,
      });
    } catch (err: unknown) {
      const error = err as Error;
      sendJson(res, 500, { error: error.message || "Failed to execute git action" });
    }
  });
}
