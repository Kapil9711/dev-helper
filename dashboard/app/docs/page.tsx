"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  Boxes,
  Send,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Code2,
  Terminal,
  Activity,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Sparkles,
  FileText,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Folder,
  Zap,
  Play,
  History,
  FileCode,
  ShieldCheck,
  Globe,
  Database,
  Sliders,
  Download,
  CheckCircle2,
  AlertTriangle,
  Code,
  Table,
  Hash,
  ArrowRight,
  Monitor,
} from "lucide-react";

import {
  useNetworkRequestsQuery,
  useNetworkRequestDetailsQuery,
  useAppsQuery,
} from "@/lib/queries";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import type { NetworkRequest, NetworkRequestDetail } from "@/types/network";
import { ApiRequestRunner, methodColor } from "@/components/shared/api-request-runner";
import { PrettyJson } from "@/components/shared/pretty-json";

const METHODS = ["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export interface ObservedParam {
  name: string;
  in: "query" | "path" | "header";
  type: string;
  required: boolean;
  example: string;
  description?: string;
}

export interface ObservedResponse {
  status: number;
  statusText: string;
  responseBody: string | null;
  responseHeaders: Record<string, string>;
  durationMs: number | null;
  count: number;
  lastSeen: number;
  error?: string | null;
}

export interface UniqueRoute {
  key: string; // `${appName}::${method}::${pathname}`
  appName: string;
  method: string;
  pathname: string;
  cleanUrl: string;
  host: string;
  tag: string;
  totalCount: number;
  lastSeen: number;
  latestStatus: number | null;
  observedParams: ObservedParam[];
  observedHeaders: { name: string; example: string }[];
  requestBodySample: string | null;
  responses: Record<number, ObservedResponse>;
  allInstances: NetworkRequestDetail[];
}

function normalizeRouteInfo(urlStr: string): {
  host: string;
  pathname: string;
  tag: string;
  cleanUrl: string;
} {
  try {
    const u = new URL(urlStr, "http://localhost");
    const pathname = u.pathname || "/";
    const segments = pathname.split("/").filter(Boolean);
    const tag = segments.length > 0 ? `/${segments[0]}` : "/root";
    const host = u.host === "localhost" ? "" : u.host;
    const cleanUrl = host ? `${u.protocol}//${host}${pathname}` : pathname;
    return { host, pathname, tag, cleanUrl };
  } catch {
    const cleanPath = urlStr.split("?")[0] || urlStr;
    const segments = cleanPath.split("/").filter(Boolean);
    const tag = segments.length > 0 ? `/${segments[0]}` : "/general";
    return { host: "", pathname: cleanPath, tag, cleanUrl: cleanPath };
  }
}

function generateCodeSnippet(
  lang: "curl" | "javascript" | "python" | "node",
  route: UniqueRoute,
): string {
  const url = route.cleanUrl;
  const method = route.method.toUpperCase();
  const queryStr = route.observedParams.length
    ? "?" +
      route.observedParams
        .slice(0, 5)
        .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.example || "value")}`)
        .join("&")
    : "";
  const fullUrl = url + queryStr;

  if (lang === "curl") {
    let s = `curl -X ${method} "${fullUrl}"`;
    if (route.observedHeaders.length) {
      for (const h of route.observedHeaders.slice(0, 3)) {
        s += ` \\\n  -H "${h.name}: ${h.example}"`;
      }
    }
    if (route.requestBodySample && method !== "GET") {
      s += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${route.requestBodySample.replace(/'/g, "\\'")}'`;
    }
    return s;
  }

  if (lang === "javascript") {
    let s = `const response = await fetch("${fullUrl}", {\n  method: "${method}",\n  headers: {\n    "Content-Type": "application/json"`;
    if (route.observedHeaders.length) {
      for (const h of route.observedHeaders.slice(0, 2)) {
        s += `,\n    "${h.name}": "${h.example}"`;
      }
    }
    s += `\n  }`;
    if (route.requestBodySample && method !== "GET") {
      s += `,\n  body: JSON.stringify(${route.requestBodySample})`;
    }
    s += `\n});\nconst data = await response.json();\nconsole.log(data);`;
    return s;
  }

  if (lang === "python") {
    let s = `import requests\n\nurl = "${fullUrl}"\nheaders = {\n    "Content-Type": "application/json"`;
    if (route.observedHeaders.length) {
      for (const h of route.observedHeaders.slice(0, 2)) {
        s += `,\n    "${h.name}": "${h.example}"`;
      }
    }
    s += `\n}\n`;
    if (route.requestBodySample && method !== "GET") {
      s += `payload = ${route.requestBodySample}\nresponse = requests.${method.toLowerCase()}(url, json=payload, headers=headers)\n`;
    } else {
      s += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }
    s += `print(response.status_code, response.json())`;
    return s;
  }

  if (lang === "node") {
    let s = `const axios = require('axios');\n\nconst config = {\n  method: '${method.toLowerCase()}',\n  url: '${fullUrl}',\n  headers: {\n    'Content-Type': 'application/json'`;
    if (route.observedHeaders.length) {
      for (const h of route.observedHeaders.slice(0, 2)) {
        s += `,\n    '${h.name}': '${h.example}'`;
      }
    }
    s += `\n  }`;
    if (route.requestBodySample && method !== "GET") {
      s += `,\n  data: ${route.requestBodySample}`;
    }
    s += `\n};\n\naxios(config)\n  .then(response => console.log(response.data))\n  .catch(error => console.error(error));`;
    return s;
  }

  return "";
}

function DocsContent() {
  const searchParams = useSearchParams();
  const urlApp = searchParams.get("app");

  const { preferences, updatePreferences } = useDashboardPreferences();

  useEffect(() => {
    if (urlApp && urlApp !== preferences.selectedProject) {
      updatePreferences({ selectedProject: urlApp });
    }
  }, [urlApp, preferences.selectedProject, updatePreferences]);

  const activeApp =
    preferences.selectedProject !== "ALL" ? preferences.selectedProject : undefined;

  const requestsQuery = useNetworkRequestsQuery(preferences.networkLimit, activeApp);
  const detailsQuery = useNetworkRequestDetailsQuery(preferences.networkLimit, activeApp);
  const appsQuery = useAppsQuery();
  const allApps = appsQuery.data?.data ?? [];

  const rawRequests = requestsQuery.data?.data ?? [];
  const rawDetails = detailsQuery.data?.data ?? [];

  const [search, setSearch] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");
  const [selectedRouteKey, setSelectedRouteKey] = useState<string | null>(null);
  const [activeStudioTab, setActiveStudioTab] = useState<"reference" | "playground" | "history">("reference");
  const [selectedSnippetLang, setSelectedSnippetLang] = useState<"curl" | "javascript" | "python" | "node">("curl");
  const [selectedResponseStatus, setSelectedResponseStatus] = useState<number | null>(null);
  const [copiedDocs, setCopiedDocs] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [collapsedTags, setCollapsedTags] = useState<Record<string, boolean>>({});

  // 1. Group & Aggregate into 100% Unique Routes
  const uniqueRoutes = useMemo(() => {
    const map = new Map<string, UniqueRoute>();

    // Process rawDetails first (contains headers, query parameters, payloads, responses)
    for (const detail of rawDetails) {
      const { host, pathname, tag, cleanUrl } = normalizeRouteInfo(detail.url);
      const method = (detail.method || "GET").toUpperCase();
      const key = `${detail.app_name}::${method}::${pathname}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          appName: detail.app_name,
          method,
          pathname,
          cleanUrl,
          host,
          tag,
          totalCount: 0,
          lastSeen: detail.started_at,
          latestStatus: detail.status,
          observedParams: [],
          observedHeaders: [],
          requestBodySample: null,
          responses: {},
          allInstances: [],
        });
      }

      const route = map.get(key)!;
      route.totalCount += 1;
      route.allInstances.push(detail);

      if (detail.started_at > route.lastSeen) {
        route.lastSeen = detail.started_at;
        route.latestStatus = detail.status;
      }

      // Merge URL Query Parameters
      try {
        const u = new URL(detail.url, "http://localhost");
        u.searchParams.forEach((val, pKey) => {
          if (!route.observedParams.some((p) => p.name === pKey)) {
            route.observedParams.push({
              name: pKey,
              in: "query",
              type: isNaN(Number(val))
                ? val === "true" || val === "false"
                  ? "boolean"
                  : "string"
                : "number",
              required: false,
              example: val,
            });
          }
        });
      } catch {}

      // Merge params_json
      if (detail.params_json) {
        try {
          const parsed = JSON.parse(detail.params_json);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            for (const [pKey, pVal] of Object.entries(parsed)) {
              if (!route.observedParams.some((p) => p.name === pKey)) {
                route.observedParams.push({
                  name: pKey,
                  in: "query",
                  type: typeof pVal,
                  required: false,
                  example: typeof pVal === "object" ? JSON.stringify(pVal) : String(pVal),
                });
              }
            }
          }
        } catch {}
      }

      // Merge Request Headers
      if (detail.request_headers_json) {
        try {
          const parsed = JSON.parse(detail.request_headers_json);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            for (const [hKey, hVal] of Object.entries(parsed)) {
              if (!route.observedHeaders.some((h) => h.name.toLowerCase() === hKey.toLowerCase())) {
                route.observedHeaders.push({
                  name: hKey,
                  example: String(hVal),
                });
              }
            }
          }
        } catch {}
      }

      // Merge Sample Request Body
      if (detail.request_body_json && !route.requestBodySample) {
        route.requestBodySample = detail.request_body_json;
      }

      // Group Responses by Status Code (Scalar style)
      if (detail.status) {
        const s = detail.status;
        if (!route.responses[s]) {
          let headersObj: Record<string, string> = {};
          if (detail.response_headers_json) {
            try {
              headersObj = JSON.parse(detail.response_headers_json);
            } catch {}
          }
          route.responses[s] = {
            status: s,
            statusText:
              detail.status_text ||
              (s < 300 ? "OK / Success" : s < 500 ? "Client Error" : "Server Error"),
            responseBody: detail.response_body_json,
            responseHeaders: headersObj,
            durationMs: detail.duration_ms,
            count: 1,
            lastSeen: detail.completed_at || detail.started_at,
            error: detail.error,
          };
        } else {
          route.responses[s].count += 1;
          if (detail.response_body_json && !route.responses[s].responseBody) {
            route.responses[s].responseBody = detail.response_body_json;
          }
        }
      }
    }

    // Also ingest rawRequests so any unique route from requests table is counted
    for (const req of rawRequests) {
      const { host, pathname, tag, cleanUrl } = normalizeRouteInfo(req.url);
      const method = (req.method || "GET").toUpperCase();
      const key = `${req.app_name}::${method}::${pathname}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          appName: req.app_name,
          method,
          pathname,
          cleanUrl,
          host,
          tag,
          totalCount: req.count,
          lastSeen: req.last_seen,
          latestStatus: req.status,
          observedParams: [],
          observedHeaders: [],
          requestBodySample: null,
          responses: req.status
            ? {
                [req.status]: {
                  status: req.status,
                  statusText: req.status < 400 ? "Success" : "Error",
                  responseBody: null,
                  responseHeaders: {},
                  durationMs: req.duration_ms,
                  count: req.count,
                  lastSeen: req.last_seen,
                  error: req.error,
                },
              }
            : {},
          allInstances: [],
        });
      } else {
        const r = map.get(key)!;
        r.totalCount = Math.max(r.totalCount, req.count);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [rawDetails, rawRequests]);

  // 2. Filter unique routes by search & selected method
  const filteredUniqueRoutes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return uniqueRoutes.filter((route) => {
      const matchesSearch =
        !term ||
        route.pathname.toLowerCase().includes(term) ||
        route.cleanUrl.toLowerCase().includes(term) ||
        route.method.toLowerCase().includes(term) ||
        route.appName.toLowerCase().includes(term);

      const matchesMethod =
        selectedMethod === "ALL" || route.method === selectedMethod;

      return matchesSearch && matchesMethod;
    });
  }, [uniqueRoutes, search, selectedMethod]);

  // 3. Group filtered unique routes by Tag / Folder
  const groupedUniqueRoutes = useMemo(() => {
    const groups: Record<string, UniqueRoute[]> = {};
    for (const r of filteredUniqueRoutes) {
      if (!groups[r.tag]) {
        groups[r.tag] = [];
      }
      groups[r.tag].push(r);
    }
    return groups;
  }, [filteredUniqueRoutes]);

  // 4. Currently Selected Unique Route
  const selectedRoute = useMemo<UniqueRoute | null>(() => {
    if (selectedRouteKey) {
      const found = uniqueRoutes.find((r) => r.key === selectedRouteKey);
      if (found) return found;
    }
    return filteredUniqueRoutes[0] ?? uniqueRoutes[0] ?? null;
  }, [selectedRouteKey, uniqueRoutes, filteredUniqueRoutes]);

  // Keep response status in sync when selected route changes
  useEffect(() => {
    if (selectedRoute) {
      const statuses = Object.keys(selectedRoute.responses).map(Number);
      if (statuses.length > 0) {
        const okStatus = statuses.find((s) => s >= 200 && s < 300);
        setSelectedResponseStatus(okStatus ?? statuses[0]);
      } else {
        setSelectedResponseStatus(null);
      }
    }
  }, [selectedRoute?.key]);

  const toggleTagCollapse = (tag: string) => {
    setCollapsedTags((prev) => ({
      ...prev,
      [tag]: !prev[tag],
    }));
  };

  const copyMarkdownDocs = () => {
    if (!selectedRoute) return;
    let md = `# API Documentation: ${selectedRoute.method} ${selectedRoute.pathname}\n\n`;
    md += `* **Endpoint:** \`${selectedRoute.cleanUrl}\`\n`;
    md += `* **Service:** \`${selectedRoute.appName}\`\n`;
    md += `* **Total Invocations:** \`${selectedRoute.totalCount}\`\n\n`;

    if (selectedRoute.observedParams.length) {
      md += `### Parameters\n\n| Parameter | In | Type | Example |\n|---|---|---|---|\n`;
      for (const p of selectedRoute.observedParams) {
        md += `| \`${p.name}\` | \`${p.in}\` | \`${p.type}\` | \`${p.example || ""}\` |\n`;
      }
      md += `\n`;
    }

    if (selectedRoute.requestBodySample) {
      md += `### Request Body (application/json)\n\`\`\`json\n${selectedRoute.requestBodySample}\n\`\`\`\n\n`;
    }

    if (Object.keys(selectedRoute.responses).length > 0) {
      md += `### Observed Responses\n\n`;
      for (const [code, resp] of Object.entries(selectedRoute.responses)) {
        md += `#### HTTP ${code} (${resp.statusText})\n`;
        if (resp.responseBody) {
          md += `\`\`\`json\n${resp.responseBody}\n\`\`\`\n\n`;
        }
      }
    }

    navigator.clipboard.writeText(md);
    setCopiedDocs(true);
    playTone("success");
    setTimeout(() => setCopiedDocs(false), 2000);
  };

  const copyCodeSnippet = () => {
    if (!selectedRoute) return;
    const snippet = generateCodeSnippet(selectedSnippetLang, selectedRoute);
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    playTone("success");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const exportOpenApiJson = () => {
    const pathsObj: Record<string, any> = {};

    for (const r of uniqueRoutes) {
      if (!pathsObj[r.pathname]) {
        pathsObj[r.pathname] = {};
      }
      const m = r.method.toLowerCase();
      pathsObj[r.pathname][m] = {
        summary: `${r.method} ${r.pathname}`,
        tags: [r.tag.replace(/^\//, "") || "general"],
        operationId: `${m}_${r.pathname.replace(/[^a-zA-Z0-9]/g, "_")}`,
        parameters: r.observedParams.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          schema: { type: p.type },
          example: p.example,
        })),
        ...(r.requestBodySample && m !== "get"
          ? {
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { type: "object" },
                    example: (() => {
                      try {
                        return JSON.parse(r.requestBodySample!);
                      } catch {
                        return r.requestBodySample;
                      }
                    })(),
                  },
                },
              },
            }
          : {}),
        responses: Object.keys(r.responses).length
          ? Object.fromEntries(
              Object.entries(r.responses).map(([code, resp]) => [
                code,
                {
                  description: resp.statusText,
                  content: resp.responseBody
                    ? {
                        "application/json": {
                          example: (() => {
                            try {
                              return JSON.parse(resp.responseBody!);
                            } catch {
                              return resp.responseBody;
                            }
                          })(),
                        },
                      }
                    : undefined,
                },
              ]),
            )
          : { "200": { description: "Successful response" } },
      };
    }

    const openApiSpec = {
      openapi: "3.0.3",
      info: {
        title: `${activeApp || "VH Project"} API Reference`,
        version: "1.0.0",
        description:
          "OpenAPI specification automatically synthesized from real application network telemetry.",
      },
      servers: [
        {
          url: selectedRoute?.host ? `https://${selectedRoute.host}` : "http://localhost",
          description: "Target API Host",
        },
      ],
      paths: pathsObj,
    };

    const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeApp || "api-specification").toLowerCase()}-openapi.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playTone("click");
  };

  const isRefreshing = requestsQuery.isFetching || detailsQuery.isFetching;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden vh-bg-app vh-text-main font-sans">
      {/* 1. Swagger / Scalar Top Header Toolbar */}
      <header className="h-14 border-b vh-border vh-bg-card/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 shrink-0 z-10">
        {/* Left: App Title & Scope Dropdown */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <BookOpen size={16} />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight vh-text-main whitespace-nowrap">
                  API Reference
                </span>
                <span className="rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase">
                  OAS 3.0
                </span>
              </div>
            </div>

            {/* Project Scope Picker */}
            <div className="relative ml-1">
              <select
                value={preferences.selectedProject}
                onChange={(e) => updatePreferences({ selectedProject: e.target.value })}
                className="rounded-lg border vh-border vh-bg-input px-2.5 py-1 text-xs font-semibold vh-text-accent outline-none cursor-pointer pr-6 hover:bg-white/5 transition"
              >
                <option value="ALL">All Services ({allApps.length})</option>
                {allApps.map((app) => (
                  <option key={app.app_name} value={app.app_name}>
                    {app.app_name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-2 text-[9px] opacity-70">
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search & Filter bar */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border vh-border vh-bg-input px-3 py-1.5 focus-within:border-sky-500/50 transition">
            <Search size={13} className="vh-text-dim shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter unique routes, paths, methods (e.g. /account, POST)..."
              className="w-full bg-transparent text-xs font-mono vh-text-main outline-none placeholder:text-gray-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs vh-text-dim hover:vh-text-main"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Method Filter Pills */}
          <div className="flex items-center gap-1 shrink-0">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`rounded-lg px-2 py-1 text-[10px] font-mono font-bold tracking-wider transition ${
                  selectedMethod === m
                    ? "bg-sky-500 text-white shadow-xs"
                    : "vh-bg-subtle vh-text-dim hover:vh-text-main"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Unique Count & OpenAPI Export */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1 text-xs font-mono vh-text-dim font-bold">
            <Zap size={12} className="text-emerald-400" />
            {filteredUniqueRoutes.length} Unique Routes
          </span>

          <button
            onClick={exportOpenApiJson}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-2.5 py-1.5 text-xs font-semibold vh-text-muted hover:vh-text-main hover:bg-white/5 transition"
            title="Download OpenAPI 3.0 JSON Specification"
          >
            <Download size={13} />
            <span className="hidden sm:inline">OpenAPI JSON</span>
          </button>

          <button
            onClick={() => {
              void Promise.all([requestsQuery.refetch(), detailsQuery.refetch()]);
              playTone("click");
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border vh-border px-2.5 py-1.5 text-xs font-medium vh-text-muted hover:bg-white/5 hover:vh-text-main transition disabled:opacity-50"
            title="Reload telemetry endpoints"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </header>

      {uniqueRoutes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-4 rounded-3xl border vh-border vh-bg-card p-10 shadow-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl vh-bg-accent vh-text-accent mx-auto border vh-border-accent">
              <BookOpen size={30} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold vh-text-main">No Network Endpoints Captured</h2>
              <p className="text-xs vh-text-dim leading-relaxed">
                Start your application with VH DevTools logging enabled. Any HTTP request made by your services will automatically be cataloged into unique routes, parameter schemas, and Swagger/Scalar documentation here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Full-Height Split-Pane Workspace */
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Scalar / Swagger Unique Routes Explorer (Width: 340px) */}
          <aside className="w-80 lg:w-96 border-r vh-border vh-bg-sidebar/40 flex flex-col overflow-hidden shrink-0">
            {/* Explorer Header */}
            <div className="h-10 border-b vh-border px-3.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider vh-text-dim shrink-0 vh-bg-card/40">
              <span className="flex items-center gap-1.5">
                <FolderOpen size={13} className="vh-text-accent" />
                Unique API Endpoints
              </span>
              <span className="font-mono text-[10px] rounded bg-white/5 border vh-border px-1.5 py-0.2 font-bold">
                {filteredUniqueRoutes.length}
              </span>
            </div>

            {/* Tree Scroll Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Object.keys(groupedUniqueRoutes).length === 0 ? (
                <div className="p-8 text-center text-xs vh-text-dim">
                  No matching unique endpoints found.
                </div>
              ) : (
                Object.entries(groupedUniqueRoutes).map(([tag, routes]) => {
                  const isCollapsed = Boolean(collapsedTags[tag]);

                  return (
                    <div
                      key={tag}
                      className="rounded-xl border vh-border/70 vh-bg-card/50 overflow-hidden shadow-xs"
                    >
                      {/* Tag Folder Header */}
                      <button
                        onClick={() => toggleTagCollapse(tag)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isCollapsed ? (
                            <ChevronRight size={13} className="vh-text-dim shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="vh-text-dim shrink-0" />
                          )}
                          <Folder size={13} className="text-sky-400 shrink-0" />
                          <span className="font-mono font-bold text-xs vh-text-main truncate">
                            {tag}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 shrink-0 ml-2 font-bold">
                          {routes.length}
                        </span>
                      </button>

                      {/* Unique Routes Inside Tag */}
                      {!isCollapsed && (
                        <div className="divide-y vh-border-subtle border-t vh-border/60">
                          {routes.map((route) => {
                            const isSelected = selectedRoute?.key === route.key;

                            return (
                              <button
                                key={route.key}
                                onClick={() => {
                                  setSelectedRouteKey(route.key);
                                  playTone("click");
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition group ${
                                  isSelected
                                    ? "vh-bg-accent vh-text-accent font-semibold border-l-3 border-l-sky-500 shadow-inner"
                                    : "hover:bg-white/[0.04] vh-text-main"
                                }`}
                              >
                                {/* Swagger Method Badge */}
                                <span
                                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider shrink-0 ${methodColor(
                                    route.method,
                                  )}`}
                                >
                                  {route.method}
                                </span>

                                {/* Path & App */}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-mono text-xs leading-none">
                                    {route.pathname}
                                  </p>
                                  {route.host && (
                                    <p className="mt-1 truncate text-[10px] vh-text-dim font-mono">
                                      {route.host}
                                    </p>
                                  )}
                                </div>

                                {/* Total Count & Status indicator */}
                                <div className="flex items-center gap-1.5 shrink-0 text-right">
                                  {route.latestStatus ? (
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                        route.latestStatus < 400
                                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                          : "text-red-400 bg-red-500/10 border border-red-500/20"
                                      }`}
                                    >
                                      {route.latestStatus}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[10px] vh-text-dim">
                                      ×{route.totalCount}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT PANE: Swagger & Scalar Reference Workbench */}
          <main className="flex-1 flex flex-col overflow-hidden vh-bg-app">
            {selectedRoute ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 1. Swagger / Scalar Route Banner */}
                <div className="border-b vh-border p-4 lg:px-6 lg:py-4 vh-bg-card/70 shrink-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`rounded-xl border px-3 py-1 font-mono text-xs font-black uppercase tracking-wider shadow-sm ${methodColor(
                          selectedRoute.method,
                        )}`}
                      >
                        {selectedRoute.method}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2
                            className="font-mono text-sm sm:text-base font-bold vh-text-main truncate"
                            title={selectedRoute.cleanUrl}
                          >
                            {selectedRoute.pathname}
                          </h2>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono vh-text-muted font-bold">
                            ×{selectedRoute.totalCount} calls
                          </span>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] vh-text-dim font-mono">
                          {selectedRoute.host && (
                            <span className="flex items-center gap-1">
                              <Globe size={11} /> {selectedRoute.host}
                            </span>
                          )}
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Boxes size={11} className="vh-text-accent" />
                            {selectedRoute.appName}
                          </span>
                          <span>·</span>
                          <span>Tag: <strong>{selectedRoute.tag}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Swagger Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Try it out button */}
                      <button
                        onClick={() => {
                          setActiveStudioTab("playground");
                          playTone("click");
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-sky-400 hover:to-blue-500 transition cursor-pointer"
                        title="Open interactive API runner"
                      >
                        <Play size={13} />
                        <span>Try It Out</span>
                      </button>

                      <button
                        onClick={copyMarkdownDocs}
                        className="flex items-center gap-1.5 rounded-xl border vh-border px-3 py-2 text-xs font-semibold vh-text-muted hover:vh-text-main hover:bg-white/5 transition"
                        title="Copy Markdown Documentation"
                      >
                        {copiedDocs ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <FileText size={13} />
                        )}
                        <span className="hidden sm:inline">
                          {copiedDocs ? "Copied" : "Copy Docs MD"}
                        </span>
                      </button>

                      {selectedRoute.cleanUrl.startsWith("http") && (
                        <a
                          href={selectedRoute.cleanUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border vh-border p-2 text-xs vh-text-dim hover:vh-text-main hover:bg-white/5 transition"
                          title="Open endpoint URL in browser"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Mode Navigation Tabs */}
                  <div className="flex items-center gap-2 pt-1 border-t vh-border/50">
                    {[
                      {
                        id: "reference" as const,
                        label: "Swagger / Scalar Reference",
                        icon: BookOpen,
                      },
                      {
                        id: "playground" as const,
                        label: "Test Runner / Client",
                        icon: Play,
                      },
                      {
                        id: "history" as const,
                        label: `Telemetry History (${selectedRoute.allInstances.length})`,
                        icon: History,
                      },
                    ].map((tab) => {
                      const isCurrent = activeStudioTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveStudioTab(tab.id)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            isCurrent
                              ? "vh-bg-accent vh-text-accent border vh-border-accent shadow-xs"
                              : "vh-text-dim hover:vh-text-main hover:bg-white/5"
                          }`}
                        >
                          <tab.icon size={13} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {/* TAB 1: Swagger / Scalar API Reference */}
                  {activeStudioTab === "reference" && (
                    <div className="space-y-6 max-w-5xl">
                      {/* Scalar Multi-Language Code Snippet Card */}
                      <div className="rounded-2xl border vh-border vh-bg-card overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between border-b vh-border px-4 py-2.5 vh-bg-subtle text-xs">
                          <div className="flex items-center gap-1.5">
                            <Code size={14} className="vh-text-accent" />
                            <span className="font-bold vh-text-main">Code Examples</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Language selector */}
                            <div className="flex items-center rounded-lg border vh-border bg-black/20 p-0.5 text-xs">
                              {(
                                [
                                  { id: "curl", label: "cURL" },
                                  { id: "javascript", label: "JavaScript" },
                                  { id: "python", label: "Python" },
                                  { id: "node", label: "Node.js" },
                                ] as const
                              ).map((lang) => (
                                <button
                                  key={lang.id}
                                  onClick={() => setSelectedSnippetLang(lang.id)}
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-medium transition ${
                                    selectedSnippetLang === lang.id
                                      ? "vh-bg-accent vh-text-accent font-bold"
                                      : "vh-text-dim hover:vh-text-main"
                                  }`}
                                >
                                  {lang.label}
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={copyCodeSnippet}
                              className="flex items-center gap-1 rounded-lg border vh-border px-2 py-1 text-[11px] font-medium vh-text-main hover:bg-white/5 transition"
                            >
                              {copiedSnippet ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>{copiedSnippet ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-black/40 font-mono text-xs leading-relaxed overflow-x-auto text-emerald-400 select-all">
                          <pre>{generateCodeSnippet(selectedSnippetLang, selectedRoute)}</pre>
                        </div>
                      </div>

                      {/* Swagger Parameters Table */}
                      <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold vh-text-main flex items-center gap-2">
                            <Table size={16} className="vh-text-accent" />
                            Parameters ({selectedRoute.observedParams.length})
                          </h3>
                          <span className="text-xs font-mono vh-text-dim">
                            Discovered query & path params
                          </span>
                        </div>

                        {selectedRoute.observedParams.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border vh-border">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="border-b vh-border vh-bg-subtle text-[11px] uppercase tracking-wider vh-text-dim">
                                <tr>
                                  <th className="py-2.5 px-4 font-bold">Parameter</th>
                                  <th className="py-2.5 px-4 font-bold">In</th>
                                  <th className="py-2.5 px-4 font-bold">Type</th>
                                  <th className="py-2.5 px-4 font-bold">Required</th>
                                  <th className="py-2.5 px-4 font-bold">Observed Example</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y vh-border-subtle vh-bg-card">
                                {selectedRoute.observedParams.map((param) => (
                                  <tr key={param.name} className="hover:bg-white/[0.02] transition">
                                    <td className="py-2.5 px-4 font-bold text-sky-400">
                                      {param.name}
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <span className="rounded bg-white/5 border vh-border px-1.5 py-0.5 text-[10px] text-zinc-400">
                                        {param.in}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-amber-400 font-semibold">
                                      {param.type}
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                          param.required
                                            ? "text-red-400 bg-red-500/10"
                                            : "vh-text-dim bg-white/5"
                                        }`}
                                      >
                                        {param.required ? "required" : "optional"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 vh-text-main select-all break-all">
                                      {param.example || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-xl border vh-border vh-bg-input p-4 text-xs vh-text-dim text-center">
                            No query parameters captured in recorded traffic for this endpoint.
                          </div>
                        )}

                        {/* Request Headers Table */}
                        {selectedRoute.observedHeaders.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider vh-text-dim">
                              Observed Request Headers ({selectedRoute.observedHeaders.length})
                            </h4>
                            <div className="overflow-x-auto rounded-xl border vh-border">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="border-b vh-border vh-bg-subtle text-[11px] uppercase tracking-wider vh-text-dim">
                                  <tr>
                                    <th className="py-2 px-4 font-bold">Header Name</th>
                                    <th className="py-2 px-4 font-bold">Observed Example Value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y vh-border-subtle vh-bg-card">
                                  {selectedRoute.observedHeaders.map((h) => (
                                    <tr key={h.name} className="hover:bg-white/[0.02]">
                                      <td className="py-2 px-4 font-bold text-violet-400">
                                        {h.name}
                                      </td>
                                      <td className="py-2 px-4 vh-text-main select-all break-all">
                                        {h.example}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request Body Payload (when applicable) */}
                      {selectedRoute.requestBodySample && (
                        <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold vh-text-main flex items-center gap-2">
                              <FileCode size={16} className="vh-text-accent" />
                              Request Body Payload
                            </h3>
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono vh-text-muted font-bold">
                              application/json
                            </span>
                          </div>

                          <PrettyJson
                            title="Sample Request Body"
                            data={selectedRoute.requestBodySample}
                            maxHeight="320px"
                            allowDownload
                          />
                        </div>
                      )}

                      {/* Swagger / Scalar Responses Section */}
                      <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold vh-text-main flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            Responses ({Object.keys(selectedRoute.responses).length} status codes observed)
                          </h3>
                          <span className="text-xs font-mono vh-text-dim">
                            Click status code to inspect sample payload
                          </span>
                        </div>

                        {/* Status Code Tabs */}
                        <div className="flex flex-wrap items-center gap-2 border-b vh-border pb-3">
                          {Object.values(selectedRoute.responses).map((resp) => {
                            const isSelected = selectedResponseStatus === resp.status;
                            const isSuccess = resp.status >= 200 && resp.status < 300;
                            const isClientError = resp.status >= 400 && resp.status < 500;

                            return (
                              <button
                                key={resp.status}
                                onClick={() => setSelectedResponseStatus(resp.status)}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition ${
                                  isSelected
                                    ? isSuccess
                                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm"
                                      : isClientError
                                        ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm"
                                        : "border-red-500 bg-red-500/20 text-red-300 shadow-sm"
                                    : "vh-border vh-bg-subtle vh-text-dim hover:vh-text-main"
                                }`}
                              >
                                <span>{resp.status}</span>
                                <span className="font-sans font-normal opacity-80">
                                  {resp.statusText}
                                </span>
                                <span className="text-[10px] opacity-60">×{resp.count}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Active Response Body & Details */}
                        {selectedResponseStatus && selectedRoute.responses[selectedResponseStatus] ? (
                          (() => {
                            const activeResp = selectedRoute.responses[selectedResponseStatus];
                            return (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold vh-text-main">
                                      HTTP {activeResp.status} {activeResp.statusText}
                                    </span>
                                    {activeResp.durationMs !== null && (
                                      <span className="flex items-center gap-1 rounded bg-white/5 border vh-border px-2 py-0.5 text-[11px] font-mono vh-text-dim">
                                        <Clock size={11} /> {activeResp.durationMs}ms
                                      </span>
                                    )}
                                  </div>
                                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium vh-text-muted">
                                    application/json
                                  </span>
                                </div>

                                {activeResp.error && (
                                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                                    <span className="font-bold">Error Details: </span>
                                    {activeResp.error}
                                  </div>
                                )}

                                {activeResp.responseBody ? (
                                  <PrettyJson
                                    title={`Response Payload (${activeResp.status} ${activeResp.statusText})`}
                                    data={activeResp.responseBody}
                                    maxHeight="380px"
                                    allowDownload
                                  />
                                ) : (
                                  <div className="rounded-xl border vh-border vh-bg-input p-4 text-xs vh-text-dim text-center font-mono">
                                    No response body content recorded for HTTP {activeResp.status}.
                                  </div>
                                )}

                                {/* Response Headers */}
                                {Object.keys(activeResp.responseHeaders).length > 0 && (
                                  <div className="pt-2 space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider vh-text-dim">
                                      Response Headers
                                    </h5>
                                    <PrettyJson
                                      title="Response Headers"
                                      data={JSON.stringify(activeResp.responseHeaders, null, 2)}
                                      maxHeight="220px"
                                      allowDownload={false}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="rounded-xl border vh-border vh-bg-input p-4 text-xs vh-text-dim text-center">
                            No response body captured yet for this route. Click "Try It Out" to send a live request.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Interactive API Client / Runner */}
                  {activeStudioTab === "playground" && (
                    <ApiRequestRunner
                      initialMethod={selectedRoute.method}
                      initialUrl={selectedRoute.cleanUrl}
                      initialParamsJson={
                        selectedRoute.observedParams.length
                          ? JSON.stringify(
                              Object.fromEntries(
                                selectedRoute.observedParams.map((p) => [
                                  p.name,
                                  p.example || "",
                                ]),
                              ),
                              null,
                              2,
                            )
                          : null
                      }
                      initialHeadersJson={
                        selectedRoute.observedHeaders.length
                          ? JSON.stringify(
                              Object.fromEntries(
                                selectedRoute.observedHeaders.map((h) => [
                                  h.name,
                                  h.example || "",
                                ]),
                              ),
                              null,
                              2,
                            )
                          : null
                      }
                      initialBodyJson={selectedRoute.requestBodySample}
                      appName={selectedRoute.appName}
                    />
                  )}

                  {/* TAB 3: Telemetry History */}
                  {activeStudioTab === "history" && (
                    <div className="space-y-3 max-w-5xl">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold vh-text-main">
                          Recorded Invocations ({selectedRoute.allInstances.length})
                        </h3>
                        <span className="text-xs vh-text-dim font-mono">
                          Chronological telemetry logs
                        </span>
                      </div>

                      {selectedRoute.allInstances.length > 0 ? (
                        <div className="rounded-xl border vh-border overflow-hidden divide-y vh-border-subtle font-mono text-xs">
                          {selectedRoute.allInstances.map((instance, idx) => (
                            <div
                              key={instance.id || idx}
                              className="p-3.5 vh-bg-card flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.02]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    (instance.status ?? 0) < 400
                                      ? "text-emerald-400 bg-emerald-500/15"
                                      : "text-red-400 bg-red-500/15"
                                  }`}
                                >
                                  {instance.status ?? "ERR"}
                                </span>
                                <span className="vh-text-main truncate max-w-md">
                                  {instance.url}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-right text-xs vh-text-dim">
                                {instance.duration_ms !== null && (
                                  <span>{instance.duration_ms}ms</span>
                                )}
                                <span>{new Date(instance.started_at).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border vh-border vh-bg-input p-6 text-center text-xs vh-text-dim">
                          No historical instances stored in details cache for this unique route.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center vh-text-dim">
                Select an endpoint from the left navigation tree to view documentation.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center vh-bg-app vh-text-dim font-mono text-xs">
          Loading API Reference & Documentation...
        </div>
      }
    >
      <DocsContent />
    </Suspense>
  );
}
