"use client";

import { useState, useMemo } from "react";
import {
  Gauge,
  Clock,
  Zap,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpDown,
  Flame,
  HardDrive,
  RefreshCw,
  Boxes,
  X,
} from "lucide-react";
import { useNetworkRequestDetailsQuery } from "@/lib/queries";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import { WaterfallChart } from "@/components/performance/waterfall-chart";
import { RequestDetails } from "@/components/network/request-details";
import type { NetworkRequest, NetworkRequestDetail } from "@/types/network";

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PerformancePage() {
  const { preferences, updatePreferences } = useDashboardPreferences();
  const activeApp = preferences.selectedProject !== "ALL" ? preferences.selectedProject : undefined;

  const [sampleLimit, setSampleLimit] = useState(100);
  const [searchFilter, setSearchFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [latencyFilter, setLatencyFilter] = useState<string>("ALL"); // "ALL" | ">200" | ">500" | ">1000"

  const [selectedDetail, setSelectedDetail] = useState<NetworkRequestDetail | null>(null);

  const { data, isLoading, isError, refetch } = useNetworkRequestDetailsQuery(
    sampleLimit,
    activeApp,
  );

  const allRequests = data?.data ?? [];

  // Filter requests
  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (methodFilter !== "ALL" && req.method.toUpperCase() !== methodFilter) {
        return false;
      }

      const dur = req.duration_ms ?? 0;
      if (latencyFilter === ">200" && dur < 200) return false;
      if (latencyFilter === ">500" && dur < 500) return false;
      if (latencyFilter === ">1000" && dur < 1000) return false;

      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesUrl = req.url.toLowerCase().includes(query);
        const matchesMethod = req.method.toLowerCase().includes(query);
        return matchesUrl || matchesMethod;
      }

      return true;
    });
  }, [allRequests, methodFilter, latencyFilter, searchFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (allRequests.length === 0) {
      return {
        totalCalls: 0,
        avgLatency: 0,
        p95Latency: 0,
        slowestDuration: 0,
        slowestUrl: "None",
        errorRate: 0,
        totalBytes: 0,
        statusCounts: { ok2xx: 0, red3xx: 0, err4xx: 0, err5xx: 0 },
      };
    }

    const durations = allRequests
      .map((r) => r.duration_ms ?? 0)
      .sort((a, b) => a - b);

    const totalDur = durations.reduce((acc, d) => acc + d, 0);
    const avgLatency = totalDur / durations.length;

    const p95Index = Math.min(
      Math.floor(durations.length * 0.95),
      durations.length - 1,
    );
    const p95Latency = durations[p95Index] ?? 0;

    let slowestDuration = 0;
    let slowestUrl = "";
    let errorCount = 0;
    let totalBytes = 0;

    const statusCounts = { ok2xx: 0, red3xx: 0, err4xx: 0, err5xx: 0 };

    for (const req of allRequests) {
      const dur = req.duration_ms ?? 0;
      if (dur >= slowestDuration) {
        slowestDuration = dur;
        try {
          const u = new URL(req.url, "http://localhost");
          slowestUrl = `${req.method} ${u.pathname}`;
        } catch {
          slowestUrl = `${req.method} ${req.url}`;
        }
      }

      if (req.error || (req.status && req.status >= 400)) {
        errorCount++;
      }

      if (req.status) {
        if (req.status >= 500) statusCounts.err5xx++;
        else if (req.status >= 400) statusCounts.err4xx++;
        else if (req.status >= 300) statusCounts.red3xx++;
        else if (req.status >= 200) statusCounts.ok2xx++;
      }

      if (req.response_headers_json) {
        try {
          const h = JSON.parse(req.response_headers_json) as Record<string, string>;
          const cl = h["content-length"] || h["Content-Length"];
          if (cl) totalBytes += Number(cl) || 0;
        } catch {
          // ignore
        }
      } else if (req.response_body_json) {
        totalBytes += typeof req.response_body_json === "string"
          ? req.response_body_json.length
          : JSON.stringify(req.response_body_json).length;
      }
    }

    const errorRate = (errorCount / allRequests.length) * 100;

    return {
      totalCalls: allRequests.length,
      avgLatency,
      p95Latency,
      slowestDuration,
      slowestUrl,
      errorRate,
      totalBytes,
      statusCounts,
    };
  }, [allRequests]);

  // Top Bottlenecks Leaderboard
  const bottlenecks = useMemo(() => {
    const routeMap = new Map<
      string,
      { method: string; path: string; count: number; totalMs: number; maxMs: number; errors: number }
    >();

    for (const req of allRequests) {
      let path = req.url;
      try {
        const u = new URL(req.url, "http://localhost");
        path = u.pathname;
      } catch {
        // ignore
      }

      const key = `${req.method} ${path}`;
      const existing = routeMap.get(key) || {
        method: req.method,
        path,
        count: 0,
        totalMs: 0,
        maxMs: 0,
        errors: 0,
      };

      const dur = req.duration_ms ?? 0;
      existing.count++;
      existing.totalMs += dur;
      if (dur > existing.maxMs) existing.maxMs = dur;
      if (req.error || (req.status && req.status >= 400)) existing.errors++;

      routeMap.set(key, existing);
    }

    return Array.from(routeMap.values())
      .map((item) => ({
        ...item,
        avgMs: item.totalMs / item.count,
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 5);
  }, [allRequests]);

  // Convert selectedDetail to NetworkRequest to open in RequestDetails modal
  const convertedSelectedRequest = useMemo<NetworkRequest | null>(() => {
    if (!selectedDetail) return null;
    return {
      id: selectedDetail.id,
      fingerprint: `${selectedDetail.app_name}:${selectedDetail.method}:${selectedDetail.url}`,
      app_name: selectedDetail.app_name,
      method: selectedDetail.method,
      url: selectedDetail.url,
      status: selectedDetail.status,
      duration_ms: selectedDetail.duration_ms,
      error: selectedDetail.error,
      count: 1,
      first_seen: selectedDetail.started_at,
      last_seen: selectedDetail.completed_at || selectedDetail.started_at,
    };
  }, [selectedDetail]);

  return (
    <main className="min-h-full space-y-6 vh-bg-app p-5 vh-text-main md:p-7">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Performance Waterfall</h1>
            <span className="flex items-center gap-1.5 rounded-full border vh-border-accent vh-bg-accent px-2.5 py-0.5 text-xs font-semibold vh-text-accent">
              <Gauge size={12} />
              Latency Profiler
            </span>
            {preferences.selectedProject !== "ALL" && (
              <span className="flex items-center gap-1.5 rounded-full border vh-border px-2.5 py-0.5 text-xs font-medium vh-text-muted">
                <Boxes size={11} />
                {preferences.selectedProject}
                <button
                  onClick={() => updatePreferences({ selectedProject: "ALL" })}
                  title="Show all projects"
                  className="hover:opacity-75"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm vh-text-muted">
            Analyze request latency bottlenecks, concurrency timings, and throughput across your application services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sampleLimit}
            onChange={(e) => setSampleLimit(Number(e.target.value))}
            className="rounded-lg border vh-border vh-bg-card px-3 py-1.5 text-xs font-medium vh-text-main focus:outline-none"
          >
            <option value={50}>Last 50 requests</option>
            <option value={100}>Last 100 requests</option>
            <option value={200}>Last 200 requests</option>
          </select>

          <button
            onClick={() => {
              playTone("click");
              void refetch();
            }}
            title="Refresh latency telemetry"
            className="flex items-center gap-1.5 rounded-lg border vh-border px-3 py-1.5 text-xs font-medium vh-text-main hover:bg-white/5 transition"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="vh-bg-card border vh-border rounded-xl p-3.5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs vh-text-dim">
            <span>Total Calls</span>
            <Zap size={14} className="text-sky-400" />
          </div>
          <p className="text-xl font-bold font-mono vh-text-main">{metrics.totalCalls}</p>
          <p className="text-[10px] vh-text-dim">Observed window</p>
        </div>

        <div className="vh-bg-card border vh-border rounded-xl p-3.5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs vh-text-dim">
            <span>Avg Latency</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono vh-text-main">{formatMs(metrics.avgLatency)}</p>
          <p className="text-[10px] vh-text-dim">Mean duration</p>
        </div>

        <div className="vh-bg-card border vh-border rounded-xl p-3.5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs vh-text-dim">
            <span>P95 Latency</span>
            <TrendingDown size={14} className="text-purple-400" />
          </div>
          <p className="text-xl font-bold font-mono vh-text-main">{formatMs(metrics.p95Latency)}</p>
          <p className="text-[10px] vh-text-dim">95th percentile</p>
        </div>

        <div className="vh-bg-card border vh-border rounded-xl p-3.5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs vh-text-dim">
            <span>Slowest Call</span>
            <Flame size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400">{formatMs(metrics.slowestDuration)}</p>
          <p className="text-[10px] vh-text-dim truncate" title={metrics.slowestUrl}>
            {metrics.slowestUrl || "None"}
          </p>
        </div>

        <div className="vh-bg-card border vh-border rounded-xl p-3.5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs vh-text-dim">
            <span>Error Rate</span>
            <AlertCircle size={14} className={metrics.errorRate > 0 ? "text-rose-400" : "text-emerald-400"} />
          </div>
          <p className={`text-xl font-bold font-mono ${metrics.errorRate > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {metrics.errorRate.toFixed(1)}%
          </p>
          <p className="text-[10px] vh-text-dim">4xx & 5xx statuses</p>
        </div>

        <div className="vh-bg-card border vh-border rounded-xl p-3.5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs vh-text-dim">
            <span>Transferred</span>
            <HardDrive size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono vh-text-main">{formatBytes(metrics.totalBytes)}</p>
          <p className="text-[10px] vh-text-dim">Estimated payload</p>
        </div>
      </section>

      {/* Bottlenecks & Status Distribution Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 5 Bottlenecks Leaderboard */}
        <div className="lg:col-span-2 vh-bg-card border vh-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={15} className="text-rose-400" />
              <h2 className="text-sm font-semibold vh-text-main">Top Bottlenecks (Slowest Unique Endpoints)</h2>
            </div>
            <span className="text-[11px] vh-text-dim">Ranked by mean response time</span>
          </div>

          {bottlenecks.length === 0 ? (
            <p className="text-xs vh-text-dim py-4 text-center">No endpoint traffic recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {bottlenecks.map((item, idx) => {
                const maxSlowest = metrics.slowestDuration || 1;
                const barWidth = Math.max(5, Math.min(100, (item.avgMs / maxSlowest) * 100));

                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border vh-border bg-white/5">
                          {item.method}
                        </span>
                        <span className="truncate vh-text-main" title={item.path}>
                          {item.path}
                        </span>
                        <span className="text-[10px] vh-text-dim">×{item.count}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {item.errors > 0 && (
                          <span className="text-[10px] text-rose-400">
                            {item.errors} err
                          </span>
                        )}
                        <span className="font-semibold text-amber-400">{formatMs(item.avgMs)} avg</span>
                        <span className="text-[10px] vh-text-dim">max {formatMs(item.maxMs)}</span>
                      </div>
                    </div>
                    {/* Visual Latency Bar */}
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className={`h-full rounded-full ${
                          item.avgMs > 1000
                            ? "bg-rose-500"
                            : item.avgMs > 400
                            ? "bg-amber-500"
                            : "bg-sky-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HTTP Status Breakdown Card */}
        <div className="vh-bg-card border vh-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <h2 className="text-sm font-semibold vh-text-main">Status Code Distribution</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-emerald-400">2xx Success</span>
                  <span>{metrics.statusCounts.ok2xx}</span>
                </div>
                <div className="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${metrics.totalCalls ? (metrics.statusCounts.ok2xx / metrics.totalCalls) * 100 : 0}%`,
                    }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-sky-400">3xx Redirect</span>
                  <span>{metrics.statusCounts.red3xx}</span>
                </div>
                <div className="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${metrics.totalCalls ? (metrics.statusCounts.red3xx / metrics.totalCalls) * 100 : 0}%`,
                    }}
                    className="h-full bg-sky-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-amber-400">4xx Client Error</span>
                  <span>{metrics.statusCounts.err4xx}</span>
                </div>
                <div className="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${metrics.totalCalls ? (metrics.statusCounts.err4xx / metrics.totalCalls) * 100 : 0}%`,
                    }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-rose-400">5xx Server Error</span>
                  <span>{metrics.statusCounts.err5xx}</span>
                </div>
                <div className="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${metrics.totalCalls ? (metrics.statusCounts.err5xx / metrics.totalCalls) * 100 : 0}%`,
                    }}
                    className="h-full bg-rose-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t vh-border flex items-center justify-between text-[11px] vh-text-dim">
            <span>Overall Success Rate</span>
            <span className="font-mono font-bold text-emerald-400">
              {metrics.totalCalls
                ? `${((metrics.statusCounts.ok2xx / metrics.totalCalls) * 100).toFixed(1)}%`
                : "100%"}
            </span>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 vh-bg-card border vh-border rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 vh-text-dim" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by pathname or method..."
              className="w-full rounded-lg border vh-border vh-bg-card pl-8 pr-3 py-1.5 text-xs vh-text-main focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  playTone("click");
                  setMethodFilter(m);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition ${
                  methodFilter === m
                    ? "vh-bg-accent vh-text-accent border vh-border-accent"
                    : "border vh-border vh-text-dim hover:bg-white/5"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs vh-text-dim flex items-center gap-1">
            <Filter size={12} /> Latency:
          </span>
          {[
            { id: "ALL", label: "All" },
            { id: ">200", label: ">200ms" },
            { id: ">500", label: ">500ms" },
            { id: ">1000", label: ">1s (Slow)" },
          ].map((tier) => (
            <button
              key={tier.id}
              onClick={() => {
                playTone("click");
                setLatencyFilter(tier.id);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                latencyFilter === tier.id
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : "border vh-border vh-text-dim hover:bg-white/5"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </section>

      {/* Waterfall Timeline Gantt Section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs vh-text-dim px-1">
          <span>Click any request row to inspect full headers, response payloads, or re-run live.</span>
          <span>Showing {filteredRequests.length} of {allRequests.length} events</span>
        </div>

        <WaterfallChart
          requests={filteredRequests}
          onSelectRequest={(req) => setSelectedDetail(req)}
          selectedRequestId={selectedDetail?.id ?? null}
        />
      </section>

      {/* Request Details Modal */}
      {selectedDetail && (
        <RequestDetails
          request={convertedSelectedRequest}
          detail={selectedDetail}
          details={[selectedDetail]}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </main>
  );
}
