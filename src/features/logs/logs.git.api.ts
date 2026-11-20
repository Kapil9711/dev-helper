import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "../../shared/helpers/shell/exec.ts";
import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { workspaceWatcher } from "../git/workspace.watcher.ts";

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

function getLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
      return "typescript";
    case ".tsx":
      return "typescriptreact";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".jsx":
      return "javascriptreact";
    case ".json":
      return "json";
    case ".css":
      return "css";
    case ".html":
    case ".htm":
      return "html";
    case ".md":
    case ".markdown":
      return "markdown";
    case ".py":
      return "python";
    case ".sh":
    case ".bash":
    case ".zsh":
      return "shell";
    case ".yml":
    case ".yaml":
      return "yaml";
    case ".sql":
      return "sql";
    default:
      return "plaintext";
  }
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

export async function handleGitStashList(res: ServerResponse): Promise<void> {
  try {
    const result = await exec("git stash list", { timeout: 30000 });
    if (!result.success || !result.stdout.trim()) {
      sendJson(res, 200, { stashes: [] });
      return;
    }

    const stashes = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const colonIdx = line.indexOf(":");
        const ref = colonIdx !== -1 ? line.slice(0, colonIdx).trim() : line;
        const message = colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : "";
        return { ref, message };
      });

    sendJson(res, 200, { stashes });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to list stashes" });
  }
}

export async function handleGitStashDiff(
  searchParams: URLSearchParams,
  res: ServerResponse,
): Promise<void> {
  try {
    const stash = searchParams.get("stash") || "stash@{0}";
    const cleanStash = sanitizeArg(stash);
    const result = await exec(`git stash show -p "${cleanStash}"`, {
      timeout: 30000,
    });
    sendJson(res, 200, {
      stash: cleanStash,
      diff: result.stdout,
      error: result.stderr || null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to get stash diff" });
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
        remote?: string;
        stashRef?: string;
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
          let targetBranch = (payload.branch || "").trim();
          let remote = (payload.remote || "origin").trim();

          if (targetBranch) {
            // Strip remote prefix if provided (e.g. "origin/main" -> remote "origin", branch "main")
            if (targetBranch.startsWith(`${remote}/`)) {
              targetBranch = targetBranch.slice(remote.length + 1);
            } else if (targetBranch.includes("/") && !targetBranch.startsWith("refs/")) {
              const parts = targetBranch.split("/");
              remote = parts[0];
              targetBranch = parts.slice(1).join("/");
            }
            cmd = `git pull "${sanitizeArg(remote)}" "${sanitizeArg(targetBranch)}"`;
          } else {
            cmd = "git pull";
          }
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
          const stashRef = payload.stashRef ? sanitizeArg(payload.stashRef) : "";
          if (subAction === "pop") {
            cmd = stashRef ? `git stash pop "${stashRef}"` : "git stash pop";
          } else if (subAction === "apply") {
            cmd = stashRef ? `git stash apply "${stashRef}"` : "git stash apply";
          } else if (subAction === "drop") {
            cmd = stashRef ? `git stash drop "${stashRef}"` : "git stash drop";
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

        case "create-branch": {
          const branch = (payload.branch || "").trim();
          if (!branch) {
            sendJson(res, 400, { error: "Branch name is required" });
            return;
          }
          cmd = `git checkout -b "${sanitizeArg(branch)}"`;
          break;
        }

        case "delete-branch": {
          const branch = (payload.branch || "").trim();
          if (!branch) {
            sendJson(res, 400, { error: "Branch name is required" });
            return;
          }
          cmd = `git branch -D "${sanitizeArg(branch)}"`;
          break;
        }

        case "merge": {
          const branch = (payload.branch || "").trim();
          if (!branch) {
            sendJson(res, 400, { error: "Branch to merge is required" });
            return;
          }
          cmd = `git merge "${sanitizeArg(branch)}"`;
          break;
        }

        case "undo-commit": {
          cmd = "git reset --soft HEAD~1";
          break;
        }

        case "fetch": {
          cmd = "git fetch --prune --all";
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

export async function handleGitFileRead(
  searchParams: URLSearchParams,
  res: ServerResponse,
): Promise<void> {
  try {
    const rawPath = searchParams.get("path");
    if (!rawPath) {
      sendJson(res, 400, { error: "File path is required" });
      return;
    }

    const repoRoot = await gitHelper.getRepositoryRoot().catch(() => process.cwd());
    const sanitized = sanitizeArg(rawPath);
    const absolutePath = path.resolve(repoRoot, sanitized);

    if (!absolutePath.startsWith(repoRoot)) {
      sendJson(res, 403, { error: "Access denied: Path outside repository" });
      return;
    }

    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) {
      sendJson(res, 400, { error: "Target is not a file" });
      return;
    }

    if (stat.size > 5 * 1024 * 1024) {
      sendJson(res, 400, { error: "File too large (exceeds 5MB)" });
      return;
    }

    const content = await fs.readFile(absolutePath, "utf-8");
    const language = getLanguageFromPath(sanitized);

    const diffCheck = await exec(`git diff --name-only HEAD -- "${sanitized}"`);
    const isModified = diffCheck.stdout.trim().length > 0;

    sendJson(res, 200, {
      path: sanitized,
      content,
      mtime: stat.mtimeMs,
      size: stat.size,
      language,
      isModified,
    });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to read file" });
  }
}

export async function handleGitFileWrite(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const data = JSON.parse(body || "{}");
      const rawPath = (data.path || "").trim();
      const content = data.content;

      if (!rawPath || typeof content !== "string") {
        sendJson(res, 400, { error: "Valid path and content are required" });
        return;
      }

      const repoRoot = await gitHelper.getRepositoryRoot().catch(() => process.cwd());
      const sanitized = sanitizeArg(rawPath);
      const absolutePath = path.resolve(repoRoot, sanitized);

      if (!absolutePath.startsWith(repoRoot)) {
        sendJson(res, 403, { error: "Access denied: Path outside repository" });
        return;
      }

      await fs.writeFile(absolutePath, content, "utf-8");
      const stat = await fs.stat(absolutePath);

      sendJson(res, 200, {
        success: true,
        path: sanitized,
        mtime: stat.mtimeMs,
        size: stat.size,
      });
    } catch (err: unknown) {
      const error = err as Error;
      sendJson(res, 500, { error: error.message || "Failed to write file" });
    }
  });
}

export async function handleGitLiveFiles(res: ServerResponse): Promise<void> {
  try {
    const watcherFiles = workspaceWatcher.getActiveFiles();
    if (watcherFiles.length > 0) {
      sendJson(res, 200, {
        files: watcherFiles,
        activeFile: watcherFiles[0]?.path || null,
      });
      return;
    }

    const repoRoot = await gitHelper.getRepositoryRoot().catch(() => process.cwd());
    const statusRes = await exec("git status --porcelain=v1", { timeout: 15000 });
    const lines = statusRes.stdout.split("\n").filter(Boolean);

    const fileList: Array<{
      path: string;
      status: string;
      mtime: number;
      size: number;
      language: string;
    }> = [];

    for (const line of lines) {
      const status = line.slice(0, 2).trim();
      let rawPath = line.slice(3).trim();
      if (rawPath.includes(" -> ")) {
        rawPath = rawPath.split(" -> ")[1].trim();
      }
      rawPath = rawPath.replace(/^"|"$/g, "");
      const sanitized = sanitizeArg(rawPath);
      const absolutePath = path.resolve(repoRoot, sanitized);

      try {
        const stat = await fs.stat(absolutePath);
        if (stat.isFile()) {
          fileList.push({
            path: sanitized,
            status: status || "?",
            mtime: stat.mtimeMs,
            size: stat.size,
            language: getLanguageFromPath(sanitized),
          });
        }
      } catch {
        // Ignored
      }
    }

    fileList.sort((a, b) => b.mtime - a.mtime);

    if (fileList.length === 0) {
      const recentRes = await exec('git log -n 15 --name-only --pretty=""', { timeout: 15000 });
      const recentFiles = Array.from(new Set(recentRes.stdout.split("\n").filter(Boolean)));
      for (const rawPath of recentFiles) {
        const sanitized = sanitizeArg(rawPath.trim());
        const absolutePath = path.resolve(repoRoot, sanitized);
        try {
          const stat = await fs.stat(absolutePath);
          if (stat.isFile()) {
            fileList.push({
              path: sanitized,
              status: "clean",
              mtime: stat.mtimeMs,
              size: stat.size,
              language: getLanguageFromPath(sanitized),
            });
          }
        } catch {
          // Ignored
        }
        if (fileList.length >= 2) break;
      }
    }

    // Keep ONLY the current editing file and the last edited file (top 2 by mtime)
    const limitedFiles = fileList.slice(0, 2);

    sendJson(res, 200, {
      files: limitedFiles,
      activeFile: limitedFiles[0]?.path || null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to list live files" });
  }
}

export async function handleGitConfigGet(res: ServerResponse): Promise<void> {
  try {
    const [nameRes, emailRes, branchRes, remoteRes] = await Promise.all([
      exec("git config user.name").catch(() => ({ stdout: "" })),
      exec("git config user.email").catch(() => ({ stdout: "" })),
      exec("git config init.defaultBranch").catch(() => ({ stdout: "main" })),
      exec("git remote get-url origin").catch(() => ({ stdout: "" })),
    ]);

    sendJson(res, 200, {
      userName: nameRes.stdout.trim(),
      userEmail: emailRes.stdout.trim(),
      defaultBranch: branchRes.stdout.trim() || "main",
      remoteUrl: remoteRes.stdout.trim(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    sendJson(res, 500, { error: error.message || "Failed to get git config" });
  }
}

export async function handleGitConfigSet(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const data = JSON.parse(body || "{}");
      if (data.userName !== undefined) {
        await exec(`git config user.name "${sanitizeArg(data.userName)}"`);
      }
      if (data.userEmail !== undefined) {
        await exec(`git config user.email "${sanitizeArg(data.userEmail)}"`);
      }
      if (data.defaultBranch !== undefined) {
        await exec(`git config init.defaultBranch "${sanitizeArg(data.defaultBranch)}"`);
      }

      sendJson(res, 200, { success: true });
    } catch (err: unknown) {
      const error = err as Error;
      sendJson(res, 500, { error: error.message || "Failed to update git config" });
    }
  });
}

export async function handleServerInfo(
  mode: "git" | "logs",
  res: ServerResponse,
): Promise<void> {
  try {
    const repoRoot = await gitHelper.getRepositoryRoot().catch(() => process.cwd());
    const currentBranch = (await gitHelper.getCurrentBranch().catch(() => null)) || "main";
    const projectName = path.basename(repoRoot);

    sendJson(res, 200, {
      mode,
      service: mode === "git" ? "vh-git" : "vh-logs",
      repoRoot,
      currentBranch,
      projectName,
    });
  } catch {
    sendJson(res, 200, {
      mode,
      service: mode === "git" ? "vh-git" : "vh-logs",
      repoRoot: process.cwd(),
      currentBranch: "main",
      projectName: "dev-helper",
    });
  }
}
