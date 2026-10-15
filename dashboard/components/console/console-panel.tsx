"use client";

import { useMemo, useState } from "react";
import { Search, RefreshCw, Terminal, X, ChevronDown } from "lucide-react";

import { useLogsQuery } from "@/lib/queries";
import type { LogEntry, LogLevel } from "@/types/logs";

const levels = ["ALL", "log", "info", "warn", "error", "debug"] as const;

function levelClass(level: string) {
  switch (level) {
    case "error":
      return "text-red-400 bg-red-500/10";
    case "warn":
      return "text-amber-400 bg-amber-500/10";
    case "debug":
      return "text-gray-400 bg-white/5";
    case "info":
      return "text-blue-400 bg-blue-500/10";
    default:
      return "text-emerald-400 bg-emerald-500/10";
  }
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ConsolePanel() {
  const query = useLogsQuery(100);

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("ALL");
  const [app, setApp] = useState("ALL");
  const [selected, setSelected] = useState<LogEntry | null>(null);

  const logs = query.data?.data ?? [];

  const apps = useMemo(
    () => [...new Set(logs.map((log) => log.app_name))].sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !term ||
        log.message.toLowerCase().includes(term) ||
        log.app_name.toLowerCase().includes(term) ||
        (log.data_json ?? "").toLowerCase().includes(term);

      const matchesLevel = level === "ALL" || log.level === level;
      const matchesApp = app === "ALL" || log.app_name === app;

      return matchesSearch && matchesLevel && matchesApp;
    });
  }, [logs, search, level, app]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Terminal size={18} />
          </div>
          <div>
            <h2 className="text-sm font-medium">Application logs</h2>
            <p className="mt-1 text-xs text-gray-500">
              Captured console events
            </p>
          </div>
        </div>

        <button
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={query.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0b1120] px-3">
          <Search size={15} className="shrink-0 text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages or metadata..."
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-600"
          />
        </div>

        <div className="relative">
          <select
            value={level}
            onChange={(event) =>
              setLevel(event.target.value as (typeof levels)[number])
            }
            className="w-full appearance-none rounded-lg border border-white/10 bg-[#0b1120] py-2.5 pl-3 pr-9 text-sm text-gray-300 outline-none lg:w-40"
          >
            {levels.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All log levels" : item.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>

        <div className="relative">
          <select
            value={app}
            onChange={(event) => setApp(event.target.value)}
            className="w-full appearance-none rounded-lg border border-white/10 bg-[#0b1120] py-2.5 pl-3 pr-9 text-sm text-gray-300 outline-none lg:w-48"
          >
            <option value="ALL">All applications</option>
            {apps.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1120]/60 px-4 py-2.5 text-xs text-gray-500">
        <span>{filteredLogs.length} matching log records</span>
        <span>Latest activity first</span>
      </div>

      {query.isError ? (
        <div className="p-10 text-center text-sm text-red-300">
          Failed to load logs. Check the backend and try refreshing.
        </div>
      ) : query.isPending ? (
        <div className="p-10 text-center text-sm text-gray-500">
          Loading logs...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center">
          <Terminal className="mx-auto mb-3 text-gray-600" size={25} />
          <p className="text-sm text-gray-300">No matching logs</p>
          <p className="mt-1 text-xs text-gray-500">
            Try changing the filters or search query.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {filteredLogs.map((log) => (
            <button
              key={log.id}
              onClick={() => setSelected(log)}
              className="grid w-full grid-cols-[88px_minmax(0,1fr)] gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] sm:grid-cols-[88px_minmax(0,1fr)_140px] sm:items-start"
            >
              <span
                className={`mt-0.5 w-fit rounded px-2 py-1 text-[10px] font-semibold uppercase ${levelClass(log.level)}`}
              >
                {log.level}
              </span>

              <span className="min-w-0">
                <span className="block break-words text-sm text-gray-200">
                  {log.message}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {log.app_name}
                  {log.count > 1 && ` · ${log.count} occurrences`}
                </span>
              </span>

              <span className="hidden text-right text-xs text-gray-500 sm:block">
                {formatTimestamp(log.last_seen)}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <button
            aria-label="Close log details"
            className="flex-1 cursor-default"
            onClick={() => setSelected(null)}
          />

          <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0e1626] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <h2 className="text-sm font-medium">Log details</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <span
                  className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${levelClass(selected.level)}`}
                >
                  {selected.level}
                </span>
                <p className="mt-3 break-words text-sm text-gray-100">
                  {selected.message}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Log information
                </p>

                <div className="divide-y divide-white/5 rounded-lg border border-white/10">
                  {[
                    ["Application", selected.app_name],
                    ["Occurrences", selected.count],
                    ["First seen", formatTimestamp(selected.first_seen)],
                    ["Last seen", formatTimestamp(selected.last_seen)],
                    ["Fingerprint", selected.fingerprint],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-3 px-3 py-2.5"
                    >
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="max-w-[65%] break-all text-right text-xs text-gray-200">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.data_json && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Metadata
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#0b1120] p-3 text-xs leading-5 text-violet-300">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selected.data_json),
                          null,
                          2,
                        );
                      } catch {
                        return selected.data_json;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
