import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import sirv from "sirv";
import { exec } from "../../shared/helpers/shell/exec.ts";
import { findAvailablePort } from "../../shared/helpers/server/port.helper.ts";
import { musicService } from "./music.service.ts";
import { musicDatabase } from "./music.database.ts";
import type { MusicSettings, SoundQuality } from "./music.types.ts";

function getDashboardDirectory(): string {
  const candidates = [
    resolve(__dirname, "../../dashboard"),
    resolve(__dirname, "../../../dashboard/out"),
    resolve(process.cwd(), "dist/dashboard"),
    resolve(process.cwd(), "dashboard/out"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

export interface MusicServerOptions {
  port?: number;
  open?: boolean;
}

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((res, rej) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        rej(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) return res({} as T);
      try {
        res(JSON.parse(body) as T);
      } catch (e) {
        rej(e);
      }
    });
    req.on("error", rej);
  });
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store, no-cache, must-revalidate",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

export async function startMusicServer(options: MusicServerOptions = {}): Promise<void> {
  const requestedPort = Number(options.port) || 4319;
  const { port, wasChanged } = await findAvailablePort(requestedPort);

  // Reload song library from filesystem
  musicService.reloadData();
  const stats = musicService.getStats();

  const dashboardDir = getDashboardDirectory();
  const serveDashboard = sirv(dashboardDir, {
    dev: false,
    single: false,
  });

  const httpServer = createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
      });
      res.end();
      return;
    }

    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || "/", `http://${host}`);

    // Server Info
    if (url.pathname === "/api/server-info") {
      sendJson(res, {
        mode: "music",
        name: "VH Music",
        version: "1.0.6",
        port,
        libraryStats: {
          totalSongs: stats.totalSongs,
          totalCategories: stats.totalCategories,
        },
        dbPath: stats.dbStats.dbPath,
      });
      return;
    }

    // Categories
    if (url.pathname === "/api/music/categories") {
      const categories = musicService.getCategories();
      sendJson(res, {
        categories,
        totalSongs: stats.totalSongs,
      });
      return;
    }

    // Songs list by category or all/random
    if (url.pathname === "/api/music/songs") {
      const category = url.searchParams.get("category") || "random";
      const songs = musicService.getSongs(category);
      sendJson(res, {
        category,
        count: songs.length,
        songs,
      });
      return;
    }

    // Single song by ID
    if (url.pathname === "/api/music/song") {
      const songId = url.searchParams.get("id");
      if (!songId) {
        sendJson(res, { error: "Song ID required" }, 400);
        return;
      }
      const song = musicService.getSongById(songId);
      if (!song) {
        sendJson(res, { error: "Song not found" }, 404);
        return;
      }
      sendJson(res, { song });
      return;
    }

    // Next random song
    if (url.pathname === "/api/music/random") {
      const category = url.searchParams.get("category") || undefined;
      const exclude = url.searchParams.get("exclude") || undefined;
      const song = musicService.getNextRandomSong(category, exclude);
      sendJson(res, { song });
      return;
    }

    // Settings (GET / POST)
    if (url.pathname === "/api/music/settings") {
      if (req.method === "POST") {
        try {
          const body = await parseJsonBody<Partial<MusicSettings>>(req);
          const updated = musicService.updateMusicSettings(body);
          sendJson(res, { settings: updated });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Invalid payload";
          sendJson(res, { error: message }, 400);
        }
      } else {
        const settings = musicService.getMusicSettings();
        sendJson(res, { settings });
      }
      return;
    }

    // Record Play History
    if (url.pathname === "/api/music/history") {
      if (req.method === "POST") {
        try {
          const body = await parseJsonBody<{ songId: string; category: string }>(req);
          if (body.songId) {
            musicService.recordSongPlay(body.songId, body.category || "random");
          }
          sendJson(res, { success: true });
        } catch {
          sendJson(res, { error: "Failed to record history" }, 400);
        }
      } else {
        const limit = Number(url.searchParams.get("limit")) || 50;
        const history = musicDatabase.getPlayHistory(limit);
        sendJson(res, { history });
      }
      return;
    }

    // Toggle Favorite
    if (url.pathname === "/api/music/favorite") {
      if (req.method === "POST") {
        try {
          const body = await parseJsonBody<{ songId: string }>(req);
          if (body.songId) {
            const isFav = musicDatabase.toggleFavorite(body.songId);
            sendJson(res, { songId: body.songId, isFavorite: isFav });
          } else {
            sendJson(res, { error: "Song ID required" }, 400);
          }
        } catch {
          sendJson(res, { error: "Failed to toggle favorite" }, 400);
        }
      } else {
        const favorites = musicDatabase.getFavorites();
        sendJson(res, { favorites });
      }
      return;
    }

    // Stats
    if (url.pathname === "/api/music/stats") {
      sendJson(res, musicService.getStats());
      return;
    }

    // Direct stream download with Content-Disposition: attachment (Same-tab background download)
    if (url.pathname === "/api/music/file-download") {
      const songId = url.searchParams.get("songId");
      const quality = (url.searchParams.get("quality") as SoundQuality) || "320kbps";
      if (!songId) {
        sendJson(res, { error: "Song ID required" }, 400);
        return;
      }
      const song = musicService.getSongById(songId);
      if (!song) {
        sendJson(res, { error: "Song not found" }, 404);
        return;
      }

      const matchUrl =
        song.downloadUrl.find((u) => u.quality === quality)?.url ||
        song.downloadUrl[song.downloadUrl.length - 1]?.url ||
        song.downloadUrl[0]?.url;

      if (!matchUrl) {
        sendJson(res, { error: "No download URL available" }, 404);
        return;
      }

      const primaryArtist = song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
      const cleanFileName = `${song.name} - ${primaryArtist}.mp4`.replace(/[\\/:*?"<>|]/g, "_");

      const https = await import("node:https");
      https
        .get(matchUrl, (proxyRes) => {
          if (
            proxyRes.statusCode &&
            proxyRes.statusCode >= 300 &&
            proxyRes.statusCode < 400 &&
            proxyRes.headers.location
          ) {
            https
              .get(proxyRes.headers.location, (redirectRes) => {
                res.writeHead(200, {
                  "content-type": redirectRes.headers["content-type"] || "audio/mp4",
                  "content-length": redirectRes.headers["content-length"] || "",
                  "content-disposition": `attachment; filename="${encodeURIComponent(cleanFileName)}"`,
                  "access-control-allow-origin": "*",
                });
                redirectRes.pipe(res);
              })
              .on("error", () => {
                res.writeHead(500);
                res.end("Stream error");
              });
            return;
          }

          res.writeHead(200, {
            "content-type": proxyRes.headers["content-type"] || "audio/mp4",
            "content-length": proxyRes.headers["content-length"] || "",
            "content-disposition": `attachment; filename="${encodeURIComponent(cleanFileName)}"`,
            "access-control-allow-origin": "*",
          });
          proxyRes.pipe(res);
        })
        .on("error", () => {
          res.writeHead(500);
          res.end("Download error");
        });
      return;
    }

    // Download single song (redirect or stream info)
    if (url.pathname === "/api/music/download") {
      const songId = url.searchParams.get("songId");
      const quality = (url.searchParams.get("quality") as SoundQuality) || "320kbps";
      if (!songId) {
        sendJson(res, { error: "Song ID required" }, 400);
        return;
      }
      const song = musicService.getSongById(songId);
      if (!song) {
        sendJson(res, { error: "Song not found" }, 404);
        return;
      }

      const matchUrl =
        song.downloadUrl.find((u) => u.quality === quality)?.url ||
        song.downloadUrl[song.downloadUrl.length - 1]?.url ||
        song.downloadUrl[0]?.url;

      if (!matchUrl) {
        sendJson(res, { error: "No download URL available" }, 404);
        return;
      }

      // Return clean JSON with target download URL and formatted file name
      const primaryArtist = song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
      const cleanFileName = `${song.name} - ${primaryArtist}.mp4`.replace(/[\\/:*?"<>|]/g, "_");

      sendJson(res, {
        songId: song.id,
        name: song.name,
        fileName: cleanFileName,
        quality,
        downloadUrl: matchUrl,
      });
      return;
    }

    // Download whole playlist / category archive
    if (url.pathname === "/api/music/download-all") {
      const category = url.searchParams.get("category") || "evergreen";
      const quality = (url.searchParams.get("quality") as SoundQuality) || "320kbps";

      try {
        const zipBuffer = await musicService.createCategoryZip(category, quality);
        res.writeHead(200, {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${category}-playlist.zip"`,
          "content-length": zipBuffer.length,
          "access-control-allow-origin": "*",
        });
        res.end(zipBuffer);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error creating zip";
        sendJson(res, { error: msg }, 500);
      }
      return;
    }

    // Mock endpoints for dashboard compatibility
    if (url.pathname === "/api/apps") {
      sendJson(res, { data: [] });
      return;
    }
    if (url.pathname === "/api/logs") {
      sendJson(res, { data: [], nextCursor: null });
      return;
    }
    if (url.pathname === "/api/git/status") {
      sendJson(res, { isRepo: false, files: [] });
      return;
    }

    // Automatic redirect from root `/` to `/music/`
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(302, { Location: "/music/" });
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

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        chalk.red(
          `\n[VH Error] Port ${port} is currently in use. Please specify another port with --port <number>.\n`,
        ),
      );
    } else {
      console.error(chalk.red(`\n[VH Server Error] ${err.message}\n`));
    }
    process.exit(1);
  });

  httpServer.listen(port, "0.0.0.0", () => {
    const dashboardUrl = `http://localhost:${port}/music/`;
    console.log(chalk.bold.hex("#ec4899")("\n=============================================="));
    console.log(chalk.bold.hex("#ec4899")("           VH MUSIC DASHBOARD SERVER          "));
    console.log(chalk.bold.hex("#ec4899")("=============================================="));
    console.log(`${chalk.gray("Library:")}      ${chalk.white.bold(`${stats.totalSongs} songs`)} across ${chalk.cyan.bold(`${stats.totalCategories} playlist files`)}`);
    console.log(`${chalk.gray("Categories:")}   ${chalk.yellow(stats.categories.map((c) => c.name).join(", ") || "None")}`);
    console.log(`${chalk.gray("SQLite DB:")}    ${chalk.white(stats.dbStats.dbPath)}`);
    console.log(`${chalk.gray("Dashboard:")}    ${chalk.green.underline(dashboardUrl)}`);
    console.log(
      `${chalk.gray("Port:")}         ${chalk.yellow(port)} ${
        wasChanged ? chalk.gray(`(auto-assigned; ${requestedPort} in use)`) : ""
      }`,
    );
    console.log(chalk.gray("----------------------------------------------"));
    console.log(chalk.gray("Press Ctrl+C to stop the Music Dashboard server.\n"));

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
    console.log(chalk.yellow("\n[VH] Shutting down Music Dashboard server..."));
    musicDatabase.close();
    httpServer.close(() => {
      console.log(chalk.green("[VH] Music Dashboard server stopped"));
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
