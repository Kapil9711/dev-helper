"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Terminal,
  Network,
  Clock,
} from "lucide-react";

import { useLogsQuery, useNetworkRequestsQuery } from "@/lib/queries";

type EventType = "log" | "network";

export default function EventsPage() {
  const logsQuery = useLogsQuery(100);
  const networkQuery = useNetworkRequestsQuery(100);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"ALL" | EventType>("ALL");

  const events = useMemo(() => {
    const logs = (logsQuery.data?.data ?? []).map((log) => ({
      id: `log-${log.id}`,
      type: "log" as const,
      app: log.app_name,
      title: log.message,
      detail: log.level.toUpperCase(),
      timestamp: log.last_seen,
      level: log.level,
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
    <main className="min-h-[calc(100vh-4rem)] space-y-6 bg-[#0b1120] p-5 text-white md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-gray-400">
            Unified activity from captured logs and HTTP requests.
          </p>
        </div>

        <button
          onClick={() => {
            void logsQuery.refetch();
            void networkQuery.refetch();
          }}
          disabled={logsQuery.isFetching || networkQuery.isFetching}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              logsQuery.isFetching || networkQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
          <Activity size={18} className="text-blue-400" />
          <p className="mt-4 text-2xl font-semibold">
            {loading ? "—" : events.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Matching activity records
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
          <Terminal size={18} className="text-violet-400" />
          <p className="mt-4 text-2xl font-semibold">
            {logsQuery.data?.data.length ?? "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Loaded log records</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
          <Network size={18} className="text-emerald-400" />
          <p className="mt-4 text-2xl font-semibold">
            {networkQuery.data?.data.length ?? "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Loaded network records</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0b1120] px-3">
            <Search size={15} className="shrink-0 text-gray-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events or applications..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-600"
            />
          </div>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as "ALL" | EventType)
            }
            className="rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-gray-300 outline-none"
          >
            <option value="ALL">All event types</option>
            <option value="log">Console logs</option>
            <option value="network">Network requests</option>
          </select>
        </div>

        {hasError && (
          <div className="border-b border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
            Some event data could not be loaded. Refresh to retry.
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <Activity size={26} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-300">No matching events</p>
            <p className="mt-1 text-xs text-gray-500">
              Try a different search or event type.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-4 py-4 hover:bg-white/[0.02]"
              >
                <div
                  className={`mt-0.5 rounded-lg p-2 ${
                    event.type === "log"
                      ? "bg-violet-500/10 text-violet-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {event.type === "log" ? (
                    <Terminal size={16} />
                  ) : (
                    <Network size={16} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {event.type}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        event.level === "error"
                          ? "text-red-400"
                          : event.level === "warn"
                            ? "text-amber-400"
                            : "text-gray-400"
                      }`}
                    >
                      {event.detail}
                    </span>
                  </div>

                  <p className="mt-1 break-words text-sm text-gray-200">
                    {event.title}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">{event.app}</p>
                </div>

                <span className="flex shrink-0 items-center gap-1 text-[11px] text-gray-500">
                  <Clock size={12} />
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-white/10 px-4 py-3 text-xs text-gray-500">
          Showing loaded records only. Repeated events may be grouped by the
          backend.
        </div>
      </section>
    </main>
  );
}
