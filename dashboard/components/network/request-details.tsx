"use client";

import { useMemo } from "react";
import { X, Clock3, Globe, Layers3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NetworkRequest, NetworkRequestDetail } from "@/types/network";

interface RequestDetailsProps {
  request: NetworkRequest | null;
  detail?: NetworkRequestDetail | null;
  onClose: () => void;
}

function formatJson(value: string | null | undefined): string {
  if (value == null || value === "") return "No data captured";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function DataSection({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#0b1120] p-3 font-mono text-xs leading-5 text-gray-300">
        {formatJson(value)}
      </pre>
    </section>
  );
}

export function RequestDetails({
  request,
  detail = null,
  onClose,
}: RequestDetailsProps) {
  const params = useMemo(() => {
    if (!detail?.params_json) return null;

    try {
      return JSON.stringify(JSON.parse(detail.params_json), null, 2);
    } catch {
      return detail.params_json;
    }
  }, [detail?.params_json]);

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
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Request URL
          </p>
          <div className="flex gap-2">
            <Globe size={15} className="mt-0.5 shrink-0 text-gray-500" />
            <p className="break-all font-mono text-xs leading-5 text-gray-200">
              {request.url}
            </p>
          </div>
        </section>

        <section>
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
        </section>

        {request.error && (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Error
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
              {request.error}
            </pre>
          </section>
        )}

        {detail ? (
          <>
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-medium text-gray-200">
                Individual request
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-gray-500">
                ID: {detail.request_id}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Started: {new Date(detail.started_at).toLocaleString()}
              </p>
            </div>

            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Response information
              </p>
              <div className="divide-y divide-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className="text-xs text-gray-200">
                    {detail.status == null
                      ? "No response"
                      : `${detail.status}${detail.status_text ? ` ${detail.status_text}` : ""}`}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <span className="text-xs text-gray-500">Duration</span>
                  <span className="text-xs text-gray-200">
                    {detail.duration_ms == null
                      ? "Unavailable"
                      : `${detail.duration_ms} ms`}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <span className="text-xs text-gray-500">Completed</span>
                  <span className="text-right text-xs text-gray-200">
                    {detail.completed_at == null
                      ? "Pending / not captured"
                      : new Date(detail.completed_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </section>

            {detail.error && (
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                  Request error
                </p>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                  {detail.error}
                </pre>
              </section>
            )}

            <DataSection title="Query parameters" value={params} />
            <DataSection
              title="Request headers"
              value={detail.request_headers_json}
            />
            <DataSection
              title="Request body"
              value={detail.request_body_json}
            />
            <DataSection
              title="Response headers"
              value={detail.response_headers_json}
            />
            <DataSection
              title="Response body"
              value={detail.response_body_json}
            />
          </>
        ) : (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-300">
              No individual request details found
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              This row is an aggregated request group. Detailed headers and
              bodies will appear when the SDK records an individual request
              matching this application, method, and URL.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock3 size={14} />
          Data reflects captured network activity.
        </div>
      </div>
    </aside>
  );
}
