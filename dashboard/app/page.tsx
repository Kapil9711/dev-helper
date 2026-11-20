"use client";

import {
  Activity,
  AlertCircle,
  AppWindow,
  ArrowUpRight,
  Network,
  Terminal,
  Boxes,
  X,
  Filter,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import {
  useAppsQuery,
  useLogsQuery,
  useNetworkRequestsQuery,
} from "@/lib/queries";
import { useDashboardPreferences } from "@/lib/prefrences";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusColor(status: number | null) {
  if (status === null) return "text-red-400";
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-amber-400";
  if (status >= 200 && status < 300) return "text-emerald-400";
  return "text-gray-400";
}

export default function OverviewPage() {
  const { preferences, updatePreferences } = useDashboardPreferences();
  const activeApp = preferences.selectedProject !== "ALL" ? preferences.selectedProject : undefined;

  const appsQuery = useAppsQuery();
  const logsQuery = useLogsQuery(25, activeApp);
  const networkQuery = useNetworkRequestsQuery(25, activeApp);

  const apps = appsQuery.data?.data ?? [];
  const logs = logsQuery.data?.data ?? [];
  const requests = networkQuery.data?.data ?? [];

  const errorCount = logs.filter((log) => log.level === "error").length;

  const failedRequests = requests.filter(
    (request) =>
      request.error !== null ||
      (request.status !== null && request.status >= 400),
  ).length;

  const loading =
    appsQuery.isPending || logsQuery.isPending || networkQuery.isPending;

  const hasError =
    appsQuery.isError || logsQuery.isError || networkQuery.isError;

  return (
    <main className="min-h-full space-y-6 vh-bg-app p-5 vh-text-main md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            {preferences.selectedProject !== "ALL" && (
              <span className="flex items-center gap-1.5 rounded-full border vh-border-accent vh-bg-accent px-2.5 py-0.5 text-xs font-semibold vh-text-accent">
                <Boxes size={11} />
                {preferences.selectedProject}
                <button
                  onClick={() => updatePreferences({ selectedProject: "ALL" })}
                  title="Remove project filter"
                  className="hover:opacity-75"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm vh-text-muted">
            {preferences.selectedProject === "ALL"
              ? "Real-time developer telemetry from all registered applications."
              : `Scoped exclusively to telemetry from "${preferences.selectedProject}".`}
          </p>
        </div>

        {preferences.selectedProject !== "ALL" && (
          <button
            onClick={() => updatePreferences({ selectedProject: "ALL" })}
            className="flex items-center gap-1.5 rounded-lg border vh-border px-3 py-1.5 text-xs font-medium vh-text-muted hover:bg-white/5 transition"
          >
            <X size={12} />
            Show all projects
          </button>
        )}
      </header>

      {hasError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
          Some dashboard data could not be loaded. Check that the local server is running on port 4317.
        </div>
      )}

      {/* Metric Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={preferences.selectedProject === "ALL" ? "Registered Projects" : "Current Project"}
          value={loading ? "—" : preferences.selectedProject === "ALL" ? apps.length : preferences.selectedProject}
          description={preferences.selectedProject === "ALL" ? "Active instrumented applications" : "Filtered view active"}
          icon={<AppWindow size={18} />}
          accent="text-blue-400"
        />

        <StatCard
          title="Captured Logs"
          value={loading ? "—" : logs.length}
          description="Recent console outputs"
          icon={<Terminal size={18} />}
          accent="text-violet-400"
        />

        <StatCard
          title="Log Errors"
          value={loading ? "—" : errorCount}
          description="Recent error level events"
          icon={<AlertCircle size={18} />}
          accent="text-red-400"
        />

        <StatCard
          title="Failed HTTP Requests"
          value={loading ? "—" : failedRequests}
          description="4xx, 5xx, or network drops"
          icon={<Activity size={18} />}
          accent="text-amber-400"
        />
      </section>

      {/* Two-column view: Recent logs & Recent network requests */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Recent logs */}
        <div className="overflow-hidden rounded-xl border vh-border vh-bg-card shadow-sm">
          <div className="flex items-center justify-between border-b vh-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-sm vh-text-main">Recent Console Logs</h2>
              <p className="mt-0.5 text-xs vh-text-dim">
                Latest application events and outputs
              </p>
            </div>
            <Terminal size={17} className="vh-text-muted" />
          </div>

          <div className="divide-y vh-border-subtle">
            {logs.length === 0 ? (
              <p className="p-8 text-center text-xs vh-text-dim">
                {loading ? "Loading logs..." : "No logs captured yet."}
              </p>
            ) : (
              logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      log.level === "error"
                        ? "text-red-400 bg-red-500/10"
                        : log.level === "warn"
                          ? "text-amber-400 bg-amber-500/10"
                          : log.level === "debug"
                            ? "text-zinc-400 bg-zinc-500/10"
                            : "text-blue-400 bg-blue-500/10"
                    }`}
                  >
                    {log.level}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words font-mono text-xs vh-text-main">
                      {log.message}
                    </p>
                    <p className="mt-1 text-[11px] vh-text-dim">
                      {log.app_name} · {formatTime(log.last_seen)}
                    </p>
                  </div>

                  {log.count > 1 && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 font-semibold">
                      ×{log.count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <a
            href={preferences.selectedProject === "ALL" ? "/console/" : `/console/?app=${encodeURIComponent(preferences.selectedProject)}`}
            className="flex items-center justify-between border-t vh-border px-5 py-3 text-xs font-medium vh-text-accent hover:bg-white/[0.03] transition"
          >
            <span>Open Console Logs</span>
            <ArrowUpRight size={14} />
          </a>
        </div>

        {/* Recent network requests */}
        <div className="overflow-hidden rounded-xl border vh-border vh-bg-card shadow-sm">
          <div className="flex items-center justify-between border-b vh-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-sm vh-text-main">Recent HTTP Activity</h2>
              <p className="mt-0.5 text-xs vh-text-dim">
                Captured outbound and inbound API requests
              </p>
            </div>
            <Network size={17} className="vh-text-muted" />
          </div>

          <div className="divide-y vh-border-subtle">
            {requests.length === 0 ? (
              <p className="p-8 text-center text-xs vh-text-dim">
                {loading ? "Loading requests..." : "No network requests recorded yet."}
              </p>
            ) : (
              requests.slice(0, 6).map((request) => (
                <div key={request.id} className="px-5 py-3 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 rounded bg-white/5 py-0.5 text-center font-mono text-[10px] font-bold text-blue-400">
                      {request.method}
                    </span>

                    <p className="min-w-0 flex-1 truncate font-mono text-xs vh-text-main">
                      {request.url}
                    </p>

                    <span
                      className={`shrink-0 font-mono text-xs font-bold ${statusColor(
                        request.status,
                      )}`}
                    >
                      {request.status ?? "ERR"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex justify-between gap-3 text-[11px] vh-text-dim">
                    <span className="truncate">{request.app_name}</span>
                    <span>
                      {request.duration_ms == null
                        ? "—"
                        : `${Math.round(request.duration_ms)} ms`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <a
            href={preferences.selectedProject === "ALL" ? "/network/" : `/network/?app=${encodeURIComponent(preferences.selectedProject)}`}
            className="flex items-center justify-between border-t vh-border px-5 py-3 text-xs font-medium vh-text-accent hover:bg-white/[0.03] transition"
          >
            <span>Open Network Activity</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </main>
  );
}
