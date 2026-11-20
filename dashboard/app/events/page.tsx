"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Terminal,
  Network,
  Clock,
  Boxes,
  X,
  Filter,
  ArrowRight,
} from "lucide-react";

import {
  useLogsQuery,
  useNetworkRequestsQuery,
  useNetworkRequestDetailsQuery,
} from "@/lib/queries";
import { useDashboardPreferences } from "@/lib/prefrences";
import type { LogEntry } from "@/types/logs";
import type { NetworkRequest } from "@/types/network";
import { RequestDetails } from "@/components/network/request-details";
import { LogDetailsModal } from "@/components/console/log-details-modal";

type EventType = "log" | "network";

export default function EventsPage() {
  const { preferences, updatePreferences } = useDashboardPreferences();
  const activeApp = preferences.selectedProject !== "ALL" ? preferences.selectedProject : undefined;

  const logsQuery = useLogsQuery(preferences.logLimit, activeApp);
  const networkQuery = useNetworkRequestsQuery(preferences.networkLimit, activeApp);
  const detailsQuery = useNetworkRequestDetailsQuery(preferences.networkLimit, activeApp);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"ALL" | EventType>("ALL");
  const [selectedNetworkRequest, setSelectedNetworkRequest] = useState<NetworkRequest | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const matchingNetworkDetails = useMemo(() => {
    if (!selectedNetworkRequest) return [];
    const all = detailsQuery.data?.data ?? [];
    const exactMatches = all.filter(
      (item) =>
        item.app_name === selectedNetworkRequest.app_name &&
        item.method.toUpperCase() === selectedNetworkRequest.method.toUpperCase() &&
        item.url.trim().toLowerCase() === selectedNetworkRequest.url.trim().toLowerCase(),
    );

    const matches =
      exactMatches.length > 0
        ? exactMatches
        : all.filter(
            (item) =>
              item.app_name === selectedNetworkRequest.app_name &&
              item.method.toUpperCase() === selectedNetworkRequest.method.toUpperCase(),
          );

    return matches.sort((a, b) => b.started_at - a.started_at || b.id - a.id);
  }, [detailsQuery.data, selectedNetworkRequest]);

  const selectedNetworkDetail = useMemo(() => {
    if (!selectedNetworkRequest || matchingNetworkDetails.length === 0) return null;

    const isErr = Boolean(
      (selectedNetworkRequest.error !== null &&
        selectedNetworkRequest.error !== undefined &&
        selectedNetworkRequest.error.trim().length > 0) ||
      (selectedNetworkRequest.status !== null &&
        selectedNetworkRequest.status !== undefined &&
        selectedNetworkRequest.status >= 400),
    );

    if (isErr) {
      const errMatch = matchingNetworkDetails.find(
        (d) =>
          (d.error !== null && d.error !== undefined && d.error.trim().length > 0) ||
          (d.status !== null && d.status !== undefined && d.status >= 400),
      );
      if (errMatch) return errMatch;
    } else if (
      selectedNetworkRequest.status !== null &&
      selectedNetworkRequest.status >= 200 &&
      selectedNetworkRequest.status < 400
    ) {
      const succMatch = matchingNetworkDetails.find(
        (d) =>
          (!d.error || d.error.trim().length === 0) &&
          d.status !== null &&
          d.status >= 200 &&
          d.status < 400,
      );
      if (succMatch) return succMatch;
    }

    return matchingNetworkDetails[0] ?? null;
  }, [selectedNetworkRequest, matchingNetworkDetails]);

  const events = useMemo(() => {
    const logs = (logsQuery.data?.data ?? []).map((log) => ({
      id: `log-${log.id}`,
      type: "log" as const,
      app: log.app_name,
      title: log.message,
      detail: log.level.toUpperCase(),
      timestamp: log.last_seen,
      level: log.level,
      rawLog: log,
    }));

    const requests = (networkQuery.data?.data ?? []).map((request) => ({
      id: `network-${request.id}`,
      type: "network" as const,
      app: request.app_name,
      title: `${request.method} ${request.url}`,
      detail: request.error
        ? "NETWORK ERROR"
        : `HTTP ${request.status ?? "UNKNOWN"}`,
      timestamp: request.last_seen,
      level:
        request.error || (request.status !== null && request.status >= 400)
          ? "error"
          : "info",
      rawRequest: request,
    }));

    const term = search.trim().toLowerCase();

    return [...logs, ...requests]
      .filter((event) => {
        const matchesType = type === "ALL" || event.type === type;
        const matchesSearch =
          !term ||
          event.title.toLowerCase().includes(term) ||
          event.app.toLowerCase().includes(term) ||
          event.detail.toLowerCase().includes(term);

        return matchesType && matchesSearch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [logsQuery.data, networkQuery.data, search, type]);

  const loading = logsQuery.isPending || networkQuery.isPending;
  const hasError = logsQuery.isError || networkQuery.isError;

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 vh-bg-app p-5 vh-text-main md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Unified Events</h1>
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
            Aggregated stream of application logs and HTTP network calls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {preferences.selectedProject !== "ALL" && (
            <button
              onClick={() => updatePreferences({ selectedProject: "ALL" })}
              className="flex items-center gap-1.5 rounded-lg border vh-border px-3 py-1.5 text-xs vh-text-muted hover:bg-white/5 transition"
            >
              <X size={12} />
              Show all apps
            </button>
          )}

          <button
            onClick={() => {
              void logsQuery.refetch();
              void networkQuery.refetch();
            }}
            disabled={logsQuery.isFetching || networkQuery.isFetching}
            className="flex items-center gap-2 rounded-lg border vh-border vh-bg-card px-3.5 py-2 text-xs font-medium vh-text-main hover:border-white/20 transition disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={
                logsQuery.isFetching || networkQuery.isFetching
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border vh-border vh-bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium vh-text-muted">Filtered Events</span>
            <Activity size={18} className="text-blue-400" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight vh-text-main">
            {loading ? "—" : events.length}
          </p>
          <p className="mt-1 text-xs vh-text-dim">Matching stream entries</p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium vh-text-muted">Loaded Logs</span>
            <Terminal size={18} className="text-violet-400" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight vh-text-main">
            {logsQuery.data?.data.length ?? "—"}
          </p>
          <p className="mt-1 text-xs vh-text-dim">Console outputs captured</p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium vh-text-muted">Loaded Requests</span>
            <Network size={18} className="text-emerald-400" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight vh-text-main">
            {networkQuery.data?.data.length ?? "—"}
          </p>
          <p className="mt-1 text-xs vh-text-dim">HTTP calls recorded</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border vh-border vh-bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b vh-border p-4 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border vh-border vh-bg-input px-3">
            <Search size={14} className="shrink-0 vh-text-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event title or application..."
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs vh-text-main shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-gray-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="vh-text-dim hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as "ALL" | EventType)}
            className="rounded-lg border vh-border vh-bg-input px-3 py-2 text-xs font-medium vh-text-main outline-none"
          >
            <option value="ALL" className="bg-zinc-900 text-white">All Event Types</option>
            <option value="log" className="bg-zinc-900 text-white">Console Logs</option>
            <option value="network" className="bg-zinc-900 text-white">Network Requests</option>
          </select>
        </div>

        {hasError && (
          <div className="border-b border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            Some event data could not be retrieved from the server.
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs vh-text-dim">
            Loading events stream...
          </div>
        ) : events.length === 0 ? (
          <div className="p-14 text-center">
            <Activity size={26} className="mx-auto mb-3 vh-text-dim" />
            <p className="text-sm font-medium vh-text-main">No events found</p>
            <p className="mt-1 text-xs vh-text-muted">
              Try adjusting your active search query or filters.
            </p>
          </div>
        ) : (
          <div className="divide-y vh-border-subtle max-h-[700px] overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (event.type === "network") {
                    setSelectedNetworkRequest(event.rawRequest);
                  } else {
                    setSelectedLog(event.rawLog);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (event.type === "network") {
                      setSelectedNetworkRequest(event.rawRequest);
                    } else {
                      setSelectedLog(event.rawLog);
                    }
                  }
                }}
                className="group flex cursor-pointer items-start gap-3.5 px-5 py-3.5 hover:bg-white/[0.04] transition focus:outline-none focus:bg-white/[0.04]"
                title={`Click to inspect ${event.type === "network" ? "network request" : "log message"}`}
              >
                <div
                  className={`mt-0.5 rounded-lg p-2 shrink-0 transition group-hover:scale-105 ${
                    event.type === "log"
                      ? "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20"
                      : "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20"
                  }`}
                >
                  {event.type === "log" ? (
                    <Terminal size={15} />
                  ) : (
                    <Network size={15} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider vh-text-dim">
                      {event.type}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase ${
                        event.level === "error"
                          ? "text-red-400 bg-red-500/10"
                          : event.level === "warn"
                            ? "text-amber-400 bg-amber-500/10"
                            : "text-blue-400 bg-blue-500/10"
                      }`}
                    >
                      {event.detail}
                    </span>
                  </div>

                  <p className="mt-1 break-words font-mono text-xs vh-text-main group-hover:text-blue-300 transition-colors">
                    {event.title}
                  </p>

                  <p className="mt-1 text-[11px] vh-text-dim">{event.app}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-[11px] vh-text-dim">
                    <Clock size={11} />
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>

                  <span className="hidden items-center gap-1 text-[11px] font-semibold text-sky-400 opacity-0 group-hover:opacity-100 transition sm:flex">
                    Inspect <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t vh-border px-5 py-3 text-xs vh-text-dim">
          Real-time event aggregator syncing via WebSockets. Click any item to inspect details.
        </div>
      </section>

      {/* Network request details modal */}
      {selectedNetworkRequest && (
        <RequestDetails
          request={selectedNetworkRequest}
          detail={selectedNetworkDetail}
          details={matchingNetworkDetails}
          onClose={() => setSelectedNetworkRequest(null)}
        />
      )}

      {/* Log details modal */}
      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </main>
  );
}
