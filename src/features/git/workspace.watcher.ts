import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

export interface WorkspaceLiveFile {
  path: string;
  status: "M" | "A" | "clean";
  mtime: number;
  size: number;
  language: string;
  tag: "Current Editing" | "Last Edited";
  isNew?: boolean;
}

export interface WorkspaceCurrentFile {
  path: string;
  content: string;
  mtime: number;
  size: number;
  language: string;
  isNew?: boolean;
  lastEventAt: number;
}

export function getLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".json":
      return "json";
    case ".css":
    case ".scss":
    case ".sass":
      return "css";
    case ".html":
      return "html";
    case ".md":
    case ".mdx":
      return "markdown";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".sh":
    case ".bash":
    case ".zsh":
      return "shell";
    case ".py":
      return "python";
    case ".go":
      return "go";
    case ".rs":
      return "rust";
    case ".sql":
      return "sql";
    default:
      return "plaintext";
  }
}

export function isIgnoredPath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  const segments = normalized.split("/");

  for (const seg of segments) {
    if (
      seg === ".git" ||
      seg === "node_modules" ||
      seg === ".next" ||
      seg === "dist" ||
      seg === "out" ||
      seg === "build" ||
      seg === ".gemini" ||
      seg === ".vscode" ||
      seg === ".idea" ||
      seg === ".turbo" ||
      seg === "coverage" ||
      seg.startsWith(".git")
    ) {
      return true;
    }
  }

  const filename = segments[segments.length - 1];
  if (!filename) return true;

  // Ignore dotfiles except common config files
  if (
    filename.startsWith(".") &&
    filename !== ".env" &&
    filename !== ".env.example" &&
    filename !== ".gitignore"
  ) {
    return true;
  }

  if (
    filename.endsWith(".log") ||
    filename.endsWith(".tmp") ||
    filename.endsWith(".swp") ||
    filename.endsWith(".swo") ||
    filename.endsWith("~") ||
    filename.endsWith(".bak") ||
    filename === "4913" ||
    filename.endsWith(".sqlite") ||
    filename.endsWith(".db") ||
    filename.endsWith("-wal") ||
    filename.endsWith("-shm") ||
    filename === "package-lock.json" ||
    filename === "yarn.lock" ||
    filename === "pnpm-lock.yaml" ||
    filename.match(/\.(png|jpe?g|gif|ico|webp|svg|woff2?|ttf|eot|zip|tar|gz|pdf|map)$/i)
  ) {
    return true;
  }

  return false;
}

class WorkspaceWatcherManager {
  private rootDir: string = process.cwd();
  private watcher: fs.FSWatcher | null = null;
  private dirWatchers = new Map<string, fs.FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private sseClients = new Set<ServerResponse>();
  private pingInterval: NodeJS.Timeout | null = null;

  private currentFile: WorkspaceCurrentFile | null = null;
  private lastEditedFile: WorkspaceCurrentFile | null = null;
  private isStarted = false;

  public async start(rootDirectory?: string): Promise<void> {
    if (rootDirectory) {
      this.rootDir = path.resolve(rootDirectory);
    }

    if (this.isStarted) {
      return;
    }
    this.isStarted = true;

    // Seed initial current file from workspace files
    await this.seedInitialFile();

    // Start recursive watcher
    this.setupWatcher();

    // Setup 15s keep-alive ping for SSE clients
    if (!this.pingInterval) {
      this.pingInterval = setInterval(() => {
        for (const client of this.sseClients) {
          try {
            client.write(": ping\n\n");
          } catch {
            this.sseClients.delete(client);
          }
        }
      }, 15000);
    }
  }

  public stop(): void {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // Ignored
      }
      this.watcher = null;
    }

    for (const [, w] of this.dirWatchers) {
      try {
        w.close();
      } catch {
        // Ignored
      }
    }
    this.dirWatchers.clear();

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        // Ignored
      }
    }
    this.sseClients.clear();
    this.isStarted = false;
  }

  public handleLiveStream(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("retry: 1000\n\n");

    // Immediately push initial state
    const payload = JSON.stringify({
      type: "init",
      currentFile: this.currentFile,
      activeFiles: this.getActiveFiles(),
      timestamp: Date.now(),
    });
    res.write(`data: ${payload}\n\n`);

    this.sseClients.add(res);

    req.on("close", () => {
      this.sseClients.delete(res);
    });
  }

  public getActiveFiles(): WorkspaceLiveFile[] {
    const list: WorkspaceLiveFile[] = [];
    if (this.currentFile) {
      list.push({
        path: this.currentFile.path,
        status: this.currentFile.isNew ? "A" : "M",
        mtime: this.currentFile.mtime,
        size: this.currentFile.size,
        language: this.currentFile.language,
        tag: "Current Editing",
        isNew: this.currentFile.isNew,
      });
    }

    if (this.lastEditedFile && this.lastEditedFile.path !== this.currentFile?.path) {
      list.push({
        path: this.lastEditedFile.path,
        status: "M",
        mtime: this.lastEditedFile.mtime,
        size: this.lastEditedFile.size,
        language: this.lastEditedFile.language,
        tag: "Last Edited",
      });
    }

    return list.slice(0, 2);
  }

  public getCurrentFile(): WorkspaceCurrentFile | null {
    return this.currentFile;
  }

  public async getFileContent(relPath: string): Promise<string | null> {
    const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
    if (this.currentFile && this.currentFile.path === normalized) {
      return this.currentFile.content;
    }
    if (this.lastEditedFile && this.lastEditedFile.path === normalized) {
      return this.lastEditedFile.content;
    }

    const absPath = path.resolve(this.rootDir, normalized);
    try {
      return await fs.promises.readFile(absPath, "utf-8");
    } catch {
      return null;
    }
  }

  private setupWatcher(): void {
    try {
      // macOS and Windows support native recursive fs.watch
      this.watcher = fs.watch(this.rootDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        void this.onFileEvent(filename.toString(), eventType);
      });
    } catch {
      // Linux fallback: recursively register directory watchers
      this.watchDirectoriesRecursive(this.rootDir);
    }
  }

  private watchDirectoriesRecursive(dir: string): void {
    try {
      const rel = path.relative(this.rootDir, dir).replace(/\\/g, "/");
      if (rel && isIgnoredPath(rel)) return;

      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename) return;
        const fullRel = rel ? `${rel}/${filename.toString()}` : filename.toString();
        void this.onFileEvent(fullRel, eventType);
      });
      this.dirWatchers.set(dir, watcher);

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(dir, entry.name);
          const subRel = path.relative(this.rootDir, subDir).replace(/\\/g, "/");
          if (!isIgnoredPath(subRel)) {
            this.watchDirectoriesRecursive(subDir);
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  private async onFileEvent(filename: string, eventType: string): Promise<void> {
    const normalized = filename.replace(/\\/g, "/").replace(/^\.\//, "");
    if (isIgnoredPath(normalized)) return;

    // Clear debounce timer if pending
    const existing = this.debounceTimers.get(normalized);
    if (existing) {
      clearTimeout(existing);
    }

    // Debounce by 25ms to let write flushes complete
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(normalized);
      await this.processFileChange(normalized, eventType);
    }, 25);

    this.debounceTimers.set(normalized, timer);
  }

  private async processFileChange(relPath: string, eventType: string): Promise<void> {
    const absPath = path.resolve(this.rootDir, relPath);

    try {
      const stat = await fs.promises.stat(absPath);
      if (!stat.isFile()) return;

      // Skip huge files > 2MB
      if (stat.size > 2 * 1024 * 1024) return;

      const content = await fs.promises.readFile(absPath, "utf-8");
      const language = getLanguageFromPath(relPath);
      const isNew = eventType === "rename" && (!this.currentFile || this.currentFile.path !== relPath);

      // If switching to a different file, shift current file to lastEditedFile
      if (this.currentFile && this.currentFile.path !== relPath) {
        this.lastEditedFile = { ...this.currentFile };
      }

      this.currentFile = {
        path: relPath,
        content,
        mtime: stat.mtimeMs,
        size: stat.size,
        language,
        isNew,
        lastEventAt: Date.now(),
      };

      this.broadcastFileChange();
    } catch {
      // File deleted or temporarily unreadable
    }
  }

  private broadcastFileChange(): void {
    if (!this.currentFile) return;

    const payload = JSON.stringify({
      type: "file_change",
      currentFile: this.currentFile,
      activeFiles: this.getActiveFiles(),
      timestamp: Date.now(),
    });

    for (const client of this.sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private async seedInitialFile(): Promise<void> {
    try {
      let newestFile: { path: string; mtime: number } | null = null;

      const scanDir = async (dir: string, depth = 0) => {
        if (depth > 3) return;
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const abs = path.join(dir, entry.name);
          const rel = path.relative(this.rootDir, abs).replace(/\\/g, "/");

          if (isIgnoredPath(rel)) continue;

          if (entry.isDirectory()) {
            await scanDir(abs, depth + 1);
          } else if (entry.isFile()) {
            try {
              const stat = await fs.promises.stat(abs);
              if (!newestFile || stat.mtimeMs > newestFile.mtime) {
                newestFile = { path: rel, mtime: stat.mtimeMs };
              }
            } catch {
              // Ignored
            }
          }
        }
      };

      await scanDir(this.rootDir);

      if (newestFile) {
        const absPath = path.resolve(this.rootDir, (newestFile as { path: string; mtime: number }).path);
        const stat = await fs.promises.stat(absPath);
        const content = await fs.promises.readFile(absPath, "utf-8");
        this.currentFile = {
          path: (newestFile as { path: string; mtime: number }).path,
          content,
          mtime: stat.mtimeMs,
          size: stat.size,
          language: getLanguageFromPath((newestFile as { path: string; mtime: number }).path),
          lastEventAt: Date.now(),
        };
      }
    } catch {
      // Fallback
    }
  }
}

export const workspaceWatcher = new WorkspaceWatcherManager();
