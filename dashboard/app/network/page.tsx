"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, RefreshCw, Network, Boxes, X, Filter, ChevronDown, Globe } from "lucide-react";
import { RequestTable } from "@/components/network/request-table";
import { RequestDetails } from "@/components/network/request-details";
import { ChromeWindowModal } from "@/components/logs/chrome-window-modal";
import {
  useNetworkRequestsQuery,
  useNetworkRequestDetailsQuery,
  useAppsQuery,
} from "@/lib/queries";
import { useDashboardPreferences } from "@/lib/prefrences";
import type { NetworkRequest, NetworkRequestDetail } from "@/types/network";

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value, "http://dummy.local");
    url.hash = "";
    if (!value.startsWith("http://") && !value.startsWith("https://")) {
      return url.pathname + url.search;
    }
    return url.origin + url.pathname + url.search;
  } catch {
    return value.trim();
  }
}

function getUrlPath(value: string): string {
  try {
    const url = new URL(value, "http://dummy.local");
    return url.pathname;
  } catch {
    return value.trim();
  }
}

function NetworkContent() {
  const searchParams = useSearchParams();
  const urlApp = searchParams.get("app");

  const { preferences, updatePreferences } = useDashboardPreferences();

  useEffect(() => {
    if (urlApp && urlApp !== preferences.selectedProject) {
      updatePreferences({ selectedProject: urlApp });
    }
  }, [urlApp, preferences.selectedProject, updatePreferences]);

  const activeApp = preferences.selectedProject !== "ALL" ? preferences.selectedProject : undefined;

  const query = useNetworkRequestsQuery(preferences.networkLimit, activeApp);
  const detailsQuery = useNetworkRequestDetailsQuery(preferences.networkLimit, activeApp);
  const appsQuery = useAppsQuery();
  const allApps = appsQuery.data?.data ?? [];

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [isChromeWindowOpen, setIsChromeWindowOpen] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<{
    id: number;
    fingerprint?: string;
    appName: string;
    method: string;
    url: string;
    status?: number | null;
    error?: string | null;
  } | null>(null);

  const rawRequests = query.data?.data ?? [];

  const selected = useMemo<NetworkRequest | null>(() => {
    if (!selectedIdentity) return null;

    const found = rawRequests.find(
      (r) =>
        (selectedIdentity.fingerprint && r.fingerprint === selectedIdentity.fingerprint) ||
        r.id === selectedIdentity.id ||
        (r.app_name === selectedIdentity.appName &&
         r.method.toUpperCase() === selectedIdentity.method.toUpperCase() &&
         (normalizeUrl(r.url) === normalizeUrl(selectedIdentity.url) ||
          getUrlPath(r.url) === getUrlPath(selectedIdentity.url)))
    );

    if (found) {
      if (selectedIdentity.error !== undefined || selectedIdentity.status !== undefined) {
        return {
          ...found,
          status: selectedIdentity.status !== undefined ? selectedIdentity.status : found.status,
          error: selectedIdentity.error !== undefined ? selectedIdentity.error : found.error,
        };
      }
      return found;
    }

    return {
      id: selectedIdentity.id,
      fingerprint: selectedIdentity.fingerprint ?? "",
      app_name: selectedIdentity.appName,
      method: selectedIdentity.method,
      url: selectedIdentity.url,
      status: selectedIdentity.status ?? null,
      duration_ms: null,
      error: selectedIdentity.error ?? null,
      count: 1,
      first_seen: Date.now(),
      last_seen: Date.now(),
    };
  }, [selectedIdentity, rawRequests]);

  const requests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rawRequests.filter((request) => {
      const matchesSearch =
        !term ||
        request.url.toLowerCase().includes(term) ||
        request.app_name.toLowerCase().includes(term) ||
        request.method.toLowerCase().includes(term);

      const matchesMethod =
        method === "ALL" || request.method.toUpperCase() === method;

      let matchesStatus = status === "ALL";

      if (status === "SUCCESS") {
        matchesStatus =
          request.status !== null &&
          request.status >= 200 &&
          request.status < 400 &&
          !request.error;
      } else if (status === "CLIENT_ERROR") {
        matchesStatus =
          request.status !== null &&
          request.status >= 400 &&
          request.status < 500;
      } else if (status === "SERVER_ERROR") {
        matchesStatus = request.status !== null && request.status >= 500;
      } else if (status === "ERROR") {
        matchesStatus = request.status === null || request.error !== null;
      }

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [rawRequests, search, method, status]);

  const matchingDetails = useMemo<NetworkRequestDetail[]>(() => {
    if (!selected) return [];

    const exactMatches = (detailsQuery.data?.data ?? []).filter(
      (detail) =>
        detail.app_name === selected.app_name &&
        detail.method.toUpperCase() === selected.method.toUpperCase() &&
        normalizeUrl(detail.url) === normalizeUrl(selected.url),
    );

    const matches =
      exactMatches.length > 0
        ? exactMatches
        : (detailsQuery.data?.data ?? []).filter(
            (detail) =>
              detail.app_name === selected.app_name &&
              detail.method.toUpperCase() === selected.method.toUpperCase() &&
              getUrlPath(detail.url) === getUrlPath(selected.url),
          );

    return matches.sort(
      (a, b) => b.started_at - a.started_at || b.id - a.id,
    );
  }, [selected, detailsQuery.data]);

  const selectedDetail = useMemo<NetworkRequestDetail | null>(() => {
    if (!selected || matchingDetails.length === 0) return null;

    const selectedIsError = Boolean(
      (selected.error !== null && selected.error !== undefined && selected.error.trim().length > 0) ||
      (selected.status !== null && selected.status !== undefined && selected.status >= 400),
    );

    if (selectedIsError) {
      // Find the latest matching error detail
      const errMatch = matchingDetails.find(
        (d) =>
          (d.error !== null && d.error !== undefined && d.error.trim().length > 0) ||
          (d.status !== null && d.status !== undefined && d.status >= 400),
      );
      if (errMatch) return errMatch;
    } else if (
      selected.status !== null &&
      selected.status !== undefined &&
      selected.status >= 200 &&
      selected.status < 400
    ) {
      // Find the latest matching success detail
      const succMatch = matchingDetails.find(
        (d) =>
          (!d.error || d.error.trim().length === 0) &&
          d.status !== null &&
          d.status >= 200 &&
          d.status < 400,
      );
      if (succMatch) return succMatch;
    }

    return matchingDetails[0] ?? null;
  }, [selected, matchingDetails]);

  const handleSelect = (req: NetworkRequest | null) => {
    if (!req) {
      setSelectedIdentity(null);
    } else {
      setSelectedIdentity({
        id: req.id,
        fingerprint: req.fingerprint,
        appName: req.app_name,
        method: req.method,
        url: req.url,
        status: req.status,
        error: req.error,
      });
    }
  };

  const refresh = () => {
    void Promise.all([query.refetch(), detailsQuery.refetch()]);
  };

  const isFetching = query.isFetching || detailsQuery.isFetching;

  const errorCount = rawRequests.filter(
    (request) =>
      request.error !== null ||
      (request.status !== null && request.status >= 400),
  ).length;

  const successCount = rawRequests.filter(
    (request) =>
      request.status !== null &&
      request.status >= 200 &&
      request.status < 400 &&
      !request.error,
  ).length;

  return (
    <main className="min-h-[calc(100vh-4rem)] vh-bg-app p-5 vh-text-main md:p-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Network Activity</h1>
            {preferences.selectedProject !== "ALL" && (
              <span className="flex items-center gap-1.5 rounded-full border vh-border-accent vh-bg-accent px-2.5 py-0.5 text-xs font-medium vh-text-accent">
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
            Inspect captured HTTP requests, query params, headers, and payloads.
          </p>
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
            onClick={() => setIsChromeWindowOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition"
            title="Open Chrome Live Capture Window"
          >
            <Globe size={13} />
            Chrome Window
          </button>

          <button
            onClick={refresh}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-lg border vh-border vh-bg-card px-3.5 py-2 text-xs font-medium vh-text-main hover:border-white/20 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border vh-border vh-bg-card p-4">
          <p className="text-xs font-medium vh-text-muted">Total Request Groups</p>
          <p className="mt-2 text-2xl font-bold tracking-tight vh-text-main">
            {rawRequests.length}
          </p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-4">
          <p className="text-xs font-medium vh-text-muted">Matching Filters</p>
          <p className="mt-2 text-2xl font-bold tracking-tight vh-text-accent">
            {requests.length}
          </p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-4">
          <p className="text-xs font-medium vh-text-muted">Successful (2xx-3xx)</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
            {successCount}
          </p>
        </div>

        <div className="rounded-xl border vh-border vh-bg-card p-4">
          <p className="text-xs font-medium vh-text-muted">Failed / Errors</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-red-400">
            {errorCount}
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-xl border vh-border vh-bg-card shadow-sm">
        {/* Controls Bar */}
        <div className="flex flex-col gap-3 border-b vh-border p-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border vh-border vh-bg-input px-3">
            <Search size={14} className="shrink-0 vh-text-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request URL, method, or application..."
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs vh-text-main shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-gray-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="vh-text-dim hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full appearance-none rounded-lg border vh-border vh-bg-input py-2 pl-3 pr-8 text-xs font-medium vh-text-main outline-none"
            >
              <option value="ALL" className="bg-zinc-900 text-white">All methods</option>
              <option value="GET" className="bg-zinc-900 text-white">GET</option>
              <option value="POST" className="bg-zinc-900 text-white">POST</option>
              <option value="PUT" className="bg-zinc-900 text-white">PUT</option>
              <option value="PATCH" className="bg-zinc-900 text-white">PATCH</option>
              <option value="DELETE" className="bg-zinc-900 text-white">DELETE</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 vh-text-dim" />
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full appearance-none rounded-lg border vh-border vh-bg-input py-2 pl-3 pr-8 text-xs font-medium vh-text-main outline-none"
            >
              <option value="ALL" className="bg-zinc-900 text-white">All statuses</option>
              <option value="SUCCESS" className="bg-zinc-900 text-white">Success (2xx–3xx)</option>
              <option value="CLIENT_ERROR" className="bg-zinc-900 text-white">Client errors (4xx)</option>
              <option value="SERVER_ERROR" className="bg-zinc-900 text-white">Server errors (5xx)</option>
              <option value="ERROR" className="bg-zinc-900 text-white">Network errors</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 vh-text-dim" />
          </div>

          {/* Project selector dropdown */}
          <div className="relative">
            <select
              value={preferences.selectedProject}
              onChange={(e) => updatePreferences({ selectedProject: e.target.value })}
              className="w-full appearance-none rounded-lg border vh-border vh-bg-input py-2 pl-3 pr-8 text-xs font-medium vh-text-main outline-none lg:w-44"
            >
              <option value="ALL" className="bg-zinc-900 text-white">All Projects ({allApps.length})</option>
              {allApps.map((a) => (
                <option key={a.app_name} value={a.app_name} className="bg-zinc-900 text-white">
                  {a.app_name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 vh-text-dim" />
          </div>
        </div>

        {query.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-red-400">Failed to load network requests.</p>
            <button
              onClick={refresh}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : query.isPending ? (
          <div className="p-12 text-center text-xs vh-text-dim">
            Loading network activity...
          </div>
        ) : (
          <RequestTable
            requests={requests}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />
        )}

        <div className="flex items-center justify-between border-t vh-border vh-bg-subtle px-4 py-2.5 text-xs vh-text-dim">
          <span>
            Showing {requests.length} of {rawRequests.length} loaded groups
            {preferences.selectedProject !== "ALL" && (
              <span className="ml-1 text-blue-400 font-medium">
                (Project: {preferences.selectedProject})
              </span>
            )}
          </span>

          <span className="flex items-center gap-1.5">
            <Network size={12} />
            {isFetching ? "Updating live..." : "Real-time socket sync active"}
          </span>
        </div>
      </div>

      {/* Modal for selected request */}
      {selected && (
        <RequestDetails
          request={selected}
          detail={selectedDetail}
          details={matchingDetails}
          onClose={() => setSelectedIdentity(null)}
        />
      )}

      {/* Chrome Live Capture Window modal */}
      <ChromeWindowModal
        isOpen={isChromeWindowOpen}
        onClose={() => setIsChromeWindowOpen(false)}
      />
    </main>
  );
}

export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs">Loading network activity...</div>}>
      <NetworkContent />
    </Suspense>
  );
}
