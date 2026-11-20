"use client";

import { useMemo, useState } from "react";
import {
  FileCode,
  Copy,
  Check,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Split,
  FileText,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

interface DiffViewerProps {
  diff: string;
  filePath: string | null;
  staged?: boolean;
  onStageToggle?: () => void;
  onDiscard?: () => void;
  isActionLoading?: boolean;
}

interface DiffLine {
  type: "header" | "chunk" | "add" | "del" | "context";
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

export function DiffViewer({
  diff,
  filePath,
  staged = false,
  onStageToggle,
  onDiscard,
  isActionLoading = false,
}: DiffViewerProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"unified" | "raw">("unified");

  const lines = useMemo<DiffLine[]>(() => {
    if (!diff) return [];

    const rawLines = diff.split("\n");
    const parsed: DiffLine[] = [];

    let oldNum = 0;
    let newNum = 0;

    for (const line of rawLines) {
      if (line.startsWith("@@")) {
        // Chunk header e.g. @@ -12,4 +12,6 @@
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldNum = parseInt(match[1], 10);
          newNum = parseInt(match[2], 10);
        }
        parsed.push({ type: "chunk", text: line });
      } else if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ")
      ) {
        parsed.push({ type: "header", text: line });
      } else if (line.startsWith("+")) {
        parsed.push({
          type: "add",
          newLineNumber: newNum++,
          text: line,
        });
      } else if (line.startsWith("-")) {
        parsed.push({
          type: "del",
          oldLineNumber: oldNum++,
          text: line,
        });
      } else {
        parsed.push({
          type: "context",
          oldLineNumber: oldNum++,
          newLineNumber: newNum++,
          text: line,
        });
      }
    }

    return parsed;
  }, [diff]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      playTone("click");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!filePath && !diff) {
    return (
      <div className="flex flex-col items-center justify-center p-14 text-center vh-bg-card border vh-border rounded-xl">
        <FileCode className="w-12 h-12 mb-3 vh-text-dim opacity-40" />
        <p className="font-semibold text-base vh-text-main">No File Selected</p>
        <p className="text-xs mt-1 vh-text-dim max-w-sm">
          Select any modified, staged, or untracked file from the working tree to view its syntax-highlighted diff.
        </p>
      </div>
    );
  }

  if (diff.trim() === "") {
    return (
      <div className="flex flex-col items-center justify-center p-14 text-center vh-bg-card border vh-border rounded-xl">
        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400 opacity-80" />
        <p className="font-semibold text-base vh-text-main">Working Tree Clean</p>
        <p className="text-xs mt-1 vh-text-dim max-w-sm">
          {filePath
            ? `File "${filePath}" has no pending uncommitted changes.`
            : "No modified or uncommitted files in repository."}
        </p>
      </div>
    );
  }

  return (
    <div className="vh-bg-card border vh-border rounded-xl overflow-hidden shadow-sm flex flex-col h-full max-h-[750px]">
      {/* Diff Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-4 py-2.5 bg-black/5 dark:bg-white/5 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={16} className="text-sky-400 shrink-0" />
          <span className="font-mono text-xs font-semibold vh-text-main truncate" title={filePath || "All Changes"}>
            {filePath || "Working Directory Changes"}
          </span>
          {staged && (
            <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Staged
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border vh-border rounded-lg overflow-hidden bg-black/10 dark:bg-white/5">
            <button
              onClick={() => setViewMode("unified")}
              className={`px-2.5 py-1 text-xs font-medium transition ${
                viewMode === "unified" ? "vh-bg-accent vh-text-accent" : "vh-text-dim hover:text-white"
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2.5 py-1 text-xs font-medium transition ${
                viewMode === "raw" ? "vh-bg-accent vh-text-accent" : "vh-text-dim hover:text-white"
              }`}
            >
              Raw
            </button>
          </div>

          {/* Copy Diff */}
          <button
            onClick={handleCopy}
            title="Copy diff to clipboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border vh-border text-xs vh-text-main hover:bg-white/5 transition"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy Diff"}
          </button>

          {/* Stage / Unstage Action */}
          {onStageToggle && filePath && (
            <button
              disabled={isActionLoading}
              onClick={onStageToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                staged
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {staged ? <Minus size={12} /> : <Plus size={12} />}
              {staged ? "Unstage File" : "Stage File"}
            </button>
          )}

          {/* Discard Action */}
          {onDiscard && filePath && !staged && (
            <button
              disabled={isActionLoading}
              onClick={onDiscard}
              title="Discard changes in this file"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition"
            >
              <Trash2 size={12} />
              Discard
            </button>
          )}
        </div>
      </div>

      {/* Diff Content View */}
      {viewMode === "raw" ? (
        <pre className="p-4 font-mono text-xs overflow-auto vh-text-main whitespace-pre flex-1 bg-black/20">
          {diff}
        </pre>
      ) : (
        <div className="font-mono text-[11.5px] overflow-auto flex-1 select-text divide-y divide-black/5 dark:divide-white/5">
          {lines.map((line, idx) => {
            if (line.type === "chunk") {
              return (
                <div
                  key={idx}
                  className="bg-sky-500/10 text-sky-400 dark:text-sky-300 font-semibold py-1 px-4 text-[11px] sticky top-0 z-10 border-y border-sky-500/20"
                >
                  {line.text}
                </div>
              );
            }

            if (line.type === "header") {
              return (
                <div
                  key={idx}
                  className="vh-text-dim text-[10.5px] px-4 py-0.5 bg-black/5 dark:bg-white/5 truncate"
                >
                  {line.text}
                </div>
              );
            }

            const isAdd = line.type === "add";
            const isDel = line.type === "del";

            return (
              <div
                key={idx}
                className={`flex items-start py-0.5 px-2 hover:bg-white/5 transition-colors ${
                  isAdd
                    ? "bg-emerald-500/15 text-emerald-300 dark:text-emerald-300"
                    : isDel
                    ? "bg-rose-500/15 text-rose-300 dark:text-rose-300"
                    : "vh-text-main"
                }`}
              >
                {/* Old Line Number */}
                <span className="w-10 text-right pr-2 text-[10px] select-none opacity-40 shrink-0 font-mono">
                  {line.oldLineNumber ?? ""}
                </span>

                {/* New Line Number */}
                <span className="w-10 text-right pr-3 text-[10px] select-none opacity-40 shrink-0 font-mono">
                  {line.newLineNumber ?? ""}
                </span>

                {/* +/- Indicator */}
                <span className="w-4 select-none font-bold shrink-0 opacity-70">
                  {isAdd ? "+" : isDel ? "-" : " "}
                </span>

                {/* Code Text */}
                <span className="whitespace-pre-wrap break-all flex-1 font-mono">
                  {line.text.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
