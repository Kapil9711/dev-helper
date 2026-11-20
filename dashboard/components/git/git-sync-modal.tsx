"use client";

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
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export interface GitSyncModalState {
  isOpen: boolean;
  action: "push" | "pull";
  status: "running" | "success" | "error";
  currentBranch: string;
  remoteBranch: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
}

interface GitSyncModalProps {
  modalState: GitSyncModalState;
  onClose: () => void;
  onPullFirst?: () => void;
}

export function GitSyncModal({
  modalState,
  onClose,
  onPullFirst,
}: GitSyncModalProps) {
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

  // Diagnostic tips
  let diagnosticTip: string | null = null;
  const errOutput = (modalState.stderr || "") + " " + (modalState.stdout || "");

  if (isError) {
    if (errOutput.includes("rejected") || errOutput.includes("non-fast-forward")) {
      diagnosticTip =
        "The remote repository has commits that you do not have locally. Try pulling remote changes first before pushing.";
    } else if (errOutput.includes("CONFLICT") || errOutput.includes("conflict")) {
      diagnosticTip =
        "Merge conflicts occurred during pull. Please inspect the conflicting files in the diff viewer or editor to resolve them.";
    } else if (errOutput.includes("Could not resolve host") || errOutput.includes("Connection refused")) {
      diagnosticTip =
        "Network connection to the Git remote failed. Please verify your internet connection or git remote URL.";
    } else if (errOutput.includes("Permission denied") || errOutput.includes("Authentication failed")) {
      diagnosticTip =
        "Authentication failed with git remote. Please ensure your SSH key or git credentials are configured.";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="vh-bg-card border vh-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b vh-border px-5 py-4 bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isPush
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {isPush ? <UploadCloud size={20} /> : <DownloadCloud size={20} />}
            </div>

            <div>
              <h2 className="text-base font-bold vh-text-main">
                {isPush ? "Git Push" : "Git Pull"}
              </h2>
              <p className="text-xs vh-text-dim">
                {isPush ? "Sending local commits to remote tracking branch" : "Fetching and merging changes from remote"}
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
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Visual Branch Flow Diagram */}
          <div className="p-4 rounded-xl border vh-border bg-black/10 dark:bg-white/5 flex items-center justify-between gap-3 font-mono text-xs">
            {isPush ? (
              <>
                {/* Local Branch Source */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold vh-text-dim">Local Source</p>
                    <p className="font-bold text-sky-400 truncate">{modalState.currentBranch || "HEAD"}</p>
                  </div>
                </div>

                {/* Flow Direction Indicator */}
                <div className="flex flex-col items-center px-2">
                  <span className="text-[10px] uppercase tracking-wider font-sans vh-text-dim font-medium mb-1">
                    Pushing
                  </span>
                  <div className="flex items-center gap-1">
                    <div className={`h-0.5 w-8 rounded-full ${isRunning ? "bg-sky-400 animate-pulse" : "bg-white/20"}`} />
                    <ArrowRight size={14} className={isRunning ? "text-sky-400 animate-bounce" : "vh-text-dim"} />
                  </div>
                </div>

                {/* Remote Branch Destination */}
                <div className="flex items-center gap-2 min-w-0 text-right">
                  <div>
                    <p className="text-[10px] uppercase font-semibold vh-text-dim">Remote Destination</p>
                    <p className="font-bold text-emerald-400 truncate">{modalState.remoteBranch || "origin/main"}</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                </div>
              </>
            ) : (
              <>
                {/* Remote Branch Source */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold vh-text-dim">Remote Source</p>
                    <p className="font-bold text-emerald-400 truncate">{modalState.remoteBranch || "origin/main"}</p>
                  </div>
                </div>

                {/* Flow Direction Indicator */}
                <div className="flex flex-col items-center px-2">
                  <span className="text-[10px] uppercase tracking-wider font-sans vh-text-dim font-medium mb-1">
                    Pulling Into
                  </span>
                  <div className="flex items-center gap-1">
                    <div className={`h-0.5 w-8 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                    <ArrowRight size={14} className={isRunning ? "text-emerald-400 animate-bounce" : "vh-text-dim"} />
                  </div>
                </div>

                {/* Local Branch Destination */}
                <div className="flex items-center gap-2 min-w-0 text-right">
                  <div>
                    <p className="text-[10px] uppercase font-semibold vh-text-dim">Local Target</p>
                    <p className="font-bold text-sky-400 truncate">{modalState.currentBranch || "HEAD"}</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
                </div>
              </>
            )}
          </div>

          {/* Status Alert Banner */}
          {isRunning && (
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs flex items-center gap-3">
              <RefreshCw size={16} className="animate-spin shrink-0 text-sky-400" />
              <div>
                <p className="font-semibold">Executing git {modalState.action}...</p>
                <p className="text-[11px] opacity-80">Communicating with the remote repository.</p>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold">
                  {isPush ? "Push completed successfully" : "Pull completed successfully"}
                </p>
                <p className="text-[11px] opacity-80">
                  {isPush
                    ? `Transferred all local commits to ${modalState.remoteBranch}.`
                    : `Updated local branch ${modalState.currentBranch} to match remote.`}
                </p>
              </div>
            </div>
          )}

          {isError && (
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

          {/* Terminal Output Viewer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs vh-text-dim">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Terminal size={12} />
                Terminal Logs
              </span>
              {durationStr && (
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <Clock size={11} /> {durationStr}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-black/40 border vh-border font-mono text-xs space-y-1 overflow-x-auto max-h-48">
              <p className="text-sky-400 font-semibold">$ {modalState.command || `git ${modalState.action}`}</p>
              {modalState.stdout && (
                <pre className="text-slate-300 whitespace-pre-wrap">{modalState.stdout}</pre>
              )}
              {modalState.stderr && (
                <pre className="text-rose-400 whitespace-pre-wrap">{modalState.stderr}</pre>
              )}
              {!modalState.stdout && !modalState.stderr && isRunning && (
                <p className="text-slate-500 italic">Waiting for remote stream response...</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t vh-border px-5 py-3.5 bg-black/5 dark:bg-white/5 flex items-center justify-end gap-2.5">
          {isError && isPush && onPullFirst && (
            <button
              onClick={() => {
                onClose();
                onPullFirst();
              }}
              className="px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition"
            >
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
  );
}
