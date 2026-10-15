"use client";

import {
  Activity,
  AlertCircle,
  AppWindow,
  ArrowUpRight,
  Network,
  Terminal,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import {
  useAppsQuery,
  useLogsQuery,
  useNetworkRequestsQuery,
} from "@/lib/queries";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusColor(status: number | null) {
  if (status === null) return "text-gray-400";
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-amber-400";
  if (status >= 200 && status < 300) return "text-emerald-400";
  return "text-gray-300";
}

export default function OverviewPage() {
  const appsQuery = useAppsQuery();
  const logsQuery = useLogsQuery(10);
  const networkQuery = useNetworkRequestsQuery(10);

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
    <main className="min-h-full space-y-6 bg-[#0b1120] p-5 text-white md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor your development apps in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live monitoring
        </div>
      </header>

      {hasError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          Some dashboard data could not be loaded. Check the server connection
          and refresh.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Projects"
          value={loading ? "—" : apps.length}
          description="Registered applications"
          icon={<AppWindow size={18} />}
          accent="text-blue-400"
        />

        <StatCard
          title="Recent logs"
          value={loading ? "—" : logs.length}
          description="Latest 10 log entries"
          icon={<Terminal size={18} />}
          accent="text-violet-400"
        />

        <StatCard
          title="Log errors"
          value={loading ? "—" : errorCount}
          description="Errors in the loaded logs"
          icon={<AlertCircle size={18} />}
          accent="text-red-400"
        />

        <StatCard
          title="Failed requests"
          value={loading ? "—" : failedRequests}
          description="Failed requests in the loaded results"
          icon={<Activity size={18} />}
          accent="text-amber-400"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <h2 className="font-medium">Recent console logs</h2>
              <p className="mt-1 text-xs text-gray-500">
                Latest captured application events
              </p>
            </div>
            <Terminal size={18} className="text-gray-400" />
          </div>

          <div className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">
                {loading ? "Loading logs..." : "No logs captured yet."}
              </p>
            ) : (
              logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 w-12 shrink-0 text-xs font-medium uppercase ${
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "warn"
                          ? "text-amber-400"
                          : log.level === "debug"
                            ? "text-gray-500"
                            : "text-blue-400"
                    }`}
                  >
                    {log.level}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm text-gray-200">
                      {log.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {log.app_name} · {formatTime(log.last_seen)}
                    </p>
                  </div>

                  {log.count > 1 && (
                    <span className="rounded bg-white/5 px-2 py-1 text-xs text-gray-400">
                      ×{log.count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <a
            href="/console/"
            className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm text-blue-400 hover:bg-white/[0.03]"
          >
            View console <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <h2 className="font-medium">Recent network requests</h2>
              <p className="mt-1 text-xs text-gray-500">
                HTTP activity from your applications
              </p>
            </div>
            <Network size={18} className="text-gray-400" />
          </div>

          <div className="divide-y divide-white/5">
            {requests.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">
                {loading
                  ? "Loading requests..."
                  : "No network requests captured yet."}
              </p>
            ) : (
              requests.slice(0, 6).map((request) => (
                <div key={request.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 rounded bg-white/5 px-1.5 py-1 text-center font-mono text-[10px] text-blue-300">
                      {request.method}
                    </span>

                    <p className="min-w-0 flex-1 truncate font-mono text-xs text-gray-200">
                      {request.url}
                    </p>

                    <span
                      className={`shrink-0 text-xs font-medium ${statusColor(request.status)}`}
                    >
                      {request.status ?? "ERR"}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between gap-3 text-xs text-gray-500">
                    <span className="truncate">{request.app_name}</span>
                    <span>
                      {request.duration_ms == null
                        ? "—"
                        : `${request.duration_ms} ms`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <a
            href="/network/"
            className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm text-blue-400 hover:bg-white/[0.03]"
          >
            View network activity <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}
