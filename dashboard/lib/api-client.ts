import type { AppsResponse } from "@/types/apps";
import type { LogsResponse } from "@/types/logs";
import type {
  NetworkRequestsResponse,
  NetworkRequestDetailsResponse,
} from "@/types/network";

type ApiParams = Record<string, string | number | boolean | null | undefined>;

async function apiGet<T>(path: string, params?: ApiParams): Promise<T> {
  const url = new URL(path, window.location.origin);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
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
};
