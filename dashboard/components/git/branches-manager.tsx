"use client";

import { useState, useMemo } from "react";
import {
  GitBranch,
  GitMerge,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  RefreshCw,
  GitFork,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useGitBranchesQuery } from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { playTone } from "@/lib/prefrences";
import type { GitBranchItem } from "@/types/git";

interface BranchesManagerProps {
  currentBranchName?: string;
  onRefreshAll: () => Promise<void>;
}

export function BranchesManager({
  currentBranchName,
  onRefreshAll,
}: BranchesManagerProps) {
  const { data, isLoading, refetch } = useGitBranchesQuery();
  const branches = data?.branches ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [busyBranchName, setBusyBranchName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    if (type === "success") playTone("success");
    else playTone("error");
    setTimeout(() => setFeedback(null), 5000);
  };

  const filteredBranches = useMemo(() => {
    if (!searchTerm.trim()) return branches;
    const q = searchTerm.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, searchTerm]);

  const handleCreateBranch = async () => {
    const trimmed = newBranchName.trim();
    if (!trimmed) {
      showFeedback("error", "Branch name is required");
      return;
    }

    setIsCreating(true);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "create-branch",
        branch: trimmed,
      });

      if (res.success) {
        setNewBranchName("");
        showFeedback("success", `Created and checked out "${trimmed}"`);
        await onRefreshAll();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to create branch");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCheckout = async (branchName: string) => {
    setBusyBranchName(branchName);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "checkout",
        branch: branchName,
      });

      if (res.success) {
        showFeedback("success", `Switched to "${branchName}"`);
        await onRefreshAll();
      } else {
        showFeedback("error", res.stderr || res.error || "Checkout failed");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setBusyBranchName(null);
    }
  };

  const handleMerge = async (branchName: string) => {
    if (
      !window.confirm(
        `Merge branch "${branchName}" into current branch "${currentBranchName || "HEAD"}"?`,
      )
    ) {
      return;
    }

    setBusyBranchName(branchName);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "merge",
        branch: branchName,
      });

      if (res.success) {
        showFeedback("success", `Merged "${branchName}" into current branch`);
        await onRefreshAll();
      } else {
        showFeedback(
          "error",
          res.stderr || res.error || "Merge failed (check for conflicts)",
        );
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setBusyBranchName(null);
    }
  };

  const handleDelete = async (branchName: string) => {
    if (
      !window.confirm(
        `Delete branch "${branchName}"? This branch will be removed locally.`,
      )
    ) {
      return;
    }

    setBusyBranchName(branchName);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({
        action: "delete-branch",
        branch: branchName,
      });

      if (res.success) {
        showFeedback("success", `Deleted branch "${branchName}"`);
        await refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to delete branch");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setBusyBranchName(null);
    }
  };

  return (
    <div className="vh-bg-card border vh-border rounded-xl p-4 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border pb-3">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold vh-text-main">Branches & Merge</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border vh-border vh-text-dim">
            {branches.length} branches
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 vh-text-dim" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search branches..."
              className="w-full rounded-lg border vh-border vh-bg-app pl-7 pr-3 py-1.5 text-xs vh-text-main focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              playTone("click");
              void refetch();
            }}
            className="p-1.5 rounded-lg border vh-border vh-text-dim hover:text-white hover:bg-white/5 transition"
            title="Refresh branches"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
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

      {/* Create New Branch Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border vh-border bg-black/5 dark:bg-white/5">
        <input
          type="text"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          placeholder="New branch name (e.g. feature/auth-v2)..."
          className="flex-1 rounded-lg border vh-border vh-bg-app px-3 py-1.5 text-xs font-mono vh-text-main focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreateBranch();
          }}
        />
        <button
          disabled={isCreating || !newBranchName.trim()}
          onClick={handleCreateBranch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold disabled:opacity-50 transition"
        >
          <Plus size={13} />
          {isCreating ? "Creating..." : "Create & Checkout"}
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredBranches.map((b) => {
          const isCurrent = b.current || b.name === currentBranchName;
          const isBusy = busyBranchName === b.name;

          return (
            <div
              key={b.name}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-3 transition ${
                isCurrent
                  ? "border-sky-500/40 bg-sky-500/10 shadow-sm"
                  : "vh-border bg-black/5 dark:bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <GitBranch
                    size={15}
                    className={
                      isCurrent
                        ? "text-sky-400 shrink-0"
                        : b.remote
                        ? "text-purple-400 shrink-0"
                        : "vh-text-dim shrink-0"
                    }
                  />
                  <div className="min-w-0">
                    <p
                      className="font-mono text-xs font-bold vh-text-main truncate"
                      title={b.name}
                    >
                      {b.name}
                    </p>
                    <p className="text-[10px] vh-text-dim">
                      {b.remote ? "Remote tracking ref" : "Local branch"}
                    </p>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                    Active
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-1.5 pt-2 border-t vh-border">
                {isCurrent ? (
                  <span className="text-[11px] vh-text-dim italic">Current working branch</span>
                ) : (
                  <>
                    <button
                      disabled={isBusy}
                      onClick={() => void handleCheckout(b.name)}
                      className="text-xs px-2.5 py-1 rounded-lg border vh-border bg-white/5 hover:bg-white/10 vh-text-main transition font-medium"
                    >
                      Checkout
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => void handleMerge(b.name)}
                      title={`Merge "${b.name}" into "${currentBranchName || "HEAD"}"`}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition"
                    >
                      <GitMerge size={12} />
                      Merge
                    </button>

                    {!b.remote && (
                      <button
                        disabled={isBusy}
                        onClick={() => void handleDelete(b.name)}
                        title={`Delete branch "${b.name}"`}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
