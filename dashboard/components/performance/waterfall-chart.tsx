"use client";

import { useMemo, useState } from "react";
import type { NetworkRequestDetail } from "@/types/network";
import { Clock, Zap, ArrowUpRight, AlertCircle, FileText } from "lucide-react";
import { playTone } from "@/lib/prefrences";

interface WaterfallChartProps {
  requests: NetworkRequestDetail[];
  onSelectRequest: (request: NetworkRequestDetail) => void;
  selectedRequestId: number | null;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getPayloadSize(req: NetworkRequestDetail): number {
  if (req.response_headers_json) {
    try {
      const headers = JSON.parse(req.response_headers_json) as Record<string, string>;
      const cl = headers["content-length"] || headers["Content-Length"];
      if (cl && !isNaN(Number(cl))) {
        return Number(cl);
      }
    } catch {
      // Fallback
    }
  }

  if (req.response_body_json) {
    return typeof req.response_body_json === "string"
      ? req.response_body_json.length
      : JSON.stringify(req.response_body_json).length;
  }

  return 0;
}

function getMethodColor(method: string) {
  const m = method.toUpperCase();
  switch (m) {
    case "GET":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "POST":
      return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    case "PUT":
    case "PATCH":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "DELETE":
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

function getStatusBadge(status: number | null, error: string | null) {
  if (error || (status && status >= 500)) {
    return {
      label: status ? `${status}` : "ERR",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      barColor: "bg-rose-500 hover:bg-rose-400 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]",
    };
  }
  if (status && status >= 400) {
    return {
      label: `${status}`,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      barColor: "bg-amber-500 hover:bg-amber-400 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    };
  }
  if (status && status >= 300) {
    return {
      label: `${status}`,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      barColor: "bg-sky-500 hover:bg-sky-400 border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.4)]",
    };
  }
  if (status && status >= 200) {
    return {
      label: `${status}`,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      barColor: "bg-emerald-500 hover:bg-emerald-400 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    };
  }
  return {
    label: "...",
    color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    barColor: "bg-slate-500 hover:bg-slate-400 border-slate-400",
  };
}

export function WaterfallChart({
  requests,
  onSelectRequest,
  selectedRequestId,
}: WaterfallChartProps) {
  const [hoveredReqId, setHoveredReqId] = useState<number | null>(null);

  // Chronological sort
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => a.started_at - b.started_at);
  }, [requests]);

  const { minTime, maxTime, totalTimespan } = useMemo(() => {
    if (sortedRequests.length === 0) {
      return { minTime: 0, maxTime: 0, totalTimespan: 1 };
    }

    const min = Math.min(...sortedRequests.map((r) => r.started_at));
    const max = Math.max(
      ...sortedRequests.map(
        (r) => r.completed_at || r.started_at + (r.duration_ms || 50),
      ),
    );

    return {
      minTime: min,
      maxTime: max,
      totalTimespan: Math.max(max - min, 50),
    };
  }, [sortedRequests]);

  // Timeline ticks (0%, 25%, 50%, 75%, 100%)
  const timeTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
      const ms = Math.round(ratio * totalTimespan);
      return {
        ratio,
        label: formatDuration(ms),
      };
    });
  }, [totalTimespan]);

  if (sortedRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center vh-bg-card border vh-border rounded-xl">
        <Clock className="w-10 h-10 mb-3 vh-text-dim opacity-50" />
        <p className="font-semibold text-base vh-text-main">No Network Calls Observed</p>
        <p className="text-xs mt-1 vh-text-dim max-w-sm">
          Run your application with the dev-helper SDK or trigger API calls to inspect live waterfall timeline traces.
        </p>
      </div>
    );
  }

  return (
    <div className="vh-bg-card border vh-border rounded-xl overflow-hidden shadow-sm">
      {/* Waterfall Grid Header */}
      <div className="grid grid-cols-12 border-b vh-border text-[11px] font-semibold uppercase tracking-wider vh-text-dim bg-black/5 dark:bg-white/5 py-2.5 px-4 select-none">
        <div className="col-span-5 md:col-span-4 flex items-center gap-2">
          <span>Request / Endpoint</span>
          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full vh-bg-accent/10 vh-text-accent">
            {sortedRequests.length}
          </span>
        </div>
        <div className="col-span-7 md:col-span-8 relative">
          <div className="flex justify-between w-full text-[10px] vh-text-muted">
            {timeTicks.map((tick, i) => (
              <span
                key={i}
                className={i === 0 ? "text-left" : i === timeTicks.length - 1 ? "text-right" : "text-center"}
              >
                +{tick.label}
              </span>
            ))}
          </div>
          {/* Subtle grid guideline columns */}
          <div className="absolute inset-x-0 -bottom-2.5 top-0 flex justify-between pointer-events-none opacity-20">
            {timeTicks.map((_, i) => (
              <div key={i} className="w-px h-[9999px] border-r border-dashed vh-border" />
            ))}
          </div>
        </div>
      </div>

      {/* Waterfall Rows */}
      <div className="divide-y vh-border max-h-[620px] overflow-y-auto">
        {sortedRequests.map((req) => {
          const isSelected = selectedRequestId === req.id;
          const isHovered = hoveredReqId === req.id;

          const startOffsetMs = Math.max(0, req.started_at - minTime);
          const startPct = Math.max(0, Math.min(98, (startOffsetMs / totalTimespan) * 100));

          const durationMs = req.duration_ms ?? 10;
          const rawWidthPct = (durationMs / totalTimespan) * 100;
          const widthPct = Math.max(1.2, Math.min(100 - startPct, rawWidthPct));

          const status = getStatusBadge(req.status, req.error);
          const methodColor = getMethodColor(req.method);
          const payloadBytes = getPayloadSize(req);

          let cleanPath = req.url;
          try {
            const parsed = new URL(req.url, "http://localhost");
            cleanPath = parsed.pathname + parsed.search;
          } catch {
            // Keep raw url
          }

          return (
            <div
              key={req.id}
              onClick={() => {
                playTone("click");
                onSelectRequest(req);
              }}
              onMouseEnter={() => setHoveredReqId(req.id)}
              onMouseLeave={() => setHoveredReqId(null)}
              className={`grid grid-cols-12 items-center py-2 px-4 text-xs transition cursor-pointer select-none group ${
                isSelected
                  ? "bg-sky-500/10 border-l-4 border-l-sky-500"
                  : isHovered
                  ? "bg-white/5"
                  : "hover:bg-white/5"
              }`}
            >
              {/* Request Info (Col 5 / 4) */}
              <div className="col-span-5 md:col-span-4 flex items-center gap-2 pr-3 min-w-0">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${methodColor}`}
                >
                  {req.method}
                </span>

                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${status.color}`}
                >
                  {status.label}
                </span>

                <span
                  title={req.url}
                  className="font-mono text-[11.5px] truncate vh-text-main flex-1 group-hover:text-sky-400 transition"
                >
                  {cleanPath}
                </span>

                <span className="text-[10px] font-mono vh-text-dim shrink-0 hidden sm:inline-block">
                  {formatDuration(req.duration_ms)}
                </span>
              </div>

              {/* Waterfall Gantt Bar (Col 7 / 8) */}
              <div className="col-span-7 md:col-span-8 relative flex items-center h-7 px-1">
                {/* Visual background timeline track */}
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden absolute inset-x-0" />

                {/* Duration Bar */}
                <div
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                  }}
                  className={`absolute h-4 rounded-md border text-[9.5px] flex items-center justify-between px-1.5 transition-all duration-150 z-10 ${status.barColor}`}
                >
                  <span className="font-mono text-white text-[9px] font-semibold drop-shadow-sm truncate">
                    {formatDuration(req.duration_ms)}
                  </span>
                </div>

                {/* Hover Tooltip Overlay */}
                {isHovered && (
                  <div
                    style={{ left: `${Math.min(startPct, 65)}%` }}
                    className="absolute -top-11 z-30 pointer-events-none flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-slate-100 text-[11px] shadow-xl border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                  >
                    <span className="font-semibold text-sky-300">{req.method}</span>
                    <span className="text-slate-400">+{formatDuration(startOffsetMs)}</span>
                    <span className="font-bold text-amber-300">{formatDuration(req.duration_ms)}</span>
                    {payloadBytes > 0 && (
                      <span className="text-emerald-300 font-mono text-[10px]">
                        {formatBytes(payloadBytes)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
