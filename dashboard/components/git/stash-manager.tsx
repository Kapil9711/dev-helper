"use client";

import { useState } from "react";
import {
  Archive,
  Plus,
  Play,
  Trash2,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";
import { useGitStashQuery, useGitStashDiffQuery } from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { playTone } from "@/lib/prefrences";
import type { GitStashItem } from "@/types/git";

interface StashManagerProps {
  onRefreshWorkingTree: () => Promise<void>;
}

export function StashManager({ onRefreshWorkingTree }: StashManagerProps) {
  const { data, isLoading, refetch } = useGitStashQuery();
  const stashes = data?.stashes ?? [];

  const [stashMessage, setStashMessage] = useState("");
  const [isStashing, setIsStashing] = useState(false);
  const [activeActionRef, setActiveActionRef] = useState<string | null>(null);
  const [viewingDiffRef, setViewingDiffRef] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stashDiffQuery = useGitStashDiffQuery(viewingDiffRef || undefined);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    if (type === "success") playTone("success");
    else playTone("error");
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateStash = async () => {
    setIsStashing(true);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "stash",
        subAction: "push",
        message: stashMessage.trim() || undefined,
      });

      if (res.success) {
        setStashMessage("");
        showFeedback("success", "Working tree changes saved to stash");
        await Promise.all([refetch(), onRefreshWorkingTree()]);
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to stash changes");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setIsStashing(false);
    }
  };

  const handleApplyStash = async (stashRef: string) => {
    setActiveActionRef(stashRef);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "stash",
        subAction: "apply",
        stashRef,
      });

      if (res.success) {
        showFeedback("success", `Applied ${stashRef} to working tree`);
        await onRefreshWorkingTree();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to apply stash");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setActiveActionRef(null);
    }
  };

  const handlePopStash = async (stashRef: string) => {
    setActiveActionRef(stashRef);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "stash",
        subAction: "pop",
        stashRef,
      });

      if (res.success) {
        showFeedback("success", `Popped ${stashRef} into working tree`);
        if (viewingDiffRef === stashRef) setViewingDiffRef(null);
        await Promise.all([refetch(), onRefreshWorkingTree()]);
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to pop stash");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setActiveActionRef(null);
    }
  };

  const handleDropStash = async (stashRef: string) => {
    if (!window.confirm(`Permanently drop ${stashRef}? Stashed changes will be discarded.`)) {
      return;
    }
    setActiveActionRef(stashRef);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "stash",
        subAction: "drop",
        stashRef,
      });

      if (res.success) {
        showFeedback("success", `Dropped ${stashRef}`);
        if (viewingDiffRef === stashRef) setViewingDiffRef(null);
        await refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to drop stash");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setActiveActionRef(null);
    }
  };

  return (
    <div className="vh-bg-card border vh-border rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border pb-3">
        <div className="flex items-center gap-2">
          <Archive size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold vh-text-main">Stash Manager</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border vh-border vh-text-dim">
            {stashes.length} saved
          </span>
        </div>

        <button
          onClick={() => {
            playTone("click");
            void refetch();
          }}
          className="flex items-center gap-1 text-xs vh-text-dim hover:text-white transition"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-2.5 rounded-lg text-xs font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Create New Stash Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border vh-border bg-black/5 dark:bg-white/5">
        <input
          type="text"
          value={stashMessage}
          onChange={(e) => setStashMessage(e.target.value)}
          placeholder="Optional stash message (e.g. WIP: checkout flow)..."
          className="flex-1 rounded-lg border vh-border vh-bg-app px-3 py-1.5 text-xs vh-text-main focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreateStash();
          }}
        />
        <button
          disabled={isStashing}
          onClick={handleCreateStash}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold disabled:opacity-50 transition"
        >
          <Plus size={13} />
          {isStashing ? "Stashing..." : "Stash Working Tree"}
        </button>
      </div>

      {/* Stash List */}
      <div className="space-y-2.5">
        {stashes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border vh-border border-dashed rounded-xl">
            <Archive className="w-10 h-10 mb-2 vh-text-dim opacity-40" />
            <p className="text-xs font-semibold vh-text-main">No Stashes Saved</p>
            <p className="text-[11px] vh-text-dim max-w-sm mt-0.5">
              Stash your uncommitted working directory changes when switching branches or pausing a task.
            </p>
          </div>
        ) : (
          stashes.map((s) => {
            const isViewingDiff = viewingDiffRef === s.ref;
            const isBusy = activeActionRef === s.ref;

            return (
              <div
                key={s.ref}
                className="p-3 rounded-xl border vh-border bg-black/5 dark:bg-white/5 space-y-2 hover:border-amber-500/30 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                      {s.ref}
                    </span>
                    <span className="font-mono text-xs vh-text-main truncate" title={s.message}>
                      {s.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* View Diff */}
                    <button
                      onClick={() => {
                        playTone("click");
                        setViewingDiffRef(isViewingDiff ? null : s.ref);
                      }}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded border vh-border transition ${
                        isViewingDiff
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "hover:bg-white/10 vh-text-dim hover:text-white"
                      }`}
                    >
                      <FileCode size={12} />
                      {isViewingDiff ? "Hide Diff" : "Inspect"}
                    </button>

                    {/* Apply */}
                    <button
                      disabled={isBusy}
                      onClick={() => void handleApplyStash(s.ref)}
                      title="Apply stash changes without removing from stash list"
                      className="text-[11px] px-2.5 py-1 rounded border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition"
                    >
                      Apply
                    </button>

                    {/* Pop */}
                    <button
                      disabled={isBusy}
                      onClick={() => void handlePopStash(s.ref)}
                      title="Apply stash changes and remove from stash list"
                      className="text-[11px] px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition font-semibold"
                    >
                      Pop
                    </button>

                    {/* Drop */}
                    <button
                      disabled={isBusy}
                      onClick={() => void handleDropStash(s.ref)}
                      title="Permanently drop this stash"
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Stash Diff Viewer Drawer */}
                {isViewingDiff && (
                  <div className="pt-2 border-t vh-border space-y-1.5 animate-in fade-in duration-100">
                    <p className="font-mono text-[11px] text-amber-400 font-semibold">
                      Stash Diff: {s.ref}
                    </p>
                    {stashDiffQuery.isLoading ? (
                      <p className="text-xs vh-text-dim py-2 font-mono">Loading diff...</p>
                    ) : stashDiffQuery.data?.diff ? (
                      <pre className="p-3 rounded-lg bg-black/40 border vh-border font-mono text-[11px] overflow-x-auto max-h-60 whitespace-pre text-slate-300">
                        {stashDiffQuery.data.diff}
                      </pre>
                    ) : (
                      <p className="text-xs vh-text-dim py-1">No file changes recorded in stash.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
