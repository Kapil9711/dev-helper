"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Send,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Copy,
  Clock,
  Layers,
  Code2,
  Terminal,
  AlertTriangle,
  FileCode,
  Sparkles,
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Hash,
  Database,
  ArrowRight,
  ShieldAlert,
  Maximize2,
  KeyRound,
  FileText,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PrettyJson } from "@/components/shared/pretty-json";
import { playTone } from "@/lib/prefrences";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface ApiRequestRunnerProps {
  initialMethod?: string;
  initialUrl?: string;
  initialParamsJson?: string | null;
  initialHeadersJson?: string | null;
  initialBodyJson?: string | null;
  appName?: string;
  compact?: boolean;
  className?: string;
}

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] as const;

function parseJsonToKvPairs(jsonStr: string | null | undefined): KeyValuePair[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([k, v], idx) => ({
        id: `${k}-${idx}-${Date.now()}`,
        key: k,
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
        enabled: true,
      }));
    }
  } catch {}
  return [];
}

export function methodColor(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-blue-400 bg-blue-500/15 border-blue-500/30";
    case "POST":
      return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
    case "PUT":
    case "PATCH":
      return "text-amber-400 bg-amber-500/15 border-amber-500/30";
    case "DELETE":
      return "text-rose-400 bg-rose-500/15 border-rose-500/30";
    default:
      return "text-purple-400 bg-purple-500/15 border-purple-500/30";
  }
}

export function ApiRequestRunner({
  initialMethod = "GET",
  initialUrl = "",
  initialParamsJson = null,
  initialHeadersJson = null,
  initialBodyJson = null,
  appName,
  compact = false,
  className = "",
}: ApiRequestRunnerProps) {
  const [method, setMethod] = useState(initialMethod.toUpperCase());
  const [url, setUrl] = useState(initialUrl);

  const [params, setParams] = useState<KeyValuePair[]>(() =>
    parseJsonToKvPairs(initialParamsJson),
  );
  const [headers, setHeaders] = useState<KeyValuePair[]>(() =>
    parseJsonToKvPairs(initialHeadersJson),
  );
  const [bodyText, setBodyText] = useState<string>(() => {
    if (!initialBodyJson) return "";
    try {
      return JSON.stringify(JSON.parse(initialBodyJson), null, 2);
    } catch {
      return initialBodyJson;
    }
  });

  const [reqTab, setReqTab] = useState<"params" | "headers" | "body" | "auth">("params");
  const [resTab, setResTab] = useState<"body" | "headers" | "curl">("body");

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number | null;
    statusText: string;
    headers: Record<string, string>;
    body: string | null;
    durationMs: number;
    error?: string | null;
  } | null>(null);

  const [copiedCurl, setCopiedCurl] = useState(false);
  const [jsonFormatError, setJsonFormatError] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    setMethod(initialMethod.toUpperCase());
    setUrl(initialUrl);
    setParams(parseJsonToKvPairs(initialParamsJson));
    setHeaders(parseJsonToKvPairs(initialHeadersJson));
    try {
      setBodyText(
        initialBodyJson ? JSON.stringify(JSON.parse(initialBodyJson), null, 2) : "",
      );
    } catch {
      setBodyText(initialBodyJson || "");
    }
    setResponse(null);
    setJsonFormatError(null);
  }, [initialMethod, initialUrl, initialParamsJson, initialHeadersJson, initialBodyJson]);

  const handleReset = () => {
    setMethod(initialMethod.toUpperCase());
    setUrl(initialUrl);
    setParams(parseJsonToKvPairs(initialParamsJson));
    setHeaders(parseJsonToKvPairs(initialHeadersJson));
    try {
      setBodyText(
        initialBodyJson ? JSON.stringify(JSON.parse(initialBodyJson), null, 2) : "",
      );
    } catch {
      setBodyText(initialBodyJson || "");
    }
    setResponse(null);
    setJsonFormatError(null);
    playTone("click");
  };

  const handleFormatJson = () => {
    if (!bodyText.trim()) return;
    try {
      const parsed = JSON.parse(bodyText);
      setBodyText(JSON.stringify(parsed, null, 2));
      setJsonFormatError(null);
      playTone("success");
    } catch (err: any) {
      setJsonFormatError(err.message || "Invalid JSON syntax");
      playTone("error");
    }
  };

  const addParamRow = () => {
    setParams((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${Math.random()}`, key: "", value: "", enabled: true },
    ]);
  };

  const updateParamRow = (id: string, field: keyof KeyValuePair, val: any) => {
    setParams((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row)),
    );
  };

  const removeParamRow = (id: string) => {
    setParams((prev) => prev.filter((row) => row.id !== id));
  };

  const addHeaderRow = () => {
    setHeaders((prev) => [
      ...prev,
      { id: `h-${Date.now()}-${Math.random()}`, key: "", value: "", enabled: true },
    ]);
  };

  const updateHeaderRow = (id: string, field: keyof KeyValuePair, val: any) => {
    setHeaders((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row)),
    );
  };

  const removeHeaderRow = (id: string) => {
    setHeaders((prev) => prev.filter((row) => row.id !== id));
  };

  // Build active objects
  const activeParamsObj = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const p of params) {
      if (p.enabled && p.key.trim()) {
        obj[p.key.trim()] = p.value;
      }
    }
    return obj;
  }, [params]);

  const activeHeadersObj = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const h of headers) {
      if (h.enabled && h.key.trim()) {
        obj[h.key.trim()] = h.value;
      }
    }
    return obj;
  }, [headers]);

  const liveCurl = useMemo(() => {
    let finalUrl = url;
    if (Object.keys(activeParamsObj).length > 0) {
      try {
        const u = new URL(url, "http://localhost");
        for (const [k, v] of Object.entries(activeParamsObj)) {
          u.searchParams.set(k, v);
        }
        finalUrl = u.toString();
      } catch {}
    }

    let curl = `curl -X ${method} "${finalUrl}"`;
    for (const [k, v] of Object.entries(activeHeadersObj)) {
      curl += ` \\\n  -H "${k}: ${v}"`;
    }
    if (method !== "GET" && method !== "HEAD" && bodyText.trim()) {
      curl += ` \\\n  --data '${bodyText.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  }, [method, url, activeParamsObj, activeHeadersObj, bodyText]);

  const handleSendRequest = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setResponse(null);
    playTone("click");

    try {
      const res = await apiClient.executeProxyRequest({
        method,
        url: url.trim(),
        headers: activeHeadersObj,
        params: activeParamsObj,
        body: method !== "GET" && method !== "HEAD" ? bodyText : null,
      });

      setResponse(res);
      if (res.status && res.status >= 200 && res.status < 400) {
        playTone("success");
      } else {
        playTone("error");
      }
    } catch (err: any) {
      setResponse({
        status: null,
        statusText: "Client Exception",
        headers: {},
        body: null,
        durationMs: 0,
        error: err.message || "Failed to make request",
      });
      playTone("error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(liveCurl);
    setCopiedCurl(true);
    playTone("success");
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const resIsSuccess =
    response?.status !== null &&
    response?.status !== undefined &&
    response.status >= 200 &&
    response.status < 400 &&
    !response?.error;

  const resIsError =
    response?.error != null ||
    (response?.status !== null && response?.status !== undefined && response.status >= 400);

  return (
    <div className={`flex flex-col space-y-4 font-sans ${className}`}>
      {/* 1. Sleek Standalone URL Bar (Postman/Insomnia Studio Style) */}
      <div className="rounded-2xl border vh-border vh-bg-card p-2 shadow-sm transition">
        <div className="flex flex-wrap items-center gap-2">
          {/* Method Pill Selector */}
          <div className="relative shrink-0">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={`rounded-xl border px-3.5 py-2.5 font-mono text-xs font-black uppercase tracking-wider outline-none transition cursor-pointer appearance-none pr-8 ${methodColor(
                method,
              )}`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m} className="bg-zinc-950 text-white font-mono font-bold">
                  {m}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-3 text-[10px] opacity-70">
              ▼
            </span>
          </div>

          {/* URL Input Box */}
          <div className="flex min-w-[280px] flex-1 items-center rounded-xl border vh-border vh-bg-input px-3.5 focus-within:border-sky-500/60 focus-within:ring-2 focus-within:ring-sky-500/20 transition">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1/resource"
              className="w-full bg-transparent py-2.5 font-mono text-xs vh-text-main outline-none placeholder:text-gray-500"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  void handleSendRequest();
                }
              }}
            />
            {url && (
              <button
                onClick={() => setUrl("")}
                className="text-xs vh-text-dim hover:text-white p-1"
                title="Clear URL"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Action Suite */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Reset to originally captured request"
              className="flex items-center gap-1.5 rounded-xl border vh-border px-3 py-2.5 text-xs font-medium vh-text-muted hover:bg-white/5 hover:text-white transition"
            >
              <RotateCcw size={13} />
              <span className="hidden md:inline">Reset</span>
            </button>

            <button
              onClick={() => void handleSendRequest()}
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-sky-400 hover:to-blue-500 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} className={isLoading ? "animate-pulse" : ""} />
              <span>{isLoading ? "Executing..." : "Send"}</span>
              <kbd className="hidden sm:inline-block rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-mono font-medium opacity-90">
                ⌘↵
              </kbd>
            </button>
          </div>
        </div>

        {/* Sub-bar with telemetry badge & helpers */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t vh-border pt-2 px-1 text-[11px] vh-text-dim">
          <div className="flex items-center gap-3">
            {appName && (
              <span className="flex items-center gap-1">
                <Layers size={11} className="vh-text-accent" />
                Target App: <strong className="font-mono vh-text-main">{appName}</strong>
              </span>
            )}
            <span className="hidden sm:inline">Proxy Mode: Active (Bypasses CORS & header limits)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCurl}
              className="flex items-center gap-1 hover:text-white transition"
              title="Copy cURL Command"
            >
              {copiedCurl ? <Check size={11} className="text-emerald-400" /> : <Terminal size={11} />}
              <span>{copiedCurl ? "cURL Copied" : "Copy cURL"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Request Configuration Studio Tabs */}
      <div className="rounded-2xl border vh-border vh-bg-card overflow-hidden shadow-sm">
        {/* Tab Headers */}
        <div className="flex items-center border-b vh-border px-4 vh-bg-card/60 gap-1 overflow-x-auto">
          {[
            {
              id: "params" as const,
              label: "Params",
              count: Object.keys(activeParamsObj).length,
            },
            {
              id: "headers" as const,
              label: "Headers",
              count: Object.keys(activeHeadersObj).length,
            },
            {
              id: "body" as const,
              label: "Body",
              badge: bodyText.trim() ? "JSON" : undefined,
            },
            {
              id: "auth" as const,
              label: "Auth / Presets",
              count: undefined,
            },
          ].map((tab) => {
            const isCurrent = reqTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReqTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition shrink-0 ${
                  isCurrent
                    ? "border-sky-500 vh-text-main"
                    : "border-transparent vh-text-dim hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="rounded-full bg-sky-500/20 text-sky-400 font-mono text-[10px] px-1.5 py-0.2 font-bold">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] px-1.5 py-0.2 font-bold uppercase">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Params (Table Grid) */}
        {reqTab === "params" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider vh-text-dim">
                  Query Parameters
                </h4>
                <p className="text-[11px] vh-text-dim">
                  Appended to the URL path as key-value search parameters.
                </p>
              </div>

              <button
                onClick={addParamRow}
                className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1 text-xs font-semibold text-sky-400 hover:bg-white/5 transition"
              >
                <Plus size={13} />
                <span>Add Param</span>
              </button>
            </div>

            {params.length === 0 ? (
              <div className="rounded-xl border border-dashed vh-border p-6 text-center">
                <p className="text-xs vh-text-dim">No query parameters added yet.</p>
                <button
                  onClick={addParamRow}
                  className="mt-2 text-xs font-semibold text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={12} /> Add parameter
                </button>
              </div>
            ) : (
              <div className="rounded-xl border vh-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b vh-border vh-bg-subtle text-[11px] font-semibold uppercase tracking-wider vh-text-dim">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center">Active</th>
                      <th className="w-2/5 px-3 py-2">Key</th>
                      <th className="px-3 py-2">Value</th>
                      <th className="w-10 px-3 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y vh-border-subtle">
                    {params.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02] group">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => updateParamRow(row.id, "enabled", e.target.checked)}
                            className="rounded accent-sky-500 cursor-pointer"
                            title="Include in request"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Key"
                            value={row.key}
                            onChange={(e) => updateParamRow(row.id, "key", e.target.value)}
                            className="w-full rounded-md border vh-border vh-bg-input px-2 py-1 font-mono text-xs vh-text-main outline-none focus:border-sky-500/50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => updateParamRow(row.id, "value", e.target.value)}
                            className="w-full rounded-md border vh-border vh-bg-input px-2 py-1 font-mono text-xs vh-text-main outline-none focus:border-sky-500/50"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeParamRow(row.id)}
                            className="rounded p-1 vh-text-dim hover:text-red-400 opacity-60 group-hover:opacity-100 transition"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Headers (Table Grid) */}
        {reqTab === "headers" && (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider vh-text-dim">
                  HTTP Request Headers
                </h4>
                <p className="text-[11px] vh-text-dim">
                  Custom request headers submitted with the HTTP call.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHeaders((prev) => [
                      ...prev,
                      {
                        id: `h-json-${Date.now()}`,
                        key: "Content-Type",
                        value: "application/json",
                        enabled: true,
                      },
                    ]);
                  }}
                  className="rounded-lg border vh-border px-2 py-1 text-[11px] font-mono text-sky-400 hover:bg-white/5 transition"
                >
                  + Content-Type: json
                </button>
                <button
                  onClick={addHeaderRow}
                  className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1 text-xs font-semibold text-sky-400 hover:bg-white/5 transition"
                >
                  <Plus size={13} />
                  <span>Add Header</span>
                </button>
              </div>
            </div>

            {headers.length === 0 ? (
              <div className="rounded-xl border border-dashed vh-border p-6 text-center">
                <p className="text-xs vh-text-dim">No headers configured.</p>
                <button
                  onClick={addHeaderRow}
                  className="mt-2 text-xs font-semibold text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={12} /> Add header
                </button>
              </div>
            ) : (
              <div className="rounded-xl border vh-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b vh-border vh-bg-subtle text-[11px] font-semibold uppercase tracking-wider vh-text-dim">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center">Active</th>
                      <th className="w-2/5 px-3 py-2">Header Key</th>
                      <th className="px-3 py-2">Header Value</th>
                      <th className="w-10 px-3 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y vh-border-subtle">
                    {headers.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02] group">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => updateHeaderRow(row.id, "enabled", e.target.checked)}
                            className="rounded accent-sky-500 cursor-pointer"
                            title="Include in request"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="e.g. Authorization"
                            value={row.key}
                            onChange={(e) => updateHeaderRow(row.id, "key", e.target.value)}
                            className="w-full rounded-md border vh-border vh-bg-input px-2 py-1 font-mono text-xs vh-text-main outline-none focus:border-sky-500/50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="e.g. Bearer token"
                            value={row.value}
                            onChange={(e) => updateHeaderRow(row.id, "value", e.target.value)}
                            className="w-full rounded-md border vh-border vh-bg-input px-2 py-1 font-mono text-xs vh-text-main outline-none focus:border-sky-500/50"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeHeaderRow(row.id)}
                            className="rounded p-1 vh-text-dim hover:text-red-400 opacity-60 group-hover:opacity-100 transition"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Body Payload Editor */}
        {reqTab === "body" && (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider vh-text-dim">
                  Request Body (JSON)
                </span>
                {jsonFormatError && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1 font-mono">
                    <AlertTriangle size={12} /> {jsonFormatError}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFormatJson}
                  disabled={!bodyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1 text-xs font-semibold text-sky-400 hover:bg-white/5 transition disabled:opacity-40"
                  title="Format JSON indentation"
                >
                  <Sparkles size={12} />
                  <span>Format JSON</span>
                </button>
                <button
                  onClick={() => setBodyText("")}
                  disabled={!bodyText.trim()}
                  className="rounded-lg border vh-border px-2.5 py-1 text-xs vh-text-dim hover:text-white transition disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="relative rounded-xl border vh-border vh-bg-input overflow-hidden">
              <textarea
                value={bodyText}
                onChange={(e) => {
                  setBodyText(e.target.value);
                  setJsonFormatError(null);
                }}
                rows={compact ? 7 : 10}
                placeholder='{\n  "key": "value"\n}'
                className="w-full bg-transparent p-3.5 font-mono text-xs leading-relaxed vh-text-main outline-none focus:ring-0 resize-y"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Auth / Presets Helper */}
        {reqTab === "auth" && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider vh-text-dim">
                Authentication Presets
              </h4>
              <p className="text-[11px] vh-text-dim">
                Quickly attach authorization headers to this request.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border vh-border vh-bg-subtle p-3 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs vh-text-main">
                  <KeyRound size={14} className="text-amber-400" />
                  <span>Bearer Token</span>
                </div>
                <input
                  type="text"
                  placeholder="Paste JWT / Bearer token"
                  className="w-full rounded-lg border vh-border vh-bg-input px-2.5 py-1.5 font-mono text-xs vh-text-main outline-none"
                  onChange={(e) => {
                    const token = e.target.value.trim();
                    if (!token) return;
                    setHeaders((prev) => {
                      const filtered = prev.filter((h) => h.key.toLowerCase() !== "authorization");
                      return [
                        ...filtered,
                        {
                          id: `auth-${Date.now()}`,
                          key: "Authorization",
                          value: `Bearer ${token}`,
                          enabled: true,
                        },
                      ];
                    });
                  }}
                />
              </div>

              <div className="rounded-xl border vh-border vh-bg-subtle p-3 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs vh-text-main">
                  <Hash size={14} className="text-blue-400" />
                  <span>API Key Header</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="X-API-Key"
                    defaultValue="x-api-key"
                    id="custom-key-name"
                    className="w-1/3 rounded-lg border vh-border vh-bg-input px-2 py-1.5 font-mono text-xs vh-text-main outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Key value"
                    className="w-2/3 rounded-lg border vh-border vh-bg-input px-2.5 py-1.5 font-mono text-xs vh-text-main outline-none"
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (!val) return;
                      const headerName =
                        (document.getElementById("custom-key-name") as HTMLInputElement)?.value ||
                        "x-api-key";
                      setHeaders((prev) => {
                        const filtered = prev.filter(
                          (h) => h.key.toLowerCase() !== headerName.toLowerCase(),
                        );
                        return [
                          ...filtered,
                          {
                            id: `apikey-${Date.now()}`,
                            key: headerName,
                            value: val,
                            enabled: true,
                          },
                        ];
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Response Console / Inspector */}
      {response ? (
        <div className="rounded-2xl border vh-border vh-bg-card overflow-hidden shadow-lg animate-in fade-in duration-150">
          {/* Response Console Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-4 py-3 vh-bg-card/80 backdrop-blur-md">
            {/* Status pills */}
            <div className="flex items-center gap-2.5">
              <span
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-black uppercase ${
                  resIsSuccess
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : resIsError
                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {resIsSuccess ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {response.status ? `${response.status} ${response.statusText}` : "Request Error"}
              </span>

              <span className="flex items-center gap-1 rounded-md bg-white/5 border vh-border px-2 py-0.5 text-xs font-mono vh-text-dim">
                <Clock size={11} />
                {Math.round(response.durationMs)} ms
              </span>

              {response.body && (
                <span className="flex items-center gap-1 rounded-md bg-white/5 border vh-border px-2 py-0.5 text-xs font-mono vh-text-dim">
                  <Database size={11} />
                  {(response.body.length / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Response Sub-tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: "body" as const, label: "Body Payload" },
                {
                  id: "headers" as const,
                  label: `Headers (${Object.keys(response.headers).length})`,
                },
                { id: "curl" as const, label: "cURL" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setResTab(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    resTab === tab.id
                      ? "vh-bg-accent vh-text-accent font-bold shadow-xs"
                      : "vh-text-dim hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Response Tab Content */}
          <div className="p-4">
            {resTab === "body" && (
              <div>
                {response.error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                      <ShieldAlert size={16} />
                      Request Execution Failed
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-red-300 select-all">
                      {response.error}
                    </pre>
                  </div>
                ) : response.body ? (
                  <PrettyJson
                    title="Live Response Body"
                    data={response.body}
                    maxHeight={compact ? "320px" : "480px"}
                    allowDownload
                  />
                ) : (
                  <div className="p-8 text-center text-xs vh-text-dim">
                    HTTP {response.status} returned an empty response body.
                  </div>
                )}
              </div>
            )}

            {resTab === "headers" && (
              <div>
                {Object.keys(response.headers).length > 0 ? (
                  <PrettyJson
                    title="Response Headers"
                    data={JSON.stringify(response.headers, null, 2)}
                    maxHeight="320px"
                    allowDownload
                  />
                ) : (
                  <div className="p-8 text-center text-xs vh-text-dim">
                    No response headers captured.
                  </div>
                )}
              </div>
            )}

            {resTab === "curl" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium vh-text-dim">
                    Executed cURL Command
                  </span>
                  <button
                    onClick={copyCurl}
                    className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1 text-xs font-semibold vh-text-accent hover:bg-white/5 transition"
                  >
                    {copiedCurl ? <Check size={12} /> : <Copy size={12} />}
                    {copiedCurl ? "Copied" : "Copy cURL"}
                  </button>
                </div>
                <pre className="rounded-xl border vh-border bg-black/60 p-3.5 font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all leading-relaxed select-all">
                  {liveCurl}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty Response State */
        <div className="rounded-2xl border border-dashed vh-border p-6 text-center text-xs vh-text-dim space-y-1">
          <Terminal size={22} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium vh-text-main">Ready to execute</p>
          <p className="text-[11px]">Hit Send or press <kbd className="font-mono text-[10px] rounded border vh-border px-1">⌘ + Enter</kbd> to inspect live HTTP response.</p>
        </div>
      )}
    </div>
  );
}
