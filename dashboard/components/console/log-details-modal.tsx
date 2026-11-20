"use client";

import { useState, useEffect } from "react";
import {
  X,
  Terminal,
  Copy,
  Check,
  Clock,
  Boxes,
  Code2,
  Layers3,
  Calendar,
  Hash,
} from "lucide-react";
import type { LogEntry } from "@/types/logs";
import { PrettyJson } from "@/components/shared/pretty-json";
import { playTone } from "@/lib/prefrences";

interface LogDetailsModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

function levelClass(level: string) {
  switch (level) {
    case "error":
      return "text-red-400 bg-red-500/15 border-red-500/30";
    case "warn":
      return "text-amber-400 bg-amber-500/15 border-amber-500/30";
    case "debug":
      return "text-zinc-400 bg-zinc-500/15 border-zinc-500/30";
    case "info":
      return "text-blue-400 bg-blue-500/15 border-blue-500/30";
    default:
      return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
  }
}

export function LogDetailsModal({ log, onClose }: LogDetailsModalProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);

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

  if (!log) return null;

  const copyMessage = () => {
    navigator.clipboard.writeText(log.message);
    setCopiedMessage(true);
    playTone("success");
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const hasJsonData = Boolean(log.data_json && log.data_json.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border vh-border vh-bg-modal shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-5 py-4 vh-bg-card/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent shrink-0">
              <Terminal size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-lg border px-2.5 py-0.5 text-xs font-mono font-bold uppercase tracking-wider ${levelClass(
                    log.level,
                  )}`}
                >
                  {log.level}
                </span>

                <span className="flex items-center gap-1 rounded-md bg-white/5 border vh-border px-2 py-0.5 text-xs font-semibold vh-text-muted">
                  <Boxes size={11} />
                  {log.app_name}
                </span>

                {log.count > 1 && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300">
                    <Layers3 size={11} />
                    ×{log.count}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs vh-text-dim">
                Recorded {new Date(log.last_seen).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyMessage}
              title="Copy log message"
              className="flex items-center gap-1.5 rounded-lg border vh-border px-3 py-1.5 text-xs font-medium vh-text-main hover:bg-white/10 transition"
            >
              {copiedMessage ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg p-1.5 vh-text-dim hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main Log Message Box */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider vh-text-dim block mb-2">
              Log Message
            </label>
            <div className="relative rounded-xl border vh-border vh-bg-input p-4 font-mono text-xs leading-relaxed vh-text-main shadow-inner select-all">
              <pre className="whitespace-pre-wrap break-words">{log.message}</pre>
            </div>
          </div>

          {/* Metadata Grid */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider vh-text-dim block mb-2">
              Telemetry Metadata
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border vh-border vh-bg-subtle p-3">
                <span className="flex items-center gap-2 vh-text-dim">
                  <Boxes size={14} />
                  Application
                </span>
                <span className="font-semibold font-mono vh-text-main">{log.app_name}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border vh-border vh-bg-subtle p-3">
                <span className="flex items-center gap-2 vh-text-dim">
                  <Layers3 size={14} />
                  Total Occurrences
                </span>
                <span className="font-semibold font-mono vh-text-main">{log.count}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border vh-border vh-bg-subtle p-3">
                <span className="flex items-center gap-2 vh-text-dim">
                  <Calendar size={14} />
                  First Recorded
                </span>
                <span className="font-mono text-[11px] vh-text-main">
                  {new Date(log.first_seen).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border vh-border vh-bg-subtle p-3">
                <span className="flex items-center gap-2 vh-text-dim">
                  <Clock size={14} />
                  Last Recorded
                </span>
                <span className="font-mono text-[11px] vh-text-main">
                  {new Date(log.last_seen).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border vh-border vh-bg-subtle p-3 sm:col-span-2">
                <span className="flex items-center gap-2 vh-text-dim shrink-0">
                  <Hash size={14} />
                  Fingerprint
                </span>
                <span className="font-mono text-[11px] vh-text-muted truncate max-w-[70%] text-right">
                  {log.fingerprint}
                </span>
              </div>
            </div>
          </div>

          {/* Formatted JSON Payload */}
          {hasJsonData && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code2 size={14} className="text-violet-400" />
                <label className="text-xs font-semibold uppercase tracking-wider vh-text-dim">
                  Attached JSON Payload
                </label>
              </div>
              <PrettyJson
                title="Log Data"
                data={log.data_json!}
                maxHeight="400px"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t vh-border px-5 py-3 vh-bg-card/50 text-xs vh-text-dim shrink-0">
          <span>Press <kbd className="rounded border vh-border px-1.5 py-0.5 text-[10px] font-mono">ESC</kbd> or click outside to dismiss</span>
          <button
            onClick={onClose}
            className="rounded-lg border vh-border px-3 py-1 text-xs font-medium hover:bg-white/10 vh-text-main transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
