"use client";

import type { NetworkRequest } from "@/types/network";
import { formatDistanceToNow } from "date-fns";

interface RequestTableProps {
  requests: NetworkRequest[];
  selectedId: number | null;
  onSelect: (request: NetworkRequest) => void;
}

function getStatusClass(status: number | null, error: string | null) {
  if (error && (!status || status >= 400)) return "text-red-400 bg-red-500/10 border-red-500/20";
  if (status === null) return "text-red-400 bg-red-500/10 border-red-500/20";
  if (status >= 500) return "text-red-400 bg-red-500/10 border-red-500/20";
  if (status >= 400) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  if (status >= 200 && status < 300) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  return "text-gray-400 bg-gray-500/10 border-gray-500/20";
}

function methodBadgeClass(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "POST":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "PUT":
    case "PATCH":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "DELETE":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-purple-400 bg-purple-500/10 border-purple-500/20";
  }
}

export function RequestTable({
  requests,
  selectedId,
  onSelect,
}: RequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="p-14 text-center">
        <p className="text-sm font-medium vh-text-main">No network requests found</p>
        <p className="mt-1 text-xs vh-text-dim">
          HTTP requests captured from instrumented apps will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="border-b vh-border vh-bg-subtle text-[11px] font-semibold uppercase tracking-wider vh-text-dim">
          <tr>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Endpoint / URL</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Application</th>
            <th className="px-4 py-3">Last Seen</th>
          </tr>
        </thead>

        <tbody className="divide-y vh-border-subtle">
          {requests.map((request) => {
            const isSelected = selectedId === request.id;
            return (
              <tr
                key={request.id}
                onClick={() => onSelect(request)}
                className={`cursor-pointer transition hover:bg-white/[0.04] ${
                  isSelected ? "vh-bg-accent/30 font-medium" : ""
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${methodBadgeClass(
                      request.method,
                    )}`}
                  >
                    {request.method}
                  </span>
                </td>

                <td className="max-w-[340px] px-4 py-3">
                  <span className="block truncate font-mono text-xs vh-text-main">
                    {request.url}
                  </span>
                  {request.count > 1 && (
                    <span className="mt-0.5 inline-block rounded bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300">
                      {request.count} requests
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${getStatusClass(
                      request.status,
                      request.error,
                    )}`}
                  >
                    {request.status ? `${request.status}` : "ERR"}
                  </span>
                </td>

                <td className="px-4 py-3 font-mono text-xs vh-text-dim whitespace-nowrap">
                  {request.duration_ms == null ? "—" : `${Math.round(request.duration_ms)} ms`}
                </td>

                <td className="px-4 py-3 text-xs font-medium vh-text-muted whitespace-nowrap">
                  {request.app_name}
                </td>

                <td className="px-4 py-3 text-xs vh-text-dim whitespace-nowrap">
                  {formatDistanceToNow(request.last_seen, { addSuffix: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
