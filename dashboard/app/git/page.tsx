"use client";

import { useState, useMemo } from "react";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  FileCode,
  FolderGit2,
  CheckCircle2,
  Send,
  UploadCloud,
  DownloadCloud,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  useGitStatusQuery,
  useGitDiffQuery,
  useGitLogQuery,
  useGitBranchesQuery,
} from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import { DiffViewer } from "@/components/git/diff-viewer";
import { CommitHistory } from "@/components/git/commit-history";
import type { GitChangedFile, GitBranchItem } from "@/types/git";

export default function GitDashboardPage() {
  const { preferences } = useDashboardPreferences();

  // Selected file for diff view
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedStaged, setSelectedStaged] = useState<boolean>(false);

  // Active view tab in main area: "diff" | "log" | "branches"
  const [activeTab, setActiveTab] = useState<"diff" | "log" | "branches">("diff");

  // Commit form
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Queries
  const statusQuery = useGitStatusQuery();
  const diffQuery = useGitDiffQuery(selectedFile || undefined, selectedStaged);
  const logQuery = useGitLogQuery(35);
  const branchesQuery = useGitBranchesQuery();

  const status = statusQuery.data;
  const isRepo = status?.isRepo ?? false;
  const currentBranch = status?.currentBranch;
  const files = status?.files ?? [];

  // Partition staged vs unstaged files
  const stagedFiles = useMemo(() => {
    return files.filter(
      (f) => f.indexStatus !== " " && f.indexStatus !== "?" && f.indexStatus !== "",
    );
  }, [files]);

  const unstagedFiles = useMemo(() => {
    return files.filter(
      (f) =>
        f.workingTreeStatus !== " " &&
        f.workingTreeStatus !== "" ||
        f.kind === "untracked",
    );
  }, [files]);

  // Conventional commit presets
  const commitPresets = [
    { label: "feat", prefix: "feat: " },
    { label: "fix", prefix: "fix: " },
    { label: "refactor", prefix: "refactor: " },
    { label: "chore", prefix: "chore: " },
    { label: "docs", prefix: "docs: " },
    { label: "test", prefix: "test: " },
  ];

  const showFeedback = (type: "success" | "error", text: string) => {
    setActionFeedback({ type, text });
    if (type === "success") playTone("success");
    else playTone("error");
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const refreshAll = async () => {
    playTone("click");
    await Promise.all([
      statusQuery.refetch(),
      diffQuery.refetch(),
      logQuery.refetch(),
      branchesQuery.refetch(),
    ]);
  };

  // Actions
  const handleStageFile = async (filePath: string) => {
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "stage",
        files: [filePath],
      });
      if (res.success) {
        await statusQuery.refetch();
        await diffQuery.refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to stage file");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "unstage",
        files: [filePath],
      });
      if (res.success) {
        await statusQuery.refetch();
        await diffQuery.refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to unstage file");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  const handleStageAll = async () => {
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "stage",
        files: ["."],
      });
      if (res.success) {
        showFeedback("success", "All changes staged");
        await statusQuery.refetch();
        await diffQuery.refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to stage changes");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  const handleUnstageAll = async () => {
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "unstage",
        files: ["."],
      });
      if (res.success) {
        showFeedback("success", "All changes unstaged");
        await statusQuery.refetch();
        await diffQuery.refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to unstage changes");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  const handleDiscardFile = async (filePath: string) => {
    if (!window.confirm(`Discard all changes in "${filePath}"? This action cannot be undone.`)) {
      return;
    }
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "discard",
        file: filePath,
      });
      if (res.success) {
        showFeedback("success", `Changes discarded in ${filePath}`);
        if (selectedFile === filePath) setSelectedFile(null);
        await statusQuery.refetch();
        await diffQuery.refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to discard file");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  const handleCommit = async (shouldPush = false) => {
    const trimmed = commitMessage.trim();
    if (!trimmed) {
      showFeedback("error", "Please enter a commit message");
      return;
    }

    if (stagedFiles.length === 0) {
      showFeedback("error", "No staged changes to commit. Stage some files first.");
      return;
    }

    setIsCommitting(true);
    try {
      const res = await apiClient.executeGitAction({
        action: "commit",
        message: trimmed,
      });

      if (!res.success) {
        showFeedback("error", res.stderr || res.error || "Commit failed");
        setIsCommitting(false);
        return;
      }

      setCommitMessage("");
      showFeedback("success", `Committed: "${trimmed}"`);

      if (shouldPush) {
        setIsPushing(true);
        const pushRes = await apiClient.executeGitAction({ action: "push" });
        setIsPushing(false);
        if (pushRes.success) {
          showFeedback("success", "Committed and pushed to remote");
        } else {
          showFeedback("error", `Committed, but push failed: ${pushRes.stderr || pushRes.error}`);
        }
      }

      await Promise.all([
        statusQuery.refetch(),
        diffQuery.refetch(),
        logQuery.refetch(),
      ]);
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handlePush = async () => {
    setIsPushing(true);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({ action: "push" });
      if (res.success) {
        showFeedback("success", "Pushed changes to remote successfully");
        await statusQuery.refetch();
        await logQuery.refetch();
      } else {
        showFeedback("error", res.stderr || res.error || "Push failed");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({ action: "pull" });
      if (res.success) {
        showFeedback("success", "Pulled latest changes from remote");
        await Promise.all([
          statusQuery.refetch(),
          diffQuery.refetch(),
          logQuery.refetch(),
        ]);
      } else {
        showFeedback("error", res.stderr || res.error || "Pull failed");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setIsPulling(false);
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "checkout",
        branch: branchName,
      });
      if (res.success) {
        showFeedback("success", `Switched to branch "${branchName}"`);
        await Promise.all([
          statusQuery.refetch(),
          branchesQuery.refetch(),
          logQuery.refetch(),
          diffQuery.refetch(),
        ]);
      } else {
        showFeedback("error", res.stderr || res.error || "Checkout failed");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  if (!isRepo && !statusQuery.isLoading) {
    return (
      <main className="min-h-full flex items-center justify-center p-6 vh-bg-app vh-text-main">
        <div className="max-w-md w-full text-center p-8 vh-bg-card border vh-border rounded-2xl shadow-lg space-y-4">
          <FolderGit2 className="w-16 h-16 mx-auto text-amber-400 opacity-80" />
          <h2 className="text-xl font-bold">Not a Git Repository</h2>
          <p className="text-xs vh-text-dim">
            The dev-helper server was launched in a directory that is not managed by Git. Initialize a git repository with <code className="text-sky-400 font-mono">git init</code> or launch from your project root.
          </p>
          <button
            onClick={refreshAll}
            className="px-4 py-2 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold"
          >
            Retry Check
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full space-y-5 vh-bg-app p-5 vh-text-main md:p-7">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b vh-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Git Dashboard</h1>

            {/* Current Branch Pill */}
            {currentBranch && (
              <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-mono font-semibold text-sky-400">
                <GitBranch size={13} />
                <span>{currentBranch.current || "HEAD"}</span>
                {currentBranch.upstream && (
                  <span className="text-[10px] opacity-75 font-normal">
                    → {currentBranch.upstream}
                  </span>
                )}
              </div>
            )}

            {/* Ahead / Behind Counts */}
            {currentBranch && (currentBranch.ahead > 0 || currentBranch.behind > 0) && (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {currentBranch.ahead > 0 && (
                  <span className="flex items-center gap-0.5 rounded px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ArrowUp size={11} />
                    {currentBranch.ahead} ahead
                  </span>
                )}
                {currentBranch.behind > 0 && (
                  <span className="flex items-center gap-0.5 rounded px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ArrowDown size={11} />
                    {currentBranch.behind} behind
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs vh-text-dim">
            Repository: <span className="font-mono text-sky-300">{status?.repoRoot || "..."}</span>
          </p>
        </div>

        {/* Global Git Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isPulling}
            onClick={handlePull}
            title="Pull latest changes from remote tracking branch"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border vh-border text-xs font-medium hover:bg-white/5 transition"
          >
            <DownloadCloud size={13} className={isPulling ? "animate-bounce" : ""} />
            {isPulling ? "Pulling..." : "Pull"}
          </button>

          <button
            disabled={isPushing}
            onClick={handlePush}
            title="Push local commits to remote"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition"
          >
            <UploadCloud size={13} className={isPushing ? "animate-bounce" : ""} />
            {isPushing ? "Pushing..." : "Push"}
          </button>

          <button
            onClick={refreshAll}
            title="Refresh working tree & commit graph"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border vh-border text-xs font-medium hover:bg-white/5 transition"
          >
            <RefreshCw
              size={13}
              className={statusQuery.isFetching ? "animate-spin" : ""}
            />
            Sync
          </button>
        </div>
      </header>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition animate-in fade-in duration-150 ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <AlertCircle size={15} className="shrink-0" />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Working Tree & Commit Box (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Staged Changes Card */}
          <div className="vh-bg-card border vh-border rounded-xl p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold vh-text-main">Staged Changes</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {stagedFiles.length}
                </span>
              </div>
              {stagedFiles.length > 0 && (
                <button
                  onClick={handleUnstageAll}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Unstage All
                </button>
              )}
            </div>

            {stagedFiles.length === 0 ? (
              <p className="text-[11.5px] vh-text-dim py-3 text-center">No staged changes.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {stagedFiles.map((file) => {
                  const isSelected = selectedFile === file.path && selectedStaged;

                  return (
                    <div
                      key={file.path}
                      onClick={() => {
                        setSelectedFile(file.path);
                        setSelectedStaged(true);
                        setActiveTab("diff");
                        playTone("click");
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition cursor-pointer select-none group ${
                        isSelected
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                          {file.indexStatus || "A"}
                        </span>
                        <span className="truncate" title={file.path}>
                          {file.path}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleUnstageFile(file.path);
                        }}
                        title="Unstage this file"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-amber-400 transition"
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unstaged Changes Card */}
          <div className="vh-bg-card border vh-border rounded-xl p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold vh-text-main">Working Tree Changes</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/5 border vh-border vh-text-dim">
                  {unstagedFiles.length}
                </span>
              </div>
              {unstagedFiles.length > 0 && (
                <button
                  onClick={handleStageAll}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Stage All
                </button>
              )}
            </div>

            {unstagedFiles.length === 0 ? (
              <p className="text-[11.5px] vh-text-dim py-3 text-center">Working tree clean.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {unstagedFiles.map((file) => {
                  const isSelected = selectedFile === file.path && !selectedStaged;

                  return (
                    <div
                      key={file.path}
                      onClick={() => {
                        setSelectedFile(file.path);
                        setSelectedStaged(false);
                        setActiveTab("diff");
                        playTone("click");
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition cursor-pointer select-none group ${
                        isSelected
                          ? "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                            file.kind === "untracked"
                              ? "bg-slate-500/20 text-slate-300"
                              : file.kind === "deleted"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {file.kind === "untracked" ? "?" : file.workingTreeStatus || "M"}
                        </span>
                        <span className="truncate" title={file.path}>
                          {file.path}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleStageFile(file.path);
                          }}
                          title="Stage this file"
                          className="p-1 rounded hover:bg-white/10 text-emerald-400 transition"
                        >
                          <Plus size={12} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDiscardFile(file.path);
                          }}
                          title="Discard changes in this file"
                          className="p-1 rounded hover:bg-white/10 text-rose-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Commit Composer Card */}
          <div className="vh-bg-card border vh-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold vh-text-main flex items-center gap-1.5">
                <GitCommit size={14} className="text-sky-400" />
                Commit Staged Changes
              </span>
              <span className="text-[11px] vh-text-dim">
                {stagedFiles.length} file{stagedFiles.length === 1 ? "" : "s"} staged
              </span>
            </div>

            {/* Conventional Commit Presets */}
            <div className="flex flex-wrap gap-1">
              {commitPresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    playTone("click");
                    if (commitMessage.startsWith(p.prefix)) return;
                    setCommitMessage((prev) => `${p.prefix}${prev.replace(/^[a-z]+:\s*/, "")}`);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border vh-border bg-white/5 hover:bg-white/10 vh-text-muted hover:text-white transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit summary or description..."
              className="w-full rounded-lg border vh-border vh-bg-app p-2.5 text-xs font-mono vh-text-main focus:outline-none focus:border-sky-500 transition resize-none"
            />

            <div className="flex items-center gap-2">
              <button
                disabled={isCommitting || stagedFiles.length === 0 || !commitMessage.trim()}
                onClick={() => handleCommit(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold disabled:opacity-40 transition shadow-sm"
              >
                <GitCommit size={13} className={isCommitting ? "animate-spin" : ""} />
                {isCommitting ? "Committing..." : "Commit"}
              </button>

              <button
                disabled={isCommitting || isPushing || stagedFiles.length === 0 || !commitMessage.trim()}
                onClick={() => handleCommit(true)}
                title="Commit and immediately push to remote"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold disabled:opacity-40 transition"
              >
                <UploadCloud size={13} />
                Commit & Push
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Main Workspace Tabs (7 or 8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Main View Tabs */}
          <div className="flex items-center justify-between border-b vh-border pb-2.5">
            <div className="flex items-center gap-1">
              {[
                { id: "diff", label: "Diff Viewer", icon: FileCode },
                { id: "log", label: "Commit History", icon: GitCommit },
                { id: "branches", label: "Branches", icon: GitBranch },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      playTone("click");
                      setActiveTab(tab.id as typeof activeTab);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? "vh-bg-accent vh-text-accent border vh-border-accent shadow-sm"
                        : "vh-text-dim hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === "diff" && selectedFile && (
              <button
                onClick={() => {
                  setSelectedFile(null);
                  playTone("click");
                }}
                className="text-[11px] vh-text-dim hover:text-white"
              >
                Clear File Selection
              </button>
            )}
          </div>

          {/* Tab 1: Diff Viewer */}
          {activeTab === "diff" && (
            <DiffViewer
              diff={diffQuery.data?.diff ?? ""}
              filePath={selectedFile}
              staged={selectedStaged}
              onStageToggle={() => {
                if (!selectedFile) return;
                if (selectedStaged) void handleUnstageFile(selectedFile);
                else void handleStageFile(selectedFile);
              }}
              onDiscard={() => {
                if (selectedFile) void handleDiscardFile(selectedFile);
              }}
              isActionLoading={diffQuery.isFetching}
            />
          )}

          {/* Tab 2: Commit History */}
          {activeTab === "log" && (
            <CommitHistory commits={logQuery.data?.commits ?? []} />
          )}

          {/* Tab 3: Branches */}
          {activeTab === "branches" && (
            <div className="vh-bg-card border vh-border rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch size={16} className="text-sky-400" />
                  <h2 className="text-sm font-semibold vh-text-main">Repository Branches</h2>
                </div>
                <span className="text-xs vh-text-dim">
                  {branchesQuery.data?.branches.length ?? 0} total branches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[600px] overflow-y-auto">
                {branchesQuery.data?.branches.map((b) => (
                  <div
                    key={b.name}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      b.current
                        ? "border-sky-500/40 bg-sky-500/10"
                        : "vh-border bg-black/5 dark:bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <GitBranch
                        size={14}
                        className={b.current ? "text-sky-400 shrink-0" : "vh-text-dim shrink-0"}
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold vh-text-main truncate">
                          {b.name}
                        </p>
                        <p className="text-[10px] vh-text-dim">
                          {b.remote ? "Remote tracking" : "Local branch"}
                        </p>
                      </div>
                    </div>

                    {b.current ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => void handleCheckoutBranch(b.name)}
                        className="text-xs px-2.5 py-1 rounded-lg border vh-border bg-white/5 hover:bg-white/10 vh-text-main transition"
                      >
                        Checkout
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
