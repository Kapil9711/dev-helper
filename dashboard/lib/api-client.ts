import type { AppsResponse } from "@/types/apps";
import type { LogsResponse } from "@/types/logs";
import type {
  NetworkRequestsResponse,
  NetworkRequestDetailsResponse,
} from "@/types/network";
import type {
  GitStatusResponse,
  GitDiffResponse,
  GitLogResponse,
  GitCommitDetailResponse,
  GitBranchesResponse,
  GitStashListResponse,
  GitStashDiffResponse,
  GitActionPayload,
  GitActionResult,
  ServerInfoResponse,
  GitLiveFilesResponse,
  GitFileContentResponse,
  GitConfigResponse,
} from "@/types/git";

type ApiParams = Record<string, string | number | boolean | null | undefined>;

async function apiGet<T>(path: string, params?: ApiParams): Promise<T> {
  const url = new URL(path, window.location.origin);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  // Prevent browser from caching dynamic telemetry and git status
  url.searchParams.set("_t", String(Date.now()));

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  getApps(): Promise<AppsResponse> {
    return apiGet("/api/apps");
  },

  getLogs(params?: {
    appName?: string;
    level?: string;
    search?: string;
    from?: number;
    to?: number;
    limit?: number;
    cursor?: string;
  }): Promise<LogsResponse> {
    return apiGet("/api/logs", params);
  },

  getNetworkRequests(params?: {
    appName?: string;
    method?: string;
    status?: number;
    search?: string;
    from?: number;
    to?: number;
    limit?: number;
    cursor?: string;
  }): Promise<NetworkRequestsResponse> {
    return apiGet("/api/network-requests", params);
  },

  getNetworkRequestDetails(params?: {
    appName?: string;
    method?: string;
    status?: number;
    search?: string;
    from?: number;
    to?: number;
    limit?: number;
    cursor?: string;
  }): Promise<NetworkRequestDetailsResponse> {
    return apiGet("/api/network-request-details", params);
  },

  async executeProxyRequest(payload: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    body?: string | null;
  }): Promise<{
    status: number | null;
    statusText: string;
    headers: Record<string, string>;
    body: string | null;
    durationMs: number;
    error?: string | null;
  }> {
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      return (await res.json()) as {
        status: number | null;
        statusText: string;
        headers: Record<string, string>;
        body: string | null;
        durationMs: number;
        error?: string | null;
      };
    } catch (err: unknown) {
      // Fallback: Attempt direct in-browser fetch if proxy endpoint is unavailable
      const startTime = Date.now();
      try {
        let finalUrl = payload.url;
        if (payload.params && Object.keys(payload.params).length > 0) {
          const u = new URL(finalUrl, window.location.origin);
          for (const [k, v] of Object.entries(payload.params)) {
            if (v !== undefined && v !== null && v !== "") {
              u.searchParams.set(k, String(v));
            }
          }
          finalUrl = u.toString();
        }

        const method = payload.method.toUpperCase();
        const headers = payload.headers ?? {};
        const body =
          method !== "GET" && method !== "HEAD" && payload.body != null
            ? payload.body
            : undefined;

        const directRes = await fetch(finalUrl, {
          method,
          headers,
          body,
        });

        const durationMs = Date.now() - startTime;
        const resHeaders: Record<string, string> = {};
        directRes.headers.forEach((val, key) => {
          resHeaders[key] = val;
        });

        const text = await directRes.text();

        return {
          status: directRes.status,
          statusText: directRes.statusText,
          headers: resHeaders,
          body: text,
          durationMs,
        };
      } catch (directErr: unknown) {
        const error = directErr as Error;
        return {
          status: null,
          statusText: "Network / CORS Error",
          headers: {},
          body: null,
          durationMs: Date.now() - startTime,
          error: error.message || "Failed to execute request (CORS or server unreachable)",
        };
      }
    }
  },

  getGitStatus(): Promise<GitStatusResponse> {
    return apiGet("/api/git/status");
  },

  getGitDiff(params?: { file?: string; staged?: boolean }): Promise<GitDiffResponse> {
    return apiGet("/api/git/diff", params);
  },

  getGitLog(limit = 50): Promise<GitLogResponse> {
    return apiGet("/api/git/log", { limit });
  },

  getGitCommitDetails(hash: string): Promise<GitCommitDetailResponse> {
    return apiGet("/api/git/commit", { hash });
  },

  getGitBranches(): Promise<GitBranchesResponse> {
    return apiGet("/api/git/branches");
  },

  getGitStashList(): Promise<GitStashListResponse> {
    return apiGet("/api/git/stash");
  },

  getGitStashDiff(stash: string): Promise<GitStashDiffResponse> {
    return apiGet("/api/git/stash/diff", { stash });
  },

  async executeGitAction(payload: GitActionPayload): Promise<GitActionResult> {
    const res = await fetch("/api/git/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return (await res.json()) as GitActionResult;
  },

  getServerInfo(): Promise<ServerInfoResponse> {
    return apiGet("/api/server-info");
  },

  getGitLiveStreamUrl(): string {
    return "/api/git/live-stream";
  },

  getGitLiveFiles(): Promise<GitLiveFilesResponse> {
    return apiGet("/api/git/live-files");
  },

  getGitFileContent(filePath: string): Promise<GitFileContentResponse> {
    return apiGet("/api/git/file", { path: filePath });
  },

  async saveGitFile(
    filePath: string,
    content: string,
  ): Promise<{ success: boolean; path: string; mtime: number; size: number }> {
    const res = await fetch("/api/git/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content }),
    });
    return (await res.json()) as { success: boolean; path: string; mtime: number; size: number };
  },

  getGitConfig(): Promise<GitConfigResponse> {
    return apiGet("/api/git/config");
  },

  async saveGitConfig(config: {
    userName?: string;
    userEmail?: string;
    defaultBranch?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch("/api/git/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return (await res.json()) as { success: boolean };
  },

  // ---------------- MUSIC API ----------------

  getMusicCategories(): Promise<{ categories: import("@/types/music").SongCategory[]; totalSongs: number }> {
    return apiGet("/api/music/categories");
  },

  getMusicSongs(category?: string): Promise<{ category: string; count: number; songs: import("@/types/music").SongData[] }> {
    return apiGet("/api/music/songs", { category });
  },

  getMusicSong(id: string): Promise<{ song: import("@/types/music").SongData }> {
    return apiGet("/api/music/song", { id });
  },

  getMusicRandom(category?: string, exclude?: string): Promise<{ song?: import("@/types/music").SongData }> {
    return apiGet("/api/music/random", { category, exclude });
  },

  getMusicSettings(): Promise<{ settings: import("@/types/music").MusicSettings }> {
    return apiGet("/api/music/settings");
  },

  async updateMusicSettings(
    settings: Partial<import("@/types/music").MusicSettings>,
  ): Promise<{ settings: import("@/types/music").MusicSettings }> {
    const res = await fetch("/api/music/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return (await res.json()) as { settings: import("@/types/music").MusicSettings };
  },

  getMusicStats(): Promise<import("@/types/music").MusicStatsResponse> {
    return apiGet("/api/music/stats");
  },

  async recordMusicHistory(songId: string, category: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/music/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId, category }),
    });
    return (await res.json()) as { success: boolean };
  },

  async toggleMusicFavorite(songId: string): Promise<{ songId: string; isFavorite: boolean }> {
    const res = await fetch("/api/music/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });
    return (await res.json()) as { songId: string; isFavorite: boolean };
  },

  getMusicFavorites(): Promise<{ favorites: string[] }> {
    return apiGet("/api/music/favorite");
  },

  getMusicDownloadInfo(songId: string, quality?: string): Promise<{
    songId: string;
    name: string;
    fileName: string;
    quality: string;
    downloadUrl: string;
  }> {
    return apiGet("/api/music/download", { songId, quality });
  },
};
