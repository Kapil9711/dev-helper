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
  Columns,
  Rows,
  Maximize2,
  Minimize2,
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

interface UnifiedDiffLine {
  type: "header" | "chunk" | "add" | "del" | "context";
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

interface SideBySideCell {
  type: "context" | "del" | "add" | "empty";
  lineNumber?: number;
  text: string;
}

interface SideBySideRow {
  type: "chunk" | "header" | "row";
  chunkHeader?: string;
  left?: SideBySideCell;
  right?: SideBySideCell;
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Default to side-by-side ("split") view
  const [viewMode, setViewMode] = useState<"split" | "unified" | "raw">("split");

  // Parse lines for Unified Diff View
  const unifiedLines = useMemo<UnifiedDiffLine[]>(() => {
    if (!diff) return [];

    const rawLines = diff.split("\n");
    const parsed: UnifiedDiffLine[] = [];

    let oldNum = 0;
    let newNum = 0;

    for (const line of rawLines) {
      if (line.startsWith("@@")) {
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

  // Parse rows for Side-by-Side (Split) Diff View: Left = Previous / Original, Right = Updated / Modified
  const splitRows = useMemo<SideBySideRow[]>(() => {
    if (!diff) return [];

    const rawLines = diff.split("\n");
    const rows: SideBySideRow[] = [];

    let oldNum = 0;
    let newNum = 0;

    let delBuffer: Array<{ lineNumber: number; text: string }> = [];
    let addBuffer: Array<{ lineNumber: number; text: string }> = [];

    const flushBuffers = () => {
      const maxLen = Math.max(delBuffer.length, addBuffer.length);
      for (let i = 0; i < maxLen; i++) {
        const delItem = delBuffer[i];
        const addItem = addBuffer[i];

        rows.push({
          type: "row",
          left: delItem
            ? {
                type: "del",
                lineNumber: delItem.lineNumber,
                text: delItem.text,
              }
            : {
                type: "empty",
                text: "",
              },
          right: addItem
            ? {
                type: "add",
                lineNumber: addItem.lineNumber,
                text: addItem.text,
              }
            : {
                type: "empty",
                text: "",
              },
        });
      }
      delBuffer = [];
      addBuffer = [];
    };

    for (const line of rawLines) {
      if (line.startsWith("@@")) {
        flushBuffers();
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldNum = parseInt(match[1], 10);
          newNum = parseInt(match[2], 10);
        }
        rows.push({
          type: "chunk",
          chunkHeader: line,
        });
      } else if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ")
      ) {
        // Skip plumbing headers or render as header
        continue;
      } else if (line.startsWith("-")) {
        delBuffer.push({
          lineNumber: oldNum++,
          text: line.slice(1),
        });
      } else if (line.startsWith("+")) {
        addBuffer.push({
          lineNumber: newNum++,
          text: line.slice(1),
        });
      } else {
        // Context line (' ')
        flushBuffers();
        const content = line.startsWith(" ") ? line.slice(1) : line;
        rows.push({
          type: "row",
          left: {
            type: "context",
            lineNumber: oldNum++,
            text: content,
          },
          right: {
            type: "context",
            lineNumber: newNum++,
            text: content,
          },
        });
      }
    }

    flushBuffers();
    return rows;
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
          Select any modified, staged, or untracked file from the working tree to view its side-by-side diff.
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

  const diffCard = (
    <div
      className={`vh-bg-card border vh-border rounded-xl overflow-hidden shadow-sm flex flex-col ${
        isFullScreen ? "w-full h-full max-h-none" : "h-full min-h-[500px] max-h-[750px]"
      }`}
    >
      {/* Diff Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-4 py-2.5 bg-black/5 dark:bg-white/5 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={16} className="text-sky-400 shrink-0" />
          <span
            className="font-mono text-xs font-semibold vh-text-main truncate"
            title={filePath || "All Changes"}
          >
            {filePath || "Working Directory Changes"}
          </span>
          {staged && (
            <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Staged
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode 3-Way Switcher */}
          <div className="flex items-center border vh-border rounded-lg overflow-hidden bg-black/10 dark:bg-white/5 text-xs font-medium">
            <button
              onClick={() => {
                playTone("click");
                setViewMode("split");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 transition ${
                viewMode === "split"
                  ? "vh-bg-accent vh-text-accent font-semibold"
                  : "vh-text-dim hover:text-white"
              }`}
              title="Side-by-side split comparison (Previous on Left, Updated on Right)"
            >
              <Columns size={12} />
              <span>Split</span>
            </button>

            <button
              onClick={() => {
                playTone("click");
                setViewMode("unified");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 transition border-l vh-border ${
                viewMode === "unified"
                  ? "vh-bg-accent vh-text-accent font-semibold"
                  : "vh-text-dim hover:text-white"
              }`}
              title="Single column unified diff view"
            >
              <Rows size={12} />
              <span>Unified</span>
            </button>

            <button
              onClick={() => {
                playTone("click");
                setViewMode("raw");
              }}
              className={`px-2.5 py-1 transition border-l vh-border ${
                viewMode === "raw"
                  ? "vh-bg-accent vh-text-accent font-semibold"
                  : "vh-text-dim hover:text-white"
              }`}
              title="Raw git diff text"
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

          {/* Full Screen Toggle */}
          <button
            onClick={() => {
              playTone("click");
              setIsFullScreen((prev) => !prev);
            }}
            title={isFullScreen ? "Exit Full Screen" : "Expand Diff to Full Screen"}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border vh-border text-xs vh-text-main hover:bg-white/10 transition"
          >
            {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="hidden sm:inline-block">
              {isFullScreen ? "Restore" : "Full Screen"}
            </span>
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

      {/* Side-by-Side Subheaders */}
      {viewMode === "split" && (
        <div className="grid grid-cols-2 border-b vh-border bg-black/10 dark:bg-white/5 text-[11px] font-mono select-none shrink-0 divide-x vh-border">
          <div className="py-1.5 px-4 flex items-center justify-between text-rose-400/90 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Previous / Original File (Deletions)
            </span>
            <span className="text-[10px] opacity-70">Old Revision</span>
          </div>

          <div className="py-1.5 px-4 flex items-center justify-between text-emerald-400/90 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Updated / Modified File (Additions)
            </span>
            <span className="text-[10px] opacity-70">Working Copy</span>
          </div>
        </div>
      )}

      {/* Main Diff Content Display */}
      {viewMode === "raw" ? (
        <pre className="p-4 font-mono text-xs overflow-auto vh-text-main whitespace-pre flex-1 bg-black/20">
          {diff}
        </pre>
      ) : viewMode === "split" ? (
        /* SIDE-BY-SIDE SPLIT VIEW */
        <div className="font-mono text-[11.5px] overflow-auto flex-1 select-text divide-y divide-black/5 dark:divide-white/5">
          {splitRows.map((row, idx) => {
            if (row.type === "chunk") {
              return (
                <div
                  key={idx}
                  className="bg-sky-500/10 text-sky-400 dark:text-sky-300 font-semibold py-1 px-4 text-[11px] sticky top-0 z-10 border-y border-sky-500/20"
                >
                  {row.chunkHeader}
                </div>
              );
            }

            const left = row.left;
            const right = row.right;

            const isLeftDel = left?.type === "del";
            const isLeftEmpty = left?.type === "empty";

            const isRightAdd = right?.type === "add";
            const isRightEmpty = right?.type === "empty";

            return (
              <div
                key={idx}
                className="grid grid-cols-2 divide-x vh-border transition-colors group hover:bg-white/5"
              >
                {/* Left Side: Previous File */}
                <div
                  className={`flex items-start py-0.5 px-2 min-w-0 ${
                    isLeftDel
                      ? "bg-rose-500/15 text-rose-300"
                      : isLeftEmpty
                      ? "bg-black/10 dark:bg-white/5 opacity-30 select-none"
                      : "vh-text-main"
                  }`}
                >
                  <span className="w-9 text-right pr-2 text-[10px] select-none opacity-40 shrink-0 font-mono">
                    {left?.lineNumber ?? ""}
                  </span>

                  <span className="w-4 select-none font-bold shrink-0 opacity-70">
                    {isLeftDel ? "-" : " "}
                  </span>

                  <span className="whitespace-pre-wrap break-all flex-1 font-mono">
                    {left?.text ?? ""}
                  </span>
                </div>

                {/* Right Side: Updated File */}
                <div
                  className={`flex items-start py-0.5 px-2 min-w-0 ${
                    isRightAdd
                      ? "bg-emerald-500/15 text-emerald-300"
                      : isRightEmpty
                      ? "bg-black/10 dark:bg-white/5 opacity-30 select-none"
                      : "vh-text-main"
                  }`}
                >
                  <span className="w-9 text-right pr-2 text-[10px] select-none opacity-40 shrink-0 font-mono">
                    {right?.lineNumber ?? ""}
                  </span>

                  <span className="w-4 select-none font-bold shrink-0 opacity-70">
                    {isRightAdd ? "+" : " "}
                  </span>

                  <span className="whitespace-pre-wrap break-all flex-1 font-mono">
                    {right?.text ?? ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* UNIFIED DIFF VIEW */
        <div className="font-mono text-[11.5px] overflow-auto flex-1 select-text divide-y divide-black/5 dark:divide-white/5">
          {unifiedLines.map((line, idx) => {
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

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 p-2 sm:p-4 bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-150">
        {diffCard}
      </div>
    );
  }

  return diffCard;
}
