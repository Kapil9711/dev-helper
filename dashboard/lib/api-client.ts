import type { AppsResponse } from "@/types/apps";
import type { LogsResponse } from "@/types/logs";
import type { NetworkRequestsResponse } from "@/types/network";

type ApiParams = Record<string, string | number | boolean | null | undefined>;

async function apiGet<T>(path: string, params?: ApiParams): Promise<T> {
  const url = new URL(path, window.location.origin);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
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

  getLogs(params?: { limit?: number; cursor?: string }): Promise<LogsResponse> {
    return apiGet("/api/logs", params);
  },

  getNetworkRequests(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<NetworkRequestsResponse> {
    return apiGet("/api/network-requests", params);
  },
};
