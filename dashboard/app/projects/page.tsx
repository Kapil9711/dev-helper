"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Boxes,
  Clock3,
  Activity,
  ArrowUpRight,
  Network,
  Terminal,
  CheckCircle2,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";

import { useAppsQuery, useLogsQuery, useNetworkRequestsQuery } from "@/lib/queries";
import { useDashboardPreferences } from "@/lib/prefrences";

function formatLastSeen(timestamp: number) {
  if (!timestamp) return "No activity recorded";

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;

  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRecentlyActive(timestamp: number) {
  return Date.now() - timestamp < 60_000;
}

export default function ProjectsPage() {
  const router = useRouter();
  const query = useAppsQuery();
  const logsQuery = useLogsQuery(200);
  const networkQuery = useNetworkRequestsQuery(200);

  const { preferences, updatePreferences } = useDashboardPreferences();
  const [search, setSearch] = useState("");

  const apps = query.data?.data ?? [];
  const logs = logsQuery.data?.data ?? [];
  const requests = networkQuery.data?.data ?? [];

  // Count telemetry per application
  const appMetrics = useMemo(() => {
    const map = new Map<
      string,
      { totalLogs: number; errorLogs: number; totalRequests: number; failedRequests: number }
    >();

    for (const app of apps) {
      map.set(app.app_name, { totalLogs: 0, errorLogs: 0, totalRequests: 0, failedRequests: 0 });
    }

    for (const log of logs) {
      const stats = map.get(log.app_name);
      if (stats) {
        stats.totalLogs++;
        if (log.level === "error") stats.errorLogs++;
      }
    }

    for (const req of requests) {
      const stats = map.get(req.app_name);
      if (stats) {
        stats.totalRequests += req.count || 1;
        if (req.error || (req.status !== null && req.status >= 400)) {
          stats.failedRequests += req.count || 1;
        }
      }
    }

    return map;
  }, [apps, logs, requests]);

  const filteredApps = useMemo(() => {
    const term = search.trim().toLowerCase();
    return apps.filter((app) => app.app_name.toLowerCase().includes(term));
  }, [apps, search]);

  const activeCount = apps.filter((app) => isRecentlyActive(app.last_seen)).length;

  const selectProject = (appName: string) => {
    updatePreferences({ selectedProject: appName });
  };

  const navigateToNetwork = (appName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updatePreferences({ selectedProject: appName });
    router.push(`/network/?app=${encodeURIComponent(appName)}`);
  };

  const navigateToConsole = (appName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updatePreferences({ selectedProject: appName });
    router.push(`/console/?app=${encodeURIComponent(appName)}`);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 vh-bg-app p-5 vh-text-main md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            {preferences.selectedProject !== "ALL" && (
              <span className="flex items-center gap-1.5 rounded-full border vh-border-accent vh-bg-accent px-2.5 py-0.5 text-xs font-medium vh-text-accent">
                <Filter size={11} />
                Filtering: {preferences.selectedProject}
                <button
                  onClick={() => updatePreferences({ selectedProject: "ALL" })}
                  title="Clear project filter"
                  className="hover:opacity-75"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm vh-text-muted">
            Click any project to isolate its logs and network requests across the dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {preferences.selectedProject !== "ALL" && (
            <button
              onClick={() => updatePreferences({ selectedProject: "ALL" })}
              className="flex items-center gap-1.5 rounded-lg border vh-border px-3 py-2 text-xs vh-text-muted hover:bg-white/5 hover:text-white"
            >
              <X size={13} />
              Reset Project Filter
            </button>
          )}

          <button
            onClick={() => {
              void query.refetch();
              void logsQuery.refetch();
              void networkQuery.refetch();
            }}
            disabled={query.isFetching}
            className="flex items-center gap-2 rounded-lg border vh-border vh-bg-card px-3.5 py-2 text-xs font-medium vh-text-muted hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={query.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Overview Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border vh-border vh-bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium vh-text-muted">
              Registered Applications
            </span>
            <Boxes size={18} className="vh-text-accent" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight vh-text-main">
            {query.isPending ? "—" : apps.length}
          </p>
          <p className="mt-1 text-xs vh-text-dim">
            Reporting telemetry to DevTools
          </p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium vh-text-muted">Active Now</span>
            <Activity size={18} className="text-emerald-400" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight vh-text-main">
            {query.isPending ? "—" : activeCount}
          </p>
          <p className="mt-1 text-xs vh-text-dim">Seen within the last 60 seconds</p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium vh-text-muted">Active Project Filter</span>
            <Filter size={18} className="vh-text-accent" />
          </div>
          <p className="mt-4 truncate text-xl font-bold tracking-tight vh-text-accent">
            {preferences.selectedProject === "ALL" ? "All Projects" : preferences.selectedProject}
          </p>
          <p className="mt-1 text-xs vh-text-dim">
            {preferences.selectedProject === "ALL"
              ? "All telemetry is combined"
              : "Isolated to this single project"}
          </p>
        </div>
      </section>

      {/* Project List */}
      <section className="overflow-hidden rounded-xl border vh-border vh-bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b vh-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-sm vh-text-main">Applications</h2>
            <p className="mt-0.5 text-xs vh-text-dim">
              {filteredApps.length} projects detected
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border vh-border vh-bg-input px-3 sm:w-72">
            <Search size={14} className="shrink-0 vh-text-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name..."
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs vh-text-main shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-gray-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="vh-text-dim hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {query.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-red-300">Could not load projects.</p>
            <button
              onClick={() => void query.refetch()}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : query.isPending ? (
          <div className="p-10 text-center text-sm vh-text-dim">
            Loading projects...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes size={28} className="mx-auto mb-3 vh-text-dim" />
            <p className="text-sm font-medium vh-text-main">
              {search ? "No matching projects" : "No projects registered yet"}
            </p>
            <p className="mt-1 text-xs vh-text-muted">
              {search
                ? "Try a different search query."
                : "Run an application instrumented with the VH helper to capture activity."}
            </p>
          </div>
        ) : (
          <div className="divide-y vh-border-subtle">
            {filteredApps.map((app) => {
              const active = isRecentlyActive(app.last_seen);
              const isSelected = preferences.selectedProject === app.app_name;
              const metrics = appMetrics.get(app.app_name) ?? {
                totalLogs: 0,
                errorLogs: 0,
                totalRequests: 0,
                failedRequests: 0,
              };

              return (
                <div
                  key={app.app_name}
                  onClick={() => selectProject(app.app_name)}
                  className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 cursor-pointer transition ${
                    isSelected
                      ? "vh-bg-accent/30 border-l-4 vh-border-accent"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        isSelected
                          ? "vh-border-accent vh-bg-accent vh-text-accent"
                          : "vh-border vh-bg-subtle vh-text-muted"
                      }`}
                    >
                      <Boxes size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold vh-text-main">
                          {app.app_name}
                        </p>
                        {isSelected && (
                          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold vh-bg-accent vh-text-accent border vh-border-accent">
                            <CheckCircle2 size={10} /> Active Filter
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs vh-text-dim">
                        <span className="flex items-center gap-1">
                          <Clock3 size={11} />
                          {formatLastSeen(app.last_seen)}
                        </span>
                        <span>·</span>
                        <span>{metrics.totalLogs} logs ({metrics.errorLogs} errors)</span>
                        <span>·</span>
                        <span>{metrics.totalRequests} HTTP requests</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => navigateToNetwork(app.app_name, e)}
                      title="Inspect Network Requests for this project"
                      className="flex items-center gap-1.5 rounded-lg border vh-border vh-bg-input px-3 py-1.5 text-xs font-medium vh-text-main hover:border-white/20 hover:bg-white/5 transition"
                    >
                      <Network size={13} className="text-emerald-400" />
                      Network
                      <ArrowUpRight size={12} className="vh-text-dim" />
                    </button>

                    <button
                      onClick={(e) => navigateToConsole(app.app_name, e)}
                      title="Inspect Console Logs for this project"
                      className="flex items-center gap-1.5 rounded-lg border vh-border vh-bg-input px-3 py-1.5 text-xs font-medium vh-text-main hover:border-white/20 hover:bg-white/5 transition"
                    >
                      <Terminal size={13} className="text-violet-400" />
                      Console
                      <ArrowUpRight size={12} className="vh-text-dim" />
                    </button>

                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        active
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "vh-border vh-bg-subtle vh-text-dim"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          active
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                            : "bg-zinc-600"
                        }`}
                      />
                      {active ? "Active" : "Idle"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
