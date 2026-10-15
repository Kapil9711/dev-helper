"use client";

import { useMemo, useState } from "react";
import { Search, RefreshCw, Network } from "lucide-react";
import { RequestTable } from "@/components/network/request-table";
import { RequestDetails } from "@/components/network/request-details";
import { useNetworkRequestsQuery } from "@/lib/queries";
import type { NetworkRequest } from "@/types/network";

export default function NetworkPage() {
  const query = useNetworkRequestsQuery(100);

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<NetworkRequest | null>(null);

  const requests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (query.data?.data ?? []).filter((request) => {
      const matchesSearch =
        !term ||
        request.url.toLowerCase().includes(term) ||
        request.app_name.toLowerCase().includes(term) ||
        request.method.toLowerCase().includes(term);

      const matchesMethod =
        method === "ALL" || request.method.toUpperCase() === method;

      const matchesStatus =
        status === "ALL" ||
        (status === "SUCCESS" &&
          request.status !== null &&
          request.status >= 200 &&
          request.status < 400 &&
          !request.error) ||
        (status === "CLIENT_ERROR" &&
          request.status !== null &&
          request.status >= 400 &&
          request.status < 500) ||
        (status === "SERVER_ERROR" &&
          request.status !== null &&
          request.status >= 500) ||
        (status === "ERROR" &&
          (request.status === null || request.error !== null));

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [query.data, search, method, status]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0b1120] p-5 text-white md:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Network</h1>
          <p className="mt-1 text-sm text-gray-400">
            Inspect captured HTTP activity from your applications.
          </p>
        </div>

        <button
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.07] disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={query.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
          <p className="text-xs text-gray-500">Loaded requests</p>
          <p className="mt-2 text-2xl font-semibold">
            {query.data?.data.length ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
          <p className="text-xs text-gray-500">Matching requests</p>
          <p className="mt-2 text-2xl font-semibold">{requests.length}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
          <p className="text-xs text-gray-500">Request groups with errors</p>
          <p className="mt-2 text-2xl font-semibold text-red-400">
            {
              (query.data?.data ?? []).filter(
                (request) =>
                  request.error !== null ||
                  (request.status !== null && request.status >= 400),
              ).length
            }
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0b1120] px-3">
            <Search size={16} className="shrink-0 text-gray-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search URL or application..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-600"
            />
          </div>

          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-gray-300 outline-none"
          >
            <option value="ALL">All methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-gray-300 outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Success (2xx–3xx)</option>
            <option value="CLIENT_ERROR">Client errors (4xx)</option>
            <option value="SERVER_ERROR">Server errors (5xx)</option>
            <option value="ERROR">Network errors</option>
          </select>
        </div>

        {query.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-red-300">
              Failed to load network requests.
            </p>
            <button
              onClick={() => void query.refetch()}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : query.isPending ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading network requests...
          </div>
        ) : (
          <RequestTable
            requests={requests}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        )}

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-gray-500">
          <span>
            Showing {requests.length} of {query.data?.data.length ?? 0} loaded
            records
          </span>
          <span className="flex items-center gap-1.5">
            <Network size={13} />
            Live updates enabled
          </span>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <button
            aria-label="Close request details"
            className="flex-1 cursor-default"
            onClick={() => setSelected(null)}
          />
          <div className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0e1626] shadow-2xl">
            <RequestDetails
              request={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
