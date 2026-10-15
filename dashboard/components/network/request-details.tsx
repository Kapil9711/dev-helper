"use client";

import { X, Clock3, Globe, Layers3 } from "lucide-react";
import type { NetworkRequest } from "@/types/network";
import { formatDistanceToNow } from "date-fns";

interface RequestDetailsProps {
  request: NetworkRequest | null;
  onClose: () => void;
}

export function RequestDetails({ request, onClose }: RequestDetailsProps) {
  if (!request) return null;

  const fields = [
    { label: "Application", value: request.app_name },
    { label: "Method", value: request.method },
    { label: "Status", value: request.status ?? "Network error" },
    {
      label: "Duration",
      value:
        request.duration_ms == null
          ? "Unavailable"
          : `${request.duration_ms} ms`,
    },
    { label: "Occurrences", value: request.count },
    {
      label: "First seen",
      value: new Date(request.first_seen).toLocaleString(),
    },
    {
      label: "Last seen",
      value: formatDistanceToNow(request.last_seen, {
        addSuffix: true,
      }),
    },
  ];

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-white/10 bg-[#0e1626]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <Layers3 size={17} className="text-blue-400" />
          <h2 className="text-sm font-medium">Request details</h2>
        </div>

        <button
          onClick={onClose}
          aria-label="Close request details"
          className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Request URL
          </p>
          <div className="flex gap-2">
            <Globe size={15} className="mt-0.5 shrink-0 text-gray-500" />
            <p className="break-all font-mono text-xs leading-5 text-gray-200">
              {request.url}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Request information
          </p>

          <div className="divide-y divide-white/5 rounded-lg border border-white/10">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <span className="text-xs text-gray-500">{field.label}</span>
                <span className="max-w-[65%] break-all text-right text-xs text-gray-200">
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {request.error && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Error
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
              {request.error}
            </pre>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock3 size={14} />
          Data reflects the captured request record.
        </div>
      </div>
    </aside>
  );
}
