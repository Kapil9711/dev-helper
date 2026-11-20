"use client";

import { useState } from "react";
import {
  X,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  GitBranch,
  ArrowRight,
  RefreshCw,
  Info,
  Copy,
  Check,
  GitCommit,
  FileText,
  AlertTriangle,
  Layers,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export interface PendingCommitInfo {
  hash: string;
  message: string;
  author?: string;
  time?: string;
}

export interface GitSyncModalState {
  isOpen: boolean;
  action: "push" | "pull";
  status: "running" | "success" | "error";
  currentBranch: string;
  remoteBranch: string;
  remoteUrl?: string;
  aheadCount?: number;
  behindCount?: number;
  pendingCommits?: PendingCommitInfo[];
  command?: string;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
}

interface GitSyncModalProps {
  modalState: GitSyncModalState;
  onClose: () => void;
  onPullFirst?: () => void;
  onSelectConflictFile?: (filePath: string) => void;
}

export function parseGitSyncOutput(stdout = "", stderr = ""): {
  alreadyUpToDate: boolean;
  fastForward: boolean;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
  conflictedFiles: string[];
  objectsSummary?: string;
  strategy?: string;
} {
  const combined = `${stdout}\n${stderr}`;

  const alreadyUpToDate =
    combined.includes("Already up to date") ||
    combined.includes("Everything up-to-date") ||
    combined.includes("Everything up to date");

  const fastForward = combined.includes("Fast-forward");

  // Parse files changed, insertions, deletions
  let filesChanged: number | undefined;
  let insertions: number | undefined;
  let deletions: number | undefined;

  const summaryMatch = combined.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/i,
  );
  if (summaryMatch) {
    filesChanged = parseInt(summaryMatch[1], 10);
    insertions = summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0;
    deletions = summaryMatch[3] ? parseInt(summaryMatch[3], 10) : 0;
  }

  // Parse merge conflicts
  const conflictedFiles: string[] = [];
  const conflictRegex = /CONFLICT\s*(?:\([^)]+\))?:\s*(?:Merge conflict in\s+)?([^\n\r]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = conflictRegex.exec(combined)) !== null) {
    if (match[1]) {
      conflictedFiles.push(match[1].trim());
    }
  }

  // Parse objects transferred for push
  let objectsSummary: string | undefined;
  const totalMatch = combined.match(/Total\s+(\d+[^,\n]+)/i);
  if (totalMatch) {
    objectsSummary = `Total ${totalMatch[1]}`;
  } else {
    const writingMatch = combined.match(/Writing objects:\s*(\d+%\s*\([^)]+\)[^,\n]*)/i);
    if (writingMatch) {
      objectsSummary = `Writing ${writingMatch[1]}`;
    }
  }

  // Parse merge strategy
  let strategy: string | undefined;
  if (
    combined.includes("Merge made by the 'ort' strategy") ||
    combined.includes("Merge made by the 'recursive' strategy")
  ) {
    strategy = "Three-Way Merge";
  } else if (fastForward) {
    strategy = "Fast-Forward";
  }

  return {
    alreadyUpToDate,
    fastForward,
    filesChanged,
    insertions,
    deletions,
    conflictedFiles,
    objectsSummary,
    strategy,
  };
}

export function GitSyncModal({
  modalState,
  onClose,
  onPullFirst,
  onSelectConflictFile,
}: GitSyncModalProps) {
  const [copied, setCopied] = useState(false);

  if (!modalState.isOpen) return null;

  const isPush = modalState.action === "push";
  const isRunning = modalState.status === "running";
  const isSuccess = modalState.status === "success";
  const isError = modalState.status === "error";

  const durationStr = modalState.durationMs
    ? modalState.durationMs < 1000
      ? `${modalState.durationMs}ms`
      : `${(modalState.durationMs / 1000).toFixed(2)}s`
    : null;

  const parsedStats = parseGitSyncOutput(modalState.stdout, modalState.stderr);

  // Diagnostic tips
  let diagnosticTip: string | null = null;
  const errOutput = (modalState.stderr || "") + " " + (modalState.stdout || "");

  if (isError) {
    if (errOutput.includes("rejected") || errOutput.includes("non-fast-forward")) {
      diagnosticTip =
        "The remote tracking branch has newer commits that you do not have locally. Pull the remote changes first before pushing to integrate updates.";
    } else if (
      errOutput.includes("CONFLICT") ||
      errOutput.includes("conflict") ||
      parsedStats.conflictedFiles.length > 0
    ) {
      diagnosticTip =
        "Automatic merge failed due to conflicting line edits. Review and resolve the conflicting files below, then stage and commit.";
    } else if (
      errOutput.includes("Could not resolve host") ||
      errOutput.includes("Connection refused") ||
      errOutput.includes("Network is unreachable")
    ) {
      diagnosticTip =
        "Network connection to the Git remote failed. Please verify your internet connection, proxy settings, or remote repository URL.";
    } else if (
      errOutput.includes("Permission denied") ||
      errOutput.includes("Authentication failed") ||
      errOutput.includes("remote: Repository not found")
    ) {
      diagnosticTip =
        "Authentication failed with the Git remote. Verify your SSH key or Personal Access Token (PAT) has write access.";
    } else if (errOutput.includes("Your local changes to the following files would be overwritten")) {
      diagnosticTip =
        "You have uncommitted local modifications that conflict with incoming changes. Stash your changes first (vh git stash) before pulling.";
    }
  }

  const handleCopyLogs = async () => {
    const fullLog = `Command: ${modalState.command || `git ${modalState.action}`}\n\nSTDOUT:\n${
      modalState.stdout || "(empty)"
    }\n\nSTDERR:\n${modalState.stderr || "(empty)"}`;
    try {
      await navigator.clipboard.writeText(fullLog);
      setCopied(true);
      playTone("click");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="vh-bg-card border vh-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b vh-border px-5 py-4 bg-black/5 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isPush
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {isPush ? <UploadCloud size={22} /> : <DownloadCloud size={22} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold vh-text-main">
                  {isPush ? "Git Push Details" : "Git Pull Details"}
                </h2>
                <span
                  className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                    isRunning
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse"
                      : isSuccess
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  }`}
                >
                  {isRunning ? "In Progress" : isSuccess ? "Success" : "Failed"}
                </span>
              </div>
              <p className="text-xs vh-text-dim mt-0.5">
                {isPush
                  ? "Syncing local commits and objects to remote tracking branch"
                  : "Fetching and merging incoming commits from remote repository"}
              </p>
            </div>
          </div>

          {!isRunning && (
            <button
              onClick={() => {
                playTone("click");
                onClose();
              }}
              className="p-1.5 rounded-lg vh-text-dim hover:text-white hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Visual Branch Routing Card */}
          <div className="p-4 rounded-xl border vh-border bg-black/15 dark:bg-white/5 space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {isPush ? (
                <>
                  {/* Local Branch Source */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.7)] shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-sans font-semibold vh-text-dim">
                        Local Branch (Source)
                      </p>
                      <p className="font-bold text-sky-400 truncate text-sm">
                        {modalState.currentBranch || "HEAD"}
                      </p>
                    </div>
                  </div>

                  {/* Flow Direction Indicator */}
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] uppercase tracking-wider font-sans vh-text-dim font-bold mb-1">
                      {isRunning ? "Pushing to" : "Target"}
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className={`h-0.5 w-10 rounded-full ${
                          isRunning ? "bg-sky-400 animate-pulse" : "bg-white/20"
                        }`}
                      />
                      <ArrowRight
                        size={15}
                        className={isRunning ? "text-sky-400 animate-bounce" : "vh-text-dim"}
                      />
                    </div>
                  </div>

                  {/* Remote Branch Destination */}
                  <div className="flex items-center gap-2.5 min-w-0 text-right">
                    <div>
                      <p className="text-[10px] uppercase font-sans font-semibold vh-text-dim">
                        Remote Tracking (Destination)
                      </p>
                      <p className="font-bold text-emerald-400 truncate text-sm">
                        {modalState.remoteBranch || "origin/main"}
                      </p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] shrink-0" />
                  </div>
                </>
              ) : (
                <>
                  {/* Remote Branch Source */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-sans font-semibold vh-text-dim">
                        Remote Tracking (Source)
                      </p>
                      <p className="font-bold text-emerald-400 truncate text-sm">
                        {modalState.remoteBranch || "origin/main"}
                      </p>
                    </div>
                  </div>

                  {/* Flow Direction Indicator */}
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] uppercase tracking-wider font-sans vh-text-dim font-bold mb-1">
                      {isRunning ? "Pulling into" : "Destination"}
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className={`h-0.5 w-10 rounded-full ${
                          isRunning ? "bg-emerald-400 animate-pulse" : "bg-white/20"
                        }`}
                      />
                      <ArrowRight
                        size={15}
                        className={isRunning ? "text-emerald-400 animate-bounce" : "vh-text-dim"}
                      />
                    </div>
                  </div>

                  {/* Local Branch Destination */}
                  <div className="flex items-center gap-2.5 min-w-0 text-right">
                    <div>
                      <p className="text-[10px] uppercase font-sans font-semibold vh-text-dim">
                        Local Branch (Target)
                      </p>
                      <p className="font-bold text-sky-400 truncate text-sm">
                        {modalState.currentBranch || "HEAD"}
                      </p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.7)] shrink-0" />
                  </div>
                </>
              )}
            </div>

            {/* Sub-bar: Ahead/Behind & Remote URL info */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t vh-border gap-2 text-[11px] font-sans">
              <div className="flex items-center gap-2">
                {modalState.aheadCount !== undefined && modalState.aheadCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                    <ArrowUp size={11} /> {modalState.aheadCount} commit{modalState.aheadCount === 1 ? "" : "s"} ahead
                  </span>
                )}
                {modalState.behindCount !== undefined && modalState.behindCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px]">
                    <ArrowDown size={11} /> {modalState.behindCount} commit{modalState.behindCount === 1 ? "" : "s"} behind
                  </span>
                )}
                {modalState.aheadCount === 0 && modalState.behindCount === 0 && (
                  <span className="text-zinc-400 text-[11px]">In sync with remote before action</span>
                )}
              </div>

              {modalState.remoteUrl && (
                <span className="font-mono text-[10.5px] text-zinc-400 truncate max-w-xs" title={modalState.remoteUrl}>
                  {modalState.remoteUrl}
                </span>
              )}
            </div>
          </div>

          {/* Outgoing Commits to Push List (For Push) */}
          {isPush && modalState.pendingCommits && modalState.pendingCommits.length > 0 && (
            <div className="p-3.5 rounded-xl border vh-border bg-black/10 dark:bg-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold vh-text-main">
                <span className="flex items-center gap-1.5">
                  <GitCommit size={14} className="text-sky-400" />
                  Commits Being Pushed ({modalState.pendingCommits.length})
                </span>
                <span className="text-[10px] font-mono text-sky-400">
                  HEAD~{modalState.pendingCommits.length}..HEAD
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {modalState.pendingCommits.map((c) => (
                  <div
                    key={c.hash}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/25 border vh-border font-mono text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] shrink-0">
                        {c.hash}
                      </span>
                      <span className="truncate vh-text-main font-sans text-xs" title={c.message}>
                        {c.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-sans vh-text-dim">
                      {c.author && <span className="truncate max-w-[100px]">{c.author}</span>}
                      {c.time && <span>· {c.time}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metric Stats Breakdown (On completion) */}
          {!isRunning && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Stat 1: Outcome */}
              <div className="p-3 rounded-xl border vh-border bg-black/10 dark:bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-semibold vh-text-dim">Outcome</p>
                <p className="font-bold text-xs truncate">
                  {parsedStats.alreadyUpToDate ? (
                    <span className="text-emerald-400">Up to Date</span>
                  ) : parsedStats.fastForward ? (
                    <span className="text-sky-400">Fast-Forward</span>
                  ) : isSuccess ? (
                    <span className="text-emerald-400">Complete</span>
                  ) : (
                    <span className="text-rose-400">Error</span>
                  )}
                </p>
              </div>

              {/* Stat 2: Duration */}
              <div className="p-3 rounded-xl border vh-border bg-black/10 dark:bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-semibold vh-text-dim">Execution Time</p>
                <p className="font-mono font-bold text-xs text-sky-400">
                  {durationStr || "< 100ms"}
                </p>
              </div>

              {/* Stat 3: Transfer / Changes */}
              <div className="p-3 rounded-xl border vh-border bg-black/10 dark:bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-semibold vh-text-dim">
                  {isPush ? "Transferred" : "Changes"}
                </p>
                <p className="font-bold text-xs truncate">
                  {parsedStats.filesChanged !== undefined ? (
                    <span className="text-emerald-400 font-mono text-[11px]">
                      +{parsedStats.insertions} / -{parsedStats.deletions} ({parsedStats.filesChanged}f)
                    </span>
                  ) : parsedStats.objectsSummary ? (
                    <span className="text-zinc-300 font-mono text-[11px]">
                      {parsedStats.objectsSummary}
                    </span>
                  ) : (
                    <span className="text-zinc-400 font-mono text-[11px]">Synced</span>
                  )}
                </p>
              </div>

              {/* Stat 4: Strategy */}
              <div className="p-3 rounded-xl border vh-border bg-black/10 dark:bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-semibold vh-text-dim">Strategy</p>
                <p className="font-bold text-xs text-purple-400 truncate">
                  {parsedStats.strategy || (isPush ? "Direct Push" : "Fast-Forward")}
                </p>
              </div>
            </div>
          )}

          {/* Merge Conflict Intelligence Card */}
          {parsedStats.conflictedFiles.length > 0 && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-xs">
                  <AlertTriangle size={16} />
                  <span>
                    Merge Conflict in {parsedStats.conflictedFiles.length} file{parsedStats.conflictedFiles.length === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Manual Resolution Required
                </span>
              </div>

              <p className="text-[11.5px] leading-relaxed">
                Git could not automatically merge incoming edits. The following files contain conflict markers (<code className="font-mono text-rose-300">&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> and <code className="font-mono text-rose-300">&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>):
              </p>

              <div className="space-y-1.5">
                {parsedStats.conflictedFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-rose-500/20 font-mono text-xs"
                  >
                    <span className="text-rose-300 font-semibold truncate pr-2">{file}</span>
                    {onSelectConflictFile && (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectConflictFile(file);
                        }}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-[10.5px] font-sans font-semibold transition shrink-0"
                      >
                        Inspect Conflict in Diff →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Alert Banner */}
          {isRunning && (
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs flex items-center gap-3">
              <RefreshCw size={17} className="animate-spin shrink-0 text-sky-400" />
              <div>
                <p className="font-semibold text-sky-300">Executing {modalState.command || `git ${modalState.action}`}...</p>
                <p className="text-[11px] opacity-80">
                  Transmitting packets and handshaking with remote server.
                </p>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold">
                  {isPush ? "Git push completed successfully" : "Git pull completed successfully"}
                </p>
                <p className="text-[11px] opacity-80">
                  {isPush
                    ? `Pushed all local commits to ${modalState.remoteBranch}.`
                    : parsedStats.alreadyUpToDate
                    ? "Working tree is completely up-to-date with remote."
                    : `Updated local branch ${modalState.currentBranch} to remote state.`}
                </p>
              </div>
            </div>
          )}

          {isError && !parsedStats.conflictedFiles.length && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-400">
                <AlertCircle size={17} className="shrink-0" />
                <span>Git {modalState.action} failed with an error</span>
              </div>
              {diagnosticTip && (
                <div className="p-2.5 rounded-lg bg-black/20 border border-rose-500/20 text-[11.5px] leading-relaxed flex items-start gap-2">
                  <Info size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>{diagnosticTip}</span>
                </div>
              )}
            </div>
          )}

          {/* Terminal Command & Logs Viewer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs vh-text-dim">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Terminal size={13} />
                Terminal Execution Logs
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 text-[10px] font-mono hover:text-white px-2 py-0.5 rounded border vh-border bg-white/5 transition"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copied ? "Copied" : "Copy Logs"}</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/50 border vh-border font-mono text-xs space-y-1 overflow-x-auto max-h-48 selection:bg-sky-500/30">
              <p className="text-sky-400 font-bold">$ {modalState.command || `git ${modalState.action}`}</p>
              {modalState.stdout && (
                <pre className="text-slate-300 whitespace-pre-wrap">{modalState.stdout}</pre>
              )}
              {modalState.stderr && (
                <pre className="text-rose-400 whitespace-pre-wrap">{modalState.stderr}</pre>
              )}
              {!modalState.stdout && !modalState.stderr && isRunning && (
                <p className="text-slate-500 italic">Waiting for remote host stream response...</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t vh-border px-5 py-3.5 bg-black/5 dark:bg-white/5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] vh-text-dim font-mono">
            {durationStr ? `Completed in ${durationStr}` : isRunning ? "Processing..." : "Ready"}
          </div>

          <div className="flex items-center gap-2">
            {isError && isPush && onPullFirst && (
              <button
                onClick={() => {
                  onClose();
                  onPullFirst();
                }}
                className="px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <DownloadCloud size={13} />
                Pull Remote Changes First
              </button>
            )}

            <button
              disabled={isRunning}
              onClick={() => {
                playTone("click");
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold transition disabled:opacity-50"
            >
              {isRunning ? "Running..." : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
