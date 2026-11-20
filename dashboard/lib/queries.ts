import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const queryKeys = {
  apps: ["apps"] as const,
  logs: (limit: number, appName?: string) =>
    appName && appName !== "ALL"
      ? (["logs", limit, appName] as const)
      : (["logs", limit] as const),
  networkRequests: (limit: number, appName?: string) =>
    appName && appName !== "ALL"
      ? (["network-requests", limit, appName] as const)
      : (["network-requests", limit] as const),
  networkRequestDetails: (limit: number, appName?: string) =>
    appName && appName !== "ALL"
      ? (["network-request-details", limit, appName] as const)
      : (["network-request-details", limit] as const),
  gitStatus: ["git-status"] as const,
  gitDiff: (file?: string, staged?: boolean) =>
    ["git-diff", file || "all", staged ? "staged" : "unstaged"] as const,
  gitLog: (limit: number) => ["git-log", limit] as const,
  gitCommitDetails: (hash: string) => ["git-commit", hash] as const,
  gitBranches: ["git-branches"] as const,
};

export function useAppsQuery() {
  return useQuery({
    queryKey: queryKeys.apps,
    queryFn: () => apiClient.getApps(),
    staleTime: 5_000,
  });
}

export function useLogsQuery(limit = 50, appName?: string) {
  const normalizedApp = appName && appName !== "ALL" ? appName : undefined;
  return useQuery({
    queryKey: queryKeys.logs(limit, normalizedApp),
    queryFn: () => apiClient.getLogs({ limit, appName: normalizedApp }),
    staleTime: 2_000,
  });
}

export function useNetworkRequestsQuery(limit = 50, appName?: string) {
  const normalizedApp = appName && appName !== "ALL" ? appName : undefined;
  return useQuery({
    queryKey: queryKeys.networkRequests(limit, normalizedApp),
    queryFn: () => apiClient.getNetworkRequests({ limit, appName: normalizedApp }),
    staleTime: 2_000,
  });
}

export function useNetworkRequestDetailsQuery(limit = 100, appName?: string) {
  const normalizedApp = appName && appName !== "ALL" ? appName : undefined;
  return useQuery({
    queryKey: queryKeys.networkRequestDetails(limit, normalizedApp),
    queryFn: () =>
      apiClient.getNetworkRequestDetails({ limit, appName: normalizedApp }),
    staleTime: 2_000,
  });
}

export function useGitStatusQuery() {
  return useQuery({
    queryKey: queryKeys.gitStatus,
    queryFn: () => apiClient.getGitStatus(),
    refetchInterval: 5_000,
    staleTime: 2_000,
  });
}

export function useGitDiffQuery(file?: string, staged?: boolean) {
  return useQuery({
    queryKey: queryKeys.gitDiff(file, staged),
    queryFn: () => apiClient.getGitDiff({ file, staged }),
    staleTime: 2_000,
  });
}

export function useGitLogQuery(limit = 50) {
  return useQuery({
    queryKey: queryKeys.gitLog(limit),
    queryFn: () => apiClient.getGitLog(limit),
    staleTime: 3_000,
  });
}

export function useGitCommitDetailsQuery(hash?: string) {
  return useQuery({
    queryKey: queryKeys.gitCommitDetails(hash || ""),
    queryFn: () => apiClient.getGitCommitDetails(hash!),
    enabled: Boolean(hash),
    staleTime: 60_000,
  });
}

export function useGitBranchesQuery() {
  return useQuery({
    queryKey: queryKeys.gitBranches,
    queryFn: () => apiClient.getGitBranches(),
    staleTime: 10_000,
  });
}
