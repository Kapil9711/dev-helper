"use client";

import { useState, useMemo, useEffect } from "react";
import type { GitCommitItem } from "@/types/git";
import {
  X,
  GitCommit,
  GitBranch,
  Copy,
  Check,
  Calendar,
  User,
  Split,
  FileText,
  Maximize2,
  Minimize2,
  Layers,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useGitCommitDetailsQuery } from "@/lib/queries";
import { DiffViewer } from "./diff-viewer";
import { playTone } from "@/lib/prefrences";

export interface CommitFileDiff {
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export function parseGitShowOutput(raw: string): {
  headerText: string;
  files: CommitFileDiff[];
  statsText: string;
} {
  if (!raw) return { headerText: "", files: [], statsText: "" };

  const firstDiffIndex = raw.indexOf("diff --git ");
  if (firstDiffIndex === -1) {
    return { headerText: raw, files: [], statsText: "" };
  }

  const headerText = raw.slice(0, firstDiffIndex).trim();
  const diffSection = raw.slice(firstDiffIndex);
  const rawFileDiffs = diffSection.split(/(?=diff --git )/);
  const files: CommitFileDiff[] = [];

  for (const fileDiff of rawFileDiffs) {
    if (!fileDiff.startsWith("diff --git ")) continue;

    const match = fileDiff.match(/^diff --git a\/(.+?) b\/(.+?)(?:\n|\r\n)/);
    const path = match ? match[2] || match[1] : "Unknown file";

    let additions = 0;
    let deletions = 0;
    const lines = fileDiff.split("\n");
    for (const l of lines) {
      if (l.startsWith("+++") || l.startsWith("---")) continue;
      if (l.startsWith("+")) additions++;
      else if (l.startsWith("-")) deletions++;
    }

    files.push({
      path,
      diff: fileDiff,
      additions,
      deletions,
    });
  }

  const statsMatch = headerText.match(/(\d+\s+files?\s+changed[^\n]*)/i);
  const statsText = statsMatch ? statsMatch[1] : "";

  return {
    headerText,
    files,
    statsText,
  };
}

// Generate a deterministic color from string for author avatars
function getAuthorColor(name: string): string {
  const colors = [
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-purple-500 to-indigo-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface CommitDiffModalProps {
  commit: GitCommitItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CommitDiffModal({ commit, isOpen, onClose }: CommitDiffModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const commitDetailsQuery = useGitCommitDetailsQuery(
    isOpen && commit ? commit.hash : undefined,
  );

  const rawOutput = commitDetailsQuery.data?.output ?? "";

  const { files, statsText } = useMemo(() => {
    return parseGitShowOutput(rawOutput);
  }, [rawOutput]);

  // Combined diff of all files if user wants to see everything
  const allDiffs = useMemo(() => {
    const firstDiffIndex = rawOutput.indexOf("diff --git ");
    if (firstDiffIndex === -1) return rawOutput;
    return rawOutput.slice(firstDiffIndex);
  }, [rawOutput]);

  // Selected file's diff or full diff
  const activeDiff = useMemo(() => {
    if (!selectedFilePath || selectedFilePath === "__ALL__") {
      return files.length > 0 ? (files[0]?.diff ?? allDiffs) : allDiffs;
    }
    const match = files.find((f) => f.path === selectedFilePath);
    return match ? match.diff : allDiffs;
  }, [selectedFilePath, files, allDiffs]);

  const activeFilePath = useMemo(() => {
    if (!selectedFilePath || selectedFilePath === "__ALL__") {
      return files.length > 0 ? files[0]?.path ?? "Commit Diff" : "Commit Diff";
    }
    return selectedFilePath;
  }, [selectedFilePath, files]);

  // Reset file selection when commit changes
  useEffect(() => {
    if (files.length > 0) {
      setSelectedFilePath(files[0]?.path ?? null);
    } else {
      setSelectedFilePath(null);
    }
  }, [commit?.hash, files]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullScreen, onClose]);

  if (!isOpen || !commit) return null;

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(commit.hash);
      setCopiedHash(true);
      playTone("click");
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // Ignored
    }
  };

  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`vh-bg-card border vh-border rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isFullScreen
            ? "fixed inset-0 z-50 p-3 sm:p-5 bg-black/95 backdrop-blur-xl h-screen w-screen max-w-none rounded-none"
            : "max-w-6xl h-[90vh] max-h-[850px]"
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-5 py-3.5 bg-black/10 dark:bg-white/5 select-none shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Split size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base vh-text-main truncate max-w-md sm:max-w-xl">
                  {commit.message}
                </h3>

                <button
                  onClick={handleCopyHash}
                  title="Copy full commit SHA"
                  className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-lg border vh-border bg-black/30 hover:bg-white/10 text-sky-400 transition shrink-0"
                >
                  {copiedHash ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{commit.shortHash}</span>
                </button>
              </div>

              {/* Author & Timestamp */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono vh-text-dim mt-0.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-4 h-4 rounded-full bg-gradient-to-tr ${getAuthorColor(
                      commit.author,
                    )} flex items-center justify-center text-[8px] font-bold text-white shadow-xs shrink-0`}
                  >
                    {getInitials(commit.author)}
                  </div>
                  <span className="font-semibold vh-text-main">{commit.author}</span>
                  <span className="opacity-70">&lt;{commit.email}&gt;</span>
                </div>
                <span>•</span>
                <span className="text-sky-400">{commit.relativeDate}</span>
                <span>•</span>
                <span>{commit.date}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsFullScreen((prev) => !prev);
                playTone("click");
              }}
              title={isFullScreen ? "Exit Full Screen" : "Expand to Full Screen"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border vh-border text-xs vh-text-main hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{isFullScreen ? "Restore" : "Full Screen"}</span>
            </button>

            <button
              onClick={() => {
                playTone("click");
                onClose();
              }}
              className="p-1.5 rounded-lg vh-text-dim hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Files Changed Strip / File Selector Tabs */}
        {files.length > 0 && (
          <div className="flex items-center gap-1.5 border-b vh-border px-4 py-2 vh-bg-subtle overflow-x-auto no-scrollbar shrink-0 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold vh-text-dim shrink-0 pr-1">
              Changed Files ({files.length}):
            </span>

            {files.map((f) => {
              const isSelected = (selectedFilePath || files[0]?.path) === f.path;
              const fileName = f.path.split("/").pop() || f.path;

              return (
                <button
                  key={f.path}
                  onClick={() => {
                    setSelectedFilePath(f.path);
                    playTone("click");
                  }}
                  title={f.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs whitespace-nowrap transition shrink-0 ${
                    isSelected
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold shadow-xs"
                      : "vh-border bg-black/[0.02] dark:bg-white/[0.02] vh-text-dim hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <FileText size={12} className={isSelected ? "text-sky-400" : "vh-text-dim"} />
                  <span className="truncate max-w-[200px]">{fileName}</span>

                  <span className="flex items-center gap-1 text-[10px] pl-1 font-sans">
                    {f.additions > 0 && (
                      <span className="text-emerald-400 font-bold">+{f.additions}</span>
                    )}
                    {f.deletions > 0 && (
                      <span className="text-rose-400 font-bold">-{f.deletions}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Center Diff Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-2 sm:p-3 bg-black/20">
          {commitDetailsQuery.isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
              <div className="h-10 w-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono vh-text-dim">Loading commit split diff...</p>
            </div>
          ) : (
            <div className="flex-1 h-full overflow-hidden">
              <DiffViewer
                diff={activeDiff}
                filePath={activeFilePath}
                staged={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="border-t vh-border px-5 py-2.5 bg-black/10 dark:bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
          <div className="flex items-center gap-3 font-mono text-[11px] vh-text-dim">
            <span>
              {statsText || `${files.length} file${files.length === 1 ? "" : "s"} modified`}
            </span>
            <span>·</span>
            <span className="text-emerald-400">+{totalAdditions} insertions</span>
            <span>·</span>
            <span className="text-rose-400">-{totalDeletions} deletions</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
              Side-by-Side Split View
            </span>
            <button
              onClick={() => {
                playTone("click");
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
