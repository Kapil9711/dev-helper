"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Layers3,
  Copy,
  Check,
  Terminal,
  Activity,
  ArrowRight,
  Clock,
  Boxes,
  FileCode,
  Send,
  Download,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NetworkRequest, NetworkRequestDetail } from "@/types/network";
import { PrettyJson } from "@/components/shared/pretty-json";
import { ApiRequestRunner } from "@/components/shared/api-request-runner";
import { playTone } from "@/lib/prefrences";

interface RequestDetailsProps {
  request: NetworkRequest | null;
  detail?: NetworkRequestDetail | null;
  details?: NetworkRequestDetail[];
  onClose: () => void;
}

type TabKey = "overview" | "request" | "response" | "test" | "curl";

export function RequestDetails({
  request,
  detail = null,
  details = [],
  onClose,
}: RequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [urlCopied, setUrlCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  const allInstances = useMemo<NetworkRequestDetail[]>(() => {
    if (details.length > 0) return details;
    return detail ? [detail] : [];
  }, [details, detail]);

  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(
    detail?.id ?? null,
  );

  // Sync selectedInstanceId when detail or request changes
  useEffect(() => {
    if (detail?.id) {
      setSelectedInstanceId(detail.id);
      return;
    }

    if (!request || allInstances.length === 0) {
      setSelectedInstanceId(null);
      return;
    }

    const requestIsError = Boolean(
      (request.error !== null && request.error !== undefined && request.error.trim().length > 0) ||
      (request.status !== null && request.status !== undefined && request.status >= 400),
    );

    if (requestIsError) {
      const errInst = allInstances.find(
        (inst) =>
          (inst.error !== null && inst.error !== undefined && inst.error.trim().length > 0) ||
          (inst.status !== null && inst.status !== undefined && inst.status >= 400),
      );
      if (errInst) {
        setSelectedInstanceId(errInst.id);
        return;
      }
    } else if (
      request.status !== null &&
      request.status !== undefined &&
      request.status >= 200 &&
      request.status < 400
    ) {
      const succInst = allInstances.find(
        (inst) =>
          (!inst.error || inst.error.trim().length === 0) &&
          inst.status !== null &&
          inst.status >= 200 &&
          inst.status < 400,
      );
      if (succInst) {
        setSelectedInstanceId(succInst.id);
        return;
      }
    }

    setSelectedInstanceId(allInstances[0]?.id ?? null);
  }, [detail?.id, request?.id, request?.status, request?.error, allInstances]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!request) return null;

  const activeDetail =
    (selectedInstanceId !== null
      ? allInstances.find((inst) => inst.id === selectedInstanceId)
      : null) ??
    detail ??
    allInstances[0] ??
    null;

  const copyUrl = () => {
    navigator.clipboard.writeText(request.url);
    setUrlCopied(true);
    playTone("success");
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const generateCurl = () => {
    let curl = `curl -X ${request.method} "${request.url}"`;
    if (activeDetail?.request_headers_json) {
      try {
        const headers = JSON.parse(activeDetail.request_headers_json);
        for (const [k, v] of Object.entries(headers)) {
          curl += ` \\\n  -H "${k}: ${v}"`;
        }
      } catch {}
    }
    if (activeDetail?.request_body_json) {
      curl += ` \\\n  --data '${activeDetail.request_body_json.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCurlCopied(true);
    playTone("success");
    setTimeout(() => setCurlCopied(false), 2000);
  };

  // Determine status and error: activeDetail takes precedence if available
  const activeStatus = activeDetail ? activeDetail.status : request.status;
  const activeError = activeDetail ? activeDetail.error : request.error;

  const isError = Boolean(
    (activeError !== null && activeError !== undefined && activeError.trim().length > 0) ||
    (activeStatus !== null && activeStatus !== undefined && activeStatus >= 400),
  );

  const isSuccess = Boolean(
    !isError &&
    activeStatus !== null &&
    activeStatus !== undefined &&
    activeStatus >= 200 &&
    activeStatus < 400,
  );

  const statusLabel = activeStatus
    ? `${activeStatus} ${activeDetail?.status_text ?? ""}`.trim()
    : isError
      ? activeError
        ? activeError.startsWith("HTTP ")
          ? activeError
          : `ERR: ${activeError}`
        : "ERR"
      : "Pending";

  const methodColors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    PATCH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    DELETE: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const badgeClass =
    methodColors[request.method.toUpperCase()] ??
    "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl xl:max-w-6xl h-[90vh] rounded-2xl border vh-border vh-bg-modal shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-5 py-4 vh-bg-card/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-black uppercase tracking-wider ${badgeClass}`}
            >
              {request.method}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-bold ${
                    isSuccess
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : isError
                        ? "bg-red-500/15 text-red-400 border border-red-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {statusLabel}
                </span>

                <span className="flex items-center gap-1 rounded-md bg-white/5 border vh-border px-2 py-0.5 text-xs font-mono vh-text-dim">
                  <Clock size={11} />
                  {activeDetail?.duration_ms != null
                    ? `${Math.round(activeDetail.duration_ms)} ms`
                    : request.duration_ms != null
                      ? `${Math.round(request.duration_ms)} ms`
                      : "—"}
                </span>

                <span className="hidden sm:flex items-center gap-1 rounded-md bg-white/5 border vh-border px-2 py-0.5 text-xs font-semibold vh-text-muted">
                  <Boxes size={11} />
                  {request.app_name}
                </span>
              </div>

              <p className="mt-1 truncate font-mono text-xs vh-text-main" title={request.url}>
                {request.url}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("test")}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "test"
                  ? "border-sky-500 bg-sky-500/20 text-sky-300"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
              }`}
              title="Make Request / Replay API"
            >
              <Send size={13} />
              <span className="hidden sm:inline">Make Request</span>
            </button>

            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1.5 text-xs font-medium vh-text-muted hover:text-white hover:bg-white/5 transition"
              title="Copy Request URL"
            >
              {urlCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{urlCopied ? "Copied" : "Copy URL"}</span>
            </button>

            <button
              onClick={copyCurl}
              className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1.5 text-xs font-medium vh-text-muted hover:text-white hover:bg-white/5 transition"
              title="Copy cURL Command"
            >
              {curlCopied ? <Check size={13} className="text-emerald-400" /> : <Terminal size={13} />}
              <span className="hidden sm:inline">{curlCopied ? "Copied" : "cURL"}</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close request inspector"
              className="flex items-center gap-1 rounded-lg border vh-border p-1.5 text-xs vh-text-dim hover:text-white hover:bg-white/10 transition"
              title="Close (Esc)"
            >
              <X size={16} />
              <span className="hidden md:inline text-[10px] uppercase font-mono px-1 opacity-70">
                Esc
              </span>
            </button>
          </div>
        </div>

        {/* Multi-instance invocation picker */}
        {allInstances.length > 1 && (
          <div className="flex items-center gap-2 border-b vh-border bg-white/[0.02] px-5 py-2.5 shrink-0 overflow-x-auto">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider vh-text-dim shrink-0">
              <Layers3 size={13} className="vh-text-accent" />
              Attempts ({allInstances.length}):
            </span>
            <div className="flex items-center gap-1.5">
              {allInstances.map((inst, index) => {
                const isSelected = inst.id === activeDetail?.id;
                const isLatest = index === 0;
                const instIsError = Boolean(
                  (inst.error !== null && inst.error !== undefined && inst.error.trim().length > 0) ||
                  (inst.status !== null && inst.status !== undefined && inst.status >= 400),
                );
                const instIsSuccess = Boolean(
                  !instIsError &&
                  inst.status !== null &&
                  inst.status !== undefined &&
                  inst.status >= 200 &&
                  inst.status < 400,
                );
                const statusColor = instIsSuccess
                  ? "text-emerald-400"
                  : instIsError
                    ? "text-red-400"
                    : "text-amber-400";

                const label = inst.status ? `${inst.status}` : instIsError ? "ERR" : "Pending";

                return (
                  <button
                    key={inst.id}
                    onClick={() => setSelectedInstanceId(inst.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition shrink-0 ${
                      isSelected
                        ? "vh-border-accent vh-bg-accent font-bold ring-1 ring-white/20"
                        : "vh-border hover:bg-white/5"
                    }`}
                  >
                    <span className={statusColor}>
                      {label}
                    </span>
                    <span className="vh-text-dim text-[11px]">
                      {isLatest ? "Latest" : `#${allInstances.length - index}`}
                    </span>
                    {inst.duration_ms != null && (
                      <span className="text-[10px] opacity-60">
                        {Math.round(inst.duration_ms)}ms
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b vh-border px-5 vh-bg-card/40 shrink-0 gap-1 overflow-x-auto">
          {[
            {
              id: "overview" as const,
              label: "Overview",
              badge: isError ? "Error" : undefined,
              badgeColor: isError ? "bg-red-500/20 text-red-400" : undefined,
            },
            {
              id: "request" as const,
              label: "Request Payload & Headers",
              badge: activeDetail?.request_body_json ? "Payload" : undefined,
              badgeColor: "bg-blue-500/20 text-blue-400",
            },
            {
              id: "response" as const,
              label: "Response Payload",
              badge: activeStatus ? `${activeStatus}` : isError ? "ERR" : undefined,
              badgeColor: isSuccess
                ? "bg-emerald-500/20 text-emerald-400"
                : isError
                  ? "bg-red-500/20 text-red-400"
                  : "bg-amber-500/20 text-amber-300",
            },
            {
              id: "test" as const,
              label: "Make Request",
              badge: "Live",
              badgeColor: "bg-sky-500/20 text-sky-400",
            },
            {
              id: "curl" as const,
              label: "cURL & Replay",
            },
          ].map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition shrink-0 ${
                  isCurrent
                    ? "border-blue-500 vh-text-main"
                    : "border-transparent vh-text-dim hover:text-white hover:border-white/20"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                      tab.badgeColor ?? "bg-white/10 vh-text-muted"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Stat Metric Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border vh-border vh-bg-card p-4">
                  <p className="text-[11px] font-medium vh-text-dim uppercase tracking-wider">
                    Status
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold font-mono ${
                      isSuccess
                        ? "text-emerald-400"
                        : isError
                          ? "text-red-400"
                          : "text-amber-300"
                    }`}
                  >
                    {activeStatus ?? (isError ? "ERR" : "Pending")}
                  </p>
                  <p className="mt-0.5 text-xs vh-text-dim truncate">
                    {activeDetail?.status_text ?? (isError ? (activeError || "Network Failure") : "HTTP Response")}
                  </p>
                </div>

                <div className="rounded-xl border vh-border vh-bg-card p-4">
                  <p className="text-[11px] font-medium vh-text-dim uppercase tracking-wider">
                    Latency
                  </p>
                  <p className="mt-1 text-xl font-bold font-mono vh-text-main">
                    {activeDetail?.duration_ms != null
                      ? `${Math.round(activeDetail.duration_ms)} ms`
                      : request.duration_ms != null
                        ? `${Math.round(request.duration_ms)} ms`
                        : "—"}
                  </p>
                  <p className="mt-0.5 text-xs vh-text-dim">Roundtrip duration</p>
                </div>

                <div className="rounded-xl border vh-border vh-bg-card p-4">
                  <p className="text-[11px] font-medium vh-text-dim uppercase tracking-wider">
                    Total Calls
                  </p>
                  <p className="mt-1 text-xl font-bold font-mono vh-text-main">
                    ×{allInstances.length > 0 ? allInstances.length : request.count}
                  </p>
                  <p className="mt-0.5 text-xs vh-text-dim">Matching fingerprint</p>
                </div>

                <div className="rounded-xl border vh-border vh-bg-card p-4">
                  <p className="text-[11px] font-medium vh-text-dim uppercase tracking-wider">
                    App Scope
                  </p>
                  <p className="mt-1 text-xl font-bold truncate vh-text-accent">
                    {request.app_name}
                  </p>
                  <p className="mt-0.5 text-xs vh-text-dim">Source telemetry</p>
                </div>
              </div>

              {/* Error Message Box */}
              {activeError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                    <AlertTriangle size={15} />
                    Network Failure Captured
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs text-red-300 select-all">
                    {activeError}
                  </pre>
                </div>
              )}

              {/* Full URL Box with Copy Button */}
              <div className="rounded-xl border vh-border vh-bg-input p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider vh-text-dim">
                    Target URL
                  </span>
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-1.5 text-xs font-semibold vh-text-accent hover:underline"
                  >
                    {urlCopied ? <Check size={12} /> : <Copy size={12} />}
                    {urlCopied ? "Copied" : "Copy URL"}
                  </button>
                </div>
                <p className="font-mono text-xs break-all leading-6 vh-text-main select-all">
                  {request.url}
                </p>
              </div>

              {/* Summary Metadata Table */}
              <div className="rounded-xl border vh-border vh-bg-card overflow-hidden">
                <div className="border-b vh-border px-4 py-3 text-xs font-bold vh-text-main">
                  Detailed Request Metadata
                </div>
                <div className="divide-y vh-border-subtle text-xs">
                  {[
                    { label: "Application Name", value: request.app_name },
                    { label: "HTTP Method", value: request.method },
                    {
                      label: "HTTP Status",
                      value: statusLabel,
                    },
                    {
                      label: "Duration",
                      value:
                        activeDetail?.duration_ms != null
                          ? `${Math.round(activeDetail.duration_ms)} ms`
                          : "—",
                    },
                    {
                      label: "Total Captured Invocations",
                      value: `${request.count} times`,
                    },
                    {
                      label: "First Captured",
                      value: new Date(request.first_seen).toLocaleString(),
                    },
                    {
                      label: "Last Captured",
                      value: `${new Date(request.last_seen).toLocaleString()} (${formatDistanceToNow(request.last_seen, { addSuffix: true })})`,
                    },
                    ...(activeDetail
                      ? [
                          {
                            label: "Instance Request ID",
                            value: activeDetail.request_id,
                          },
                          {
                            label: "Started At",
                            value: new Date(activeDetail.started_at).toLocaleString(),
                          },
                          ...(activeDetail.completed_at
                            ? [
                                {
                                  label: "Completed At",
                                  value: new Date(activeDetail.completed_at).toLocaleString(),
                                },
                              ]
                            : []),
                        ]
                      : []),
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <span className="vh-text-dim">{row.label}</span>
                      <span className="font-mono font-medium vh-text-main text-right break-all">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REQUEST PAYLOAD & HEADERS */}
          {activeTab === "request" && (
            <div className="space-y-6">
              {activeDetail?.params_json && (
                <PrettyJson
                  title="Query Parameters"
                  data={activeDetail.params_json}
                  maxHeight="300px"
                  allowDownload
                />
              )}

              {activeDetail?.request_headers_json ? (
                <PrettyJson
                  title="Request Headers"
                  data={activeDetail.request_headers_json}
                  maxHeight="320px"
                  allowDownload
                />
              ) : (
                <div className="rounded-xl border vh-border vh-bg-card p-4 text-xs vh-text-dim text-center">
                  No request headers recorded
                </div>
              )}

              {activeDetail?.request_body_json ? (
                <PrettyJson
                  title="Request Body Payload"
                  data={activeDetail.request_body_json}
                  maxHeight="480px"
                  allowDownload
                />
              ) : (
                <div className="rounded-xl border vh-border vh-bg-card p-6 text-center">
                  <FileCode size={24} className="mx-auto mb-2 vh-text-dim opacity-60" />
                  <p className="text-xs font-semibold vh-text-main">No Request Body</p>
                  <p className="mt-1 text-[11px] vh-text-dim">
                    This was a {request.method} request with no payload body submitted.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESPONSE PAYLOAD */}
          {activeTab === "response" && (
            <div className="space-y-6">
              {/* Response status header banner */}
              <div className="flex items-center justify-between rounded-xl border vh-border vh-bg-input px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium vh-text-dim">Response Status:</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      isSuccess
                        ? "text-emerald-400"
                        : isError
                          ? "text-red-400"
                          : "text-amber-300"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
                {activeDetail?.duration_ms != null && (
                  <span className="font-mono text-xs vh-text-dim">
                    Latency: {Math.round(activeDetail.duration_ms)} ms
                  </span>
                )}
              </div>

              {activeDetail?.response_headers_json && (
                <PrettyJson
                  title="Response Headers"
                  data={activeDetail.response_headers_json}
                  maxHeight="300px"
                  allowDownload
                />
              )}

              {activeDetail?.response_body_json ? (
                <PrettyJson
                  title="Response Body Payload"
                  data={activeDetail.response_body_json}
                  maxHeight="480px"
                  allowDownload
                />
              ) : isError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-2">
                  <AlertTriangle size={24} className="mx-auto text-red-400" />
                  <p className="text-xs font-bold text-red-300">
                    {activeStatus ? `HTTP ${activeStatus} Error Response` : "Network Request Failed"}
                  </p>
                  <p className="text-[11px] text-red-400/90 font-mono max-w-lg mx-auto break-words">
                    {activeError ?? "The server returned an error without a response body."}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border vh-border vh-bg-card p-8 text-center">
                  <FileCode size={26} className="mx-auto mb-2 vh-text-dim opacity-50" />
                  <p className="text-xs font-semibold vh-text-main">No Response Body Captured</p>
                  <p className="mt-1 text-[11px] vh-text-dim max-w-sm mx-auto leading-5">
                    This endpoint returned an empty body, a redirect, HTTP 204 No Content, or was streamed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MAKE REQUEST / PLAYGROUND */}
          {activeTab === "test" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b vh-border pb-3">
                <div>
                  <h3 className="text-sm font-bold vh-text-main">Make Request & Replay</h3>
                  <p className="text-xs vh-text-dim">
                    Edit parameters, headers, and body, then execute this request live to inspect the response.
                  </p>
                </div>
              </div>

              <ApiRequestRunner
                initialMethod={request.method}
                initialUrl={request.url}
                initialParamsJson={activeDetail?.params_json}
                initialHeadersJson={activeDetail?.request_headers_json}
                initialBodyJson={activeDetail?.request_body_json}
                appName={request.app_name}
              />
            </div>
          )}

          {/* TAB 5: cURL & REPLAY */}
          {activeTab === "curl" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold vh-text-main">cURL Command</h3>
                  <p className="text-[11px] vh-text-dim">
                    Reproduce or test this HTTP call directly in your terminal.
                  </p>
                </div>

                <button
                  onClick={copyCurl}
                  className="flex items-center gap-1.5 rounded-lg border vh-border-accent vh-bg-accent px-3 py-1.5 text-xs font-bold vh-text-accent hover:opacity-90 transition shadow-sm"
                >
                  {curlCopied ? <Check size={13} /> : <Copy size={13} />}
                  {curlCopied ? "Copied to Clipboard!" : "Copy cURL"}
                </button>
              </div>

              <div className="relative rounded-xl border vh-border bg-black/60 p-4 font-mono text-xs overflow-x-auto">
                <pre className="text-emerald-400 whitespace-pre-wrap break-all leading-6">
                  {generateCurl()}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
