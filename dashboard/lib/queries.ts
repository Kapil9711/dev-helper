import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const queryKeys = {
  apps: ["apps"] as const,
  logs: (limit: number) => ["logs", limit] as const,
  networkRequests: (limit: number) => ["network-requests", limit] as const,
};

export function useAppsQuery() {
  return useQuery({
    queryKey: queryKeys.apps,
    queryFn: () => apiClient.getApps(),
    staleTime: 5_000,
  });
}

export function useLogsQuery(limit = 50) {
  return useQuery({
    queryKey: queryKeys.logs(limit),
    queryFn: () => apiClient.getLogs({ limit }),
    staleTime: 2_000,
  });
}

export function useNetworkRequestsQuery(limit = 50) {
  return useQuery({
    queryKey: queryKeys.networkRequests(limit),
    queryFn: () => apiClient.getNetworkRequests({ limit }),
    staleTime: 2_000,
  });
}
