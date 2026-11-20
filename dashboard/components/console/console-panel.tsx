"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  RefreshCw,
  Terminal,
  X,
  ChevronDown,
  Copy,
  Check,
  Boxes,
  Code2,
} from "lucide-react";

import { useLogsQuery, useAppsQuery } from "@/lib/queries";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import type { LogEntry } from "@/types/logs";
import { PrettyJson } from "@/components/shared/pretty-json";
import { LogDetailsModal } from "@/components/console/log-details-modal";

const levels = ["ALL", "log", "info", "warn", "error", "debug"] as const;

function levelClass(level: string) {
  switch (level) {
    case "error":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "warn":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "debug":
      return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    case "info":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    default:
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  }
}

function formatTimestamp(timestamp: number, format: "relative" | "absolute" | "full") {
  if (format === "relative") {
    const diff = Date.now() - timestamp;
    if (diff < 5000) return "just now";
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  }
  if (format === "absolute") {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  return new Date(timestamp).toLocaleString();
}

export function ConsolePanel() {
  const searchParams = useSearchParams();
  const urlApp = searchParams.get("app");

  const { preferences, updatePreferences } = useDashboardPreferences();

  useEffect(() => {
    if (urlApp && urlApp !== preferences.selectedProject) {
      updatePreferences({ selectedProject: urlApp });
    }
  }, [urlApp, preferences.selectedProject, updatePreferences]);

  const activeApp = preferences.selectedProject !== "ALL" ? preferences.selectedProject : undefined;

  const query = useLogsQuery(preferences.logLimit, activeApp);
  const appsQuery = useAppsQuery();
  const allApps = appsQuery.data?.data ?? [];

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("ALL");
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const logs = query.data?.data ?? [];

  const selected = useMemo<LogEntry | null>(() => {
    if (!selectedFingerprint) return null;
    return logs.find((l) => l.fingerprint === selectedFingerprint) ?? null;
  }, [selectedFingerprint, logs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !term ||
        log.message.toLowerCase().includes(term) ||
        log.app_name.toLowerCase().includes(term) ||
        (log.data_json ?? "").toLowerCase().includes(term);

      const matchesLevel = level === "ALL" || log.level === level;

      return matchesSearch && matchesLevel;
    });
  }, [logs, search, level]);

  const copyText = (text: string, id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playTone("success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border vh-border vh-bg-card shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <Terminal size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold vh-text-main">Application Logs</h2>
              {preferences.selectedProject !== "ALL" && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold vh-bg-accent vh-text-accent border vh-border-accent">
                  <Boxes size={10} />
                  {preferences.selectedProject}
                  <button
                    onClick={() => updatePreferences({ selectedProject: "ALL" })}
                    title="Remove project filter"
                    className="ml-1 hover:opacity-75"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs vh-text-dim">
              Live stdout, stderr, and structured JSON logs stream from your applications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {preferences.selectedProject !== "ALL" && (
            <button
              onClick={() => updatePreferences({ selectedProject: "ALL" })}
              className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1.5 text-xs vh-text-muted hover:bg-white/5 transition"
            >
              <X size={12} />
              Show all apps
            </button>
          )}

          <button
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="flex items-center gap-1.5 rounded-lg border vh-border vh-bg-input px-3 py-1.5 text-xs font-semibold vh-text-main hover:border-white/20 transition disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={query.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col gap-3 border-b vh-border p-4 lg:flex-row">
        {/* Search */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border vh-border vh-bg-input px-3">
          <Search size={14} className="shrink-0 vh-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log messages, payload, or stack traces..."
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs vh-text-main shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-gray-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="vh-text-dim hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Level filter */}
        <div className="relative">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as (typeof levels)[number])}
            className="w-full appearance-none rounded-lg border vh-border vh-bg-input py-2 pl-3 pr-8 text-xs font-semibold vh-text-main outline-none lg:w-36"
          >
            {levels.map((item) => (
              <option key={item} value={item} className="bg-zinc-900 text-white">
                {item === "ALL" ? "All Levels" : item.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 vh-text-dim"
          />
        </div>

        {/* Project Selector dropdown inside console panel */}
        <div className="relative">
          <select
            value={preferences.selectedProject}
            onChange={(e) => updatePreferences({ selectedProject: e.target.value })}
            className="w-full appearance-none rounded-lg border vh-border vh-bg-input py-2 pl-3 pr-8 text-xs font-semibold vh-text-main outline-none lg:w-48"
          >
            <option value="ALL" className="bg-zinc-900 text-white">
              All Applications ({allApps.length})
            </option>
            {allApps.map((a) => (
              <option key={a.app_name} value={a.app_name} className="bg-zinc-900 text-white">
                {a.app_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 vh-text-dim"
          />
        </div>
      </div>

      {/* Meta status bar */}
      <div className="flex items-center justify-between border-b vh-border vh-bg-subtle px-4 py-2 text-[11px] vh-text-dim">
        <span>
          Showing {filteredLogs.length} of {logs.length} loaded records
          {preferences.selectedProject !== "ALL" && (
            <span className="ml-1 text-blue-400 font-medium">
              (Filtered by: {preferences.selectedProject})
            </span>
          )}
        </span>
        <span>Latest logs first · Click row to inspect pretty payload</span>
      </div>

      {/* Main logs list */}
      {query.isError ? (
        <div className="p-10 text-center text-sm text-red-400">
          Failed to load logs. Ensure the background helper server is running on port 4317.
        </div>
      ) : query.isPending ? (
        <div className="p-12 text-center text-xs vh-text-dim">
          Loading log entries...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-14 text-center">
          <Terminal className="mx-auto mb-3 vh-text-dim" size={26} />
          <p className="text-sm font-semibold vh-text-main">No logs found</p>
          <p className="mt-1 text-xs vh-text-muted">
            {search || level !== "ALL" || preferences.selectedProject !== "ALL"
              ? "Try adjusting your search or active filters."
              : "Logs will stream here automatically when your app logs to the console."}
          </p>
        </div>
      ) : (
        <div className="divide-y vh-border-subtle max-h-[700px] overflow-y-auto">
          {filteredLogs.map((log) => {
            const hasJsonData = !!log.data_json;
            return (
              <div
                key={log.id}
                onClick={() => setSelectedFingerprint(log.fingerprint)}
                className="group flex items-start gap-3 px-4 py-2.5 text-left cursor-pointer transition hover:bg-white/[0.04]"
              >
                {/* Level badge */}
                <span
                  className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${levelClass(
                    log.level,
                  )}`}
                >
                  {log.level}
                </span>

                {/* Message */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="break-words font-mono text-xs leading-5 vh-text-main">
                      {log.message}
                    </p>
                    {hasJsonData && (
                      <span className="shrink-0 flex items-center gap-1 rounded bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.2 font-mono text-[10px] text-violet-300 font-semibold">
                        <Code2 size={10} /> JSON
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] vh-text-dim">
                    <span className="font-medium text-slate-400">{log.app_name}</span>
                    {preferences.showDedupeBadges && log.count > 1 && (
                      <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300">
                        ×{log.count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp & copy action */}
                <div className="flex shrink-0 items-center gap-2 text-right">
                  <span className="font-mono text-[11px] vh-text-dim">
                    {formatTimestamp(log.last_seen, preferences.timestampFormat)}
                  </span>
                  <button
                    onClick={(e) => copyText(log.message, log.id, e)}
                    title="Copy log message"
                    className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 vh-text-dim hover:text-white"
                  >
                    {copiedId === log.id ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal with PrettyJson */}
      {selected && (
        <LogDetailsModal
          log={selected}
          onClose={() => setSelectedFingerprint(null)}
        />
      )}
    </div>
  );
}
