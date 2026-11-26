"use client";

import { useState, useEffect, useMemo } from "react";
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
  UploadCloud,
  DownloadCloud,
  Layers,
  ChevronDown,
  Archive,
  Undo2,
  GitMerge,
  Maximize2,
  Settings,
  Code2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGitStatusQuery,
  useGitDiffQuery,
  useGitLogQuery,
  useGitBranchesQuery,
  useGitStashQuery,
  useGitConfigQuery,
  queryKeys,
} from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import { DiffViewer } from "@/components/git/diff-viewer";
import { CommitHistory } from "@/components/git/commit-history";
import { StashManager } from "@/components/git/stash-manager";
import { BranchesManager } from "@/components/git/branches-manager";
import { LiveFileEditor } from "@/components/git/live-file-editor";
import { GitSettings } from "@/components/git/git-settings";
import { GitSyncModal, GitSyncModalState } from "@/components/git/git-sync-modal";
import type { GitChangedFile, GitBranchItem } from "@/types/git";

export default function GitDashboardPage() {
  const { preferences } = useDashboardPreferences();
  const queryClient = useQueryClient();

  // Selected file for diff view
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedStaged, setSelectedStaged] = useState<boolean>(false);

  // Active view tab in full-width main area: "diff" | "editor" | "log" | "stash" | "branches" | "settings"
  const [activeTab, setActiveTab] = useState<
    "diff" | "editor" | "log" | "stash" | "branches" | "settings"
  >("diff");

  // Sync tab with URL search parameter & custom tab change events from sidebar
  useEffect(() => {
    const syncTab = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (
        tab &&
        ["diff", "editor", "log", "stash", "branches", "settings"].includes(tab)
      ) {
        setActiveTab(tab as typeof activeTab);
      }
    };

    syncTab();

    const handleCustomTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (
        detail &&
        ["diff", "editor", "log", "stash", "branches", "settings"].includes(detail)
      ) {
        setActiveTab(detail as typeof activeTab);
      }
    };

    window.addEventListener("vh-git-tab-change", handleCustomTab);
    window.addEventListener("popstate", syncTab);

    return () => {
      window.removeEventListener("vh-git-tab-change", handleCustomTab);
      window.removeEventListener("popstate", syncTab);
    };
  }, []);

  // Commit form
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Pull from different branch state
  const [isPullMenuOpen, setIsPullMenuOpen] = useState(false);
  const [pullSearchTerm, setPullSearchTerm] = useState("");
  const [customPullBranch, setCustomPullBranch] = useState("");

  // Push / Pull Detailed Modal State
  const [syncModal, setSyncModal] = useState<GitSyncModalState>({
    isOpen: false,
    action: "push",
    status: "running",
    currentBranch: "",
    remoteBranch: "",
  });

  // Queries
  const statusQuery = useGitStatusQuery();
  const diffQuery = useGitDiffQuery(selectedFile || undefined, selectedStaged);
  const logQuery = useGitLogQuery(50);
  const branchesQuery = useGitBranchesQuery();
  const stashQuery = useGitStashQuery();
  const configQuery = useGitConfigQuery();

  const status = statusQuery.data;
  const isRepo = status?.isRepo ?? false;
  const currentBranch = status?.currentBranch;
  const files = status?.files ?? [];

  // Partition staged vs unstaged files with correct property workTreeStatus
  const stagedFiles = useMemo(() => {
    return files.filter(
      (f) =>
        f.indexStatus !== null &&
        f.indexStatus !== undefined &&
        f.indexStatus !== "" &&
        f.indexStatus !== " " &&
        f.indexStatus !== "?",
    );
  }, [files]);

  const unstagedFiles = useMemo(() => {
    return files.filter(
      (f) =>
        (f.workTreeStatus !== null &&
          f.workTreeStatus !== undefined &&
          f.workTreeStatus !== "" &&
          f.workTreeStatus !== " ") ||
        f.kind === "untracked" ||
        f.kind === "conflict",
    );
  }, [files]);

  // List of branches available for pulling (remote tracking and local)
  const selectableBranches = useMemo(() => {
    const list = branchesQuery.data?.branches ?? [];
    return list.filter((b) => b.name !== currentBranch?.current);
  }, [branchesQuery.data?.branches, currentBranch?.current]);

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

  const refetchGitState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gitStatus }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gitBranches }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gitStash }),
      queryClient.invalidateQueries({ queryKey: ["git-diff"] }),
      queryClient.invalidateQueries({ queryKey: ["git-log"] }),
      statusQuery.refetch(),
      diffQuery.refetch(),
      logQuery.refetch(),
      branchesQuery.refetch(),
      stashQuery.refetch(),
    ]);
  };

  // Stage / Unstage Actions
  const handleStageFile = async (filePath: string) => {
    try {
      playTone("click");
      const res = await apiClient.executeGitAction({
        action: "stage",
        files: [filePath],
      });
      if (res.success) {
        await refetchGitState();
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
        await refetchGitState();
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
        await refetchGitState();
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
        await refetchGitState();
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
        await refetchGitState();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to discard file");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  // Push Action
  const handlePush = async () => {
    const branch = currentBranch?.current || "HEAD";
    const remote = currentBranch?.upstream || "origin/" + branch;
    const ahead = currentBranch?.ahead ?? 0;
    const behind = currentBranch?.behind ?? 0;
    const commits = logQuery.data?.commits ?? [];
    const pending = ahead > 0 ? commits.slice(0, ahead) : [];
    const remoteUrl = configQuery.data?.remoteUrl || "";

    setSyncModal({
      isOpen: true,
      action: "push",
      status: "running",
      currentBranch: branch,
      remoteBranch: remote,
      remoteUrl,
      aheadCount: ahead,
      behindCount: behind,
      pendingCommits: pending.map((c) => ({
        hash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author,
        time: c.date,
      })),
      command: `git push`,
    });

    const startTime = Date.now();
    try {
      const res = await apiClient.executeGitAction({ action: "push" });
      const durationMs = Date.now() - startTime;

      if (res.success) {
        setSyncModal({
          isOpen: true,
          action: "push",
          status: "success",
          currentBranch: branch,
          remoteBranch: remote,
          remoteUrl,
          aheadCount: ahead,
          behindCount: behind,
          pendingCommits: pending.map((c) => ({
            hash: c.hash.slice(0, 7),
            message: c.message,
            author: c.author,
            time: c.date,
          })),
          command: res.command || `git push`,
          stdout: res.stdout || "Everything up-to-date",
          stderr: res.stderr,
          durationMs: res.durationMs || durationMs,
        });
        playTone("success");
        await refetchGitState();
      } else {
        setSyncModal({
          isOpen: true,
          action: "push",
          status: "error",
          currentBranch: branch,
          remoteBranch: remote,
          remoteUrl,
          aheadCount: ahead,
          behindCount: behind,
          pendingCommits: pending.map((c) => ({
            hash: c.hash.slice(0, 7),
            message: c.message,
            author: c.author,
            time: c.date,
          })),
          command: res.command || `git push`,
          stdout: res.stdout,
          stderr: res.stderr || res.error || "Push rejected by remote host",
          durationMs: res.durationMs || durationMs,
        });
        playTone("error");
      }
    } catch (err: unknown) {
      setSyncModal({
        isOpen: true,
        action: "push",
        status: "error",
        currentBranch: branch,
        remoteBranch: remote,
        remoteUrl,
        aheadCount: ahead,
        behindCount: behind,
        command: `git push`,
        stderr: (err as Error).message,
        durationMs: Date.now() - startTime,
      });
      playTone("error");
    }
  };

  // Pull Action (with optional targetBranch)
  const handlePull = async (targetBranch?: string) => {
    const branch = currentBranch?.current || "HEAD";
    const remote = targetBranch || currentBranch?.upstream || "origin/" + branch;
    const ahead = currentBranch?.ahead ?? 0;
    const behind = currentBranch?.behind ?? 0;
    const remoteUrl = configQuery.data?.remoteUrl || "";
    const pullCmd = targetBranch ? `git pull origin ${targetBranch}` : "git pull";

    setSyncModal({
      isOpen: true,
      action: "pull",
      status: "running",
      currentBranch: branch,
      remoteBranch: remote,
      remoteUrl,
      aheadCount: ahead,
      behindCount: behind,
      command: pullCmd,
    });

    const startTime = Date.now();
    try {
      const res = await apiClient.executeGitAction({
        action: "pull",
        branch: targetBranch,
      });
      const durationMs = Date.now() - startTime;

      if (res.success) {
        setSyncModal({
          isOpen: true,
          action: "pull",
          status: "success",
          currentBranch: branch,
          remoteBranch: remote,
          remoteUrl,
          aheadCount: ahead,
          behindCount: behind,
          command: res.command || pullCmd,
          stdout: res.stdout || "Already up to date.",
          stderr: res.stderr,
          durationMs: res.durationMs || durationMs,
        });
        playTone("success");
        await refetchGitState();
      } else {
        setSyncModal({
          isOpen: true,
          action: "pull",
          status: "error",
          currentBranch: branch,
          remoteBranch: remote,
          remoteUrl,
          aheadCount: ahead,
          behindCount: behind,
          command: res.command || pullCmd,
          stdout: res.stdout,
          stderr: res.stderr || res.error || "Pull failed",
          durationMs: res.durationMs || durationMs,
        });
        playTone("error");
      }
    } catch (err: unknown) {
      setSyncModal({
        isOpen: true,
        action: "pull",
        status: "error",
        currentBranch: branch,
        remoteBranch: remote,
        remoteUrl,
        aheadCount: ahead,
        behindCount: behind,
        command: pullCmd,
        stderr: (err as Error).message,
        durationMs: Date.now() - startTime,
      });
      playTone("error");
    }
  };

  // Fetch & Prune Action
  const handleFetchPrune = async () => {
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({ action: "fetch" });
      if (res.success) {
        showFeedback("success", "Remote tracking references pruned & updated");
        await refetchGitState();
      } else {
        showFeedback("error", res.stderr || res.error || "Fetch failed");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  // Undo Last Commit (Soft Reset)
  const handleUndoLastCommit = async () => {
    if (
      !window.confirm(
        "Undo last commit (git reset --soft HEAD~1)? Your changes will be preserved in staged state.",
      )
    ) {
      return;
    }
    playTone("click");
    try {
      const res = await apiClient.executeGitAction({ action: "undo-commit" });
      if (res.success) {
        showFeedback("success", "Last commit undone. Changes are now staged.");
        await refetchGitState();
      } else {
        showFeedback("error", res.stderr || res.error || "Failed to undo commit");
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    }
  };

  // Commit & Optional Push
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
      await refetchGitState();

      if (shouldPush) {
        void handlePush();
      }
    } catch (err: unknown) {
      showFeedback("error", (err as Error).message);
    } finally {
      setIsCommitting(false);
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
            onClick={refetchGitState}
            className="px-4 py-2 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold"
          >
            Retry Check
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full space-y-4 vh-bg-app p-4 sm:p-6 vh-text-main">
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
            Repository: <span className="font-mono text-sky-700 dark:text-sky-300 font-bold">{status?.repoRoot || "..."}</span>
          </p>
        </div>

        {/* Global Git Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Split Pull Button with Branch Dropdown */}
          <div className="relative">
            <div className="flex items-center rounded-lg border vh-border overflow-hidden bg-black/5 dark:bg-white/5">
              <button
                onClick={() => {
                  setIsPullMenuOpen(false);
                  void handlePull();
                }}
                title={`Pull latest changes from tracking branch (${currentBranch?.upstream || "origin/" + (currentBranch?.current || "HEAD")})`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <DownloadCloud size={13} />
                <span>Pull</span>
              </button>

              <button
                onClick={() => {
                  playTone("click");
                  setIsPullMenuOpen((prev) => !prev);
                }}
                title="Pull from a different branch..."
                className="px-2 py-1.5 border-l vh-border text-xs hover:bg-black/5 dark:hover:bg-white/10 vh-text-dim hover:text-slate-900 dark:hover:text-white transition"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-150 ${isPullMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Pull from Different Branch Dropdown Menu */}
            {isPullMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border vh-border vh-bg-card shadow-2xl p-3 z-30 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-1.5 border-b vh-border">
                  <div className="flex items-center gap-1.5">
                    <DownloadCloud size={13} className="text-emerald-400" />
                    <span className="text-xs font-bold vh-text-main">Pull from Branch</span>
                  </div>
                  <span className="text-[10px] vh-text-dim font-mono">
                    into {currentBranch?.current || "HEAD"}
                  </span>
                </div>

                {/* Default tracking branch quick-action */}
                <button
                  onClick={() => {
                    setIsPullMenuOpen(false);
                    void handlePull();
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition flex items-center justify-between font-mono"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <GitBranch size={11} className="text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Default: {currentBranch?.upstream || `origin/${currentBranch?.current || "main"}`}
                    </span>
                  </div>
                  <span className="text-[9.5px] uppercase font-sans font-semibold text-emerald-400 shrink-0">
                    Tracking
                  </span>
                </button>

                {/* Search branch filter */}
                <input
                  type="text"
                  value={pullSearchTerm}
                  onChange={(e) => setPullSearchTerm(e.target.value)}
                  placeholder="Filter available branches to pull..."
                  className="w-full rounded-lg border vh-border vh-bg-app p-1.5 text-xs vh-text-main focus:outline-none"
                />

                {/* Available branch list */}
                <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1 font-mono text-[11px]">
                  {selectableBranches.length === 0 ? (
                    <p className="text-[11px] vh-text-dim py-2 text-center font-sans">
                      No other branches found.
                    </p>
                  ) : (
                    selectableBranches
                      .filter((b) =>
                        b.name.toLowerCase().includes(pullSearchTerm.toLowerCase()),
                      )
                      .map((b) => (
                        <button
                          key={b.name}
                          onClick={() => {
                            setIsPullMenuOpen(false);
                            void handlePull(b.name);
                          }}
                          className="w-full text-left p-1.5 rounded-md hover:bg-white/10 vh-text-main transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <GitBranch
                              size={11}
                              className={b.remote ? "text-purple-400 shrink-0" : "text-sky-400 shrink-0"}
                            />
                            <span className="truncate text-sky-400 group-hover:underline">
                              {b.name}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-sans text-emerald-400 opacity-0 group-hover:opacity-100 transition">
                            Pull →
                          </span>
                        </button>
                      ))
                  )}
                </div>

                {/* Custom branch input */}
                <div className="pt-2 border-t vh-border flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customPullBranch}
                    onChange={(e) => setCustomPullBranch(e.target.value)}
                    placeholder="Other branch name (e.g. main)..."
                    className="flex-1 rounded-lg border vh-border vh-bg-app px-2 py-1 text-[11px] font-mono vh-text-main focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customPullBranch.trim()) {
                        setIsPullMenuOpen(false);
                        void handlePull(customPullBranch.trim());
                      }
                    }}
                  />
                  <button
                    disabled={!customPullBranch.trim()}
                    onClick={() => {
                      if (!customPullBranch.trim()) return;
                      setIsPullMenuOpen(false);
                      void handlePull(customPullBranch.trim());
                    }}
                    className="px-2.5 py-1 rounded-lg vh-bg-accent vh-text-accent text-[11px] font-semibold disabled:opacity-40 transition"
                  >
                    Pull
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Push Button */}
          <button
            onClick={handlePush}
            title="Push local commits to remote tracking branch"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition"
          >
            <UploadCloud size={13} />
            Push
          </button>

          {/* Fetch & Prune */}
          <button
            onClick={handleFetchPrune}
            title="Fetch all remotes and prune deleted tracking refs"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border vh-border text-xs font-medium hover:bg-white/5 transition"
          >
            <RefreshCw size={13} />
            Fetch & Prune
          </button>

          {/* Undo Last Commit */}
          <button
            onClick={handleUndoLastCommit}
            title="Undo last commit (git reset --soft HEAD~1), keeping files staged"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition"
          >
            <Undo2 size={13} />
            Undo Commit
          </button>

          {/* Sync Button */}
          <button
            onClick={refetchGitState}
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
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition animate-in fade-in duration-150 ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
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

      {/* TOP WORKSPACE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between border-b vh-border pb-3 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "diff", label: "Diff & Staging", icon: FileCode },
            { id: "editor", label: "Live File Editor", icon: Code2 },
            { id: "log", label: "Commit Graph", icon: GitCommit },
            { id: "branches", label: "Branches & Merge", icon: GitBranch },
            { id: "stash", label: "Stash Manager", icon: Archive },
            { id: "settings", label: "Git Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  playTone("click");
                  setActiveTab(tab.id as typeof activeTab);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", tab.id);
                    window.history.pushState({}, "", url.toString());
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "vh-bg-accent vh-text-accent border vh-border-accent shadow-xs scale-[1.01]"
                    : "vh-text-dim hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={14} />
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
            className="text-xs vh-text-dim hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition border vh-border"
          >
            Clear Selected File
          </button>
        )}
      </div>

      {/* TAB 1: DIFF & STAGING AREA */}
      {activeTab === "diff" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staged Changes Card */}
            <div className="vh-bg-card border vh-border rounded-xl p-3.5 shadow-sm space-y-2.5 flex flex-col h-64">
            <div className="flex items-center justify-between pb-2 border-b vh-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold vh-text-main">Staged Changes</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {stagedFiles.length}
                </span>
              </div>
              {stagedFiles.length > 0 && (
                <button
                  onClick={handleUnstageAll}
                  className="text-[11px] text-amber-400 hover:underline font-medium"
                >
                  Unstage All
                </button>
              )}
            </div>

            {stagedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
                <p className="text-[11.5px] vh-text-dim">No staged changes.</p>
                <p className="text-[10.5px] opacity-60 vh-text-dim mt-0.5">
                  Click &quot;+&quot; on working tree files to stage.
                </p>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto flex-1 pr-1">
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
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                          {file.indexStatus?.slice(0, 1).toUpperCase() || "A"}
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

          {/* Working Tree Changes Card */}
          <div className="vh-bg-card border vh-border rounded-xl p-3.5 shadow-sm space-y-2.5 flex flex-col h-64">
            <div className="flex items-center justify-between pb-2 border-b vh-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold vh-text-main">Working Tree</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/5 border vh-border vh-text-dim">
                  {unstagedFiles.length}
                </span>
              </div>
              {unstagedFiles.length > 0 && (
                <button
                  onClick={handleStageAll}
                  className="text-[11px] text-emerald-400 hover:underline font-medium"
                >
                  Stage All
                </button>
              )}
            </div>

            {unstagedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
                <CheckCircle2 size={20} className="text-emerald-400 mb-1 opacity-70" />
                <p className="text-[11.5px] vh-text-dim">Working tree clean.</p>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto flex-1 pr-1">
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
                          ? "bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                            file.kind === "untracked"
                              ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 font-semibold"
                              : file.kind === "deleted"
                              ? "bg-rose-500/20 text-rose-700 dark:text-rose-400 font-semibold"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold"
                          }`}
                        >
                          {file.kind === "untracked"
                            ? "?"
                            : file.workTreeStatus?.slice(0, 1).toUpperCase() || "M"}
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
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 transition"
                        >
                          <Plus size={12} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDiscardFile(file.path);
                          }}
                          title="Discard changes in this file"
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-rose-600 dark:text-rose-400 transition"
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
        </div>

        {/* Full-Width Commit Composer */}
        <div className="vh-bg-card border vh-border rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold vh-text-main flex items-center gap-1.5">
              <GitCommit size={14} className="text-sky-400" />
              Commit Staged Changes ({stagedFiles.length} file{stagedFiles.length === 1 ? "" : "s"})
            </span>

            {/* Conventional Commit Presets */}
            <div className="flex flex-wrap items-center gap-1">
              {commitPresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    playTone("click");
                    if (commitMessage.startsWith(p.prefix)) return;
                    setCommitMessage((prev) => `${p.prefix}${prev.replace(/^[a-z]+:\s*/, "")}`);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border vh-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 vh-text-muted hover:text-slate-900 dark:hover:text-white transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit summary or conventional commit message..."
              className="flex-1 rounded-lg border vh-border vh-bg-app px-3 py-2 text-xs font-mono vh-text-main focus:outline-none focus:border-sky-500 transition"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleCommit(false);
                }
              }}
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={isCommitting || stagedFiles.length === 0 || !commitMessage.trim()}
                onClick={() => handleCommit(false)}
                className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg vh-bg-accent vh-text-accent text-xs font-semibold disabled:opacity-40 transition shadow-sm"
              >
                <GitCommit size={13} className={isCommitting ? "animate-spin" : ""} />
                {isCommitting ? "Committing..." : "Commit"}
              </button>

              <button
                disabled={isCommitting || stagedFiles.length === 0 || !commitMessage.trim()}
                onClick={() => handleCommit(true)}
                title="Commit staged changes and immediately push to remote tracking branch"
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold disabled:opacity-40 transition"
              >
                <UploadCloud size={13} />
                Commit & Push
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Full-Width Side-by-Side Diff Viewer */}
        <div className="w-full">
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
        </div>
      </div>
      )}

      {/* TAB 2: FULL-WIDTH LIVE FILE EDITOR */}
      {activeTab === "editor" && (
        <div className="w-full">
          <LiveFileEditor />
        </div>
      )}

      {/* TAB 3: FULL-WIDTH COMMIT HISTORY & GRAPH */}
      {activeTab === "log" && (
        <div className="w-full">
          <CommitHistory commits={logQuery.data?.commits ?? []} />
        </div>
      )}

      {/* TAB 4: FULL-WIDTH STASH MANAGER */}
      {activeTab === "stash" && (
        <div className="w-full">
          <StashManager onRefreshWorkingTree={refetchGitState} />
        </div>
      )}

      {/* TAB 5: FULL-WIDTH BRANCHES & MERGE MANAGER */}
      {activeTab === "branches" && (
        <div className="w-full">
          <BranchesManager
            currentBranchName={currentBranch?.current}
            onRefreshAll={refetchGitState}
          />
        </div>
      )}

      {/* TAB 6: FULL-WIDTH GIT SETTINGS */}
      {activeTab === "settings" && (
        <div className="w-full">
          <GitSettings />
        </div>
      )}

      {/* Push / Pull Detailed Modal */}
      <GitSyncModal
        modalState={syncModal}
        onClose={() => setSyncModal((prev) => ({ ...prev, isOpen: false }))}
        onPullFirst={() => void handlePull()}
        onSelectConflictFile={(file) => {
          setSelectedFile(file);
          setSelectedStaged(false);
          setActiveTab("diff");
          playTone("click");
        }}
      />
    </main>
  );
}
