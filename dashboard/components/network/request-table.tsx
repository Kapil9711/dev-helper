"use client";

import type { NetworkRequest } from "@/types/network";
import { formatDistanceToNow } from "date-fns";

interface RequestTableProps {
  requests: NetworkRequest[];
  selectedId: number | null;
  onSelect: (request: NetworkRequest) => void;
}

function getStatusClass(status: number | null, error: string | null) {
  if (error || status === null) return "text-red-400";
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-amber-400";
  if (status >= 200 && status < 300) return "text-emerald-400";
  return "text-gray-400";
}

export function RequestTable({
  requests,
  selectedId,
  onSelect,
}: RequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-gray-300">No matching requests</p>
        <p className="mt-1 text-xs text-gray-500">
          Network activity will appear here when captured.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">URL</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Application</th>
            <th className="px-4 py-3 font-medium">Last seen</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-white/5">
          {requests.map((request) => (
            <tr
              key={request.id}
              onClick={() => onSelect(request)}
              className={`cursor-pointer transition hover:bg-white/[0.04] ${
                selectedId === request.id ? "bg-blue-500/[0.08]" : ""
              }`}
            >
              <td className="px-4 py-3">
                <span className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] text-blue-300">
                  {request.method}
                </span>
              </td>

              <td className="max-w-[300px] px-4 py-3">
                <span className="block truncate font-mono text-xs text-gray-200">
                  {request.url}
                </span>
                {request.count > 1 && (
                  <span className="mt-1 block text-[10px] text-gray-500">
                    {request.count} occurrences
                  </span>
                )}
              </td>

              <td
                className={`px-4 py-3 font-mono text-xs ${getStatusClass(request.status, request.error)}`}
              >
                {request.status ?? "ERR"}
              </td>

              <td className="px-4 py-3 font-mono text-xs text-gray-400">
                {request.duration_ms == null
                  ? "—"
                  : `${request.duration_ms} ms`}
              </td>

              <td className="px-4 py-3 text-xs text-gray-400">
                {request.app_name}
              </td>

              <td className="px-4 py-3 text-xs text-gray-500">
                {formatDistanceToNow(request.last_seen, {
                  addSuffix: true,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
