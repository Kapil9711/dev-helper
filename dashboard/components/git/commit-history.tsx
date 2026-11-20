"use client";

import { useState, useMemo } from "react";
import type { GitCommitItem } from "@/types/git";
import {
  GitCommit,
  GitBranch,
  Copy,
  Check,
  Search,
  Calendar,
  User,
  ArrowRight,
  FileCode,
  Tag,
  GitMerge,
  ExternalLink,
  Split,
  X,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";
import { useGitCommitDetailsQuery } from "@/lib/queries";
import { CommitDiffModal } from "./commit-diff-modal";

interface CommitHistoryProps {
  commits: GitCommitItem[];
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

export function CommitHistory({ commits }: CommitHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [modalCommit, setModalCommit] = useState<GitCommitItem | null>(null);

  // Filter commits by query
  const filteredCommits = useMemo(() => {
    if (!searchTerm.trim()) return commits;
    const q = searchTerm.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.shortHash.toLowerCase().includes(q) ||
        c.hash.toLowerCase().includes(q) ||
        (c.refs && c.refs.some((r) => r.toLowerCase().includes(q))),
    );
  }, [commits, searchTerm]);

  // Selected commit query (not needed for inline raw view now that we use modal)
  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      playTone("click");
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="vh-bg-card border vh-border rounded-xl p-4 shadow-sm space-y-4 max-h-[750px] flex flex-col">
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <GitCommit size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold vh-text-main">Commit Graph & History</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border vh-border vh-text-dim">
            {filteredCommits.length} commits
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 vh-text-dim" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search commits, branches, author..."
            className="w-full rounded-lg border vh-border vh-bg-card pl-7 pr-3 py-1.5 text-xs vh-text-main focus:outline-none"
          />
        </div>
      </div>

      {/* Main Commit Graph Timeline */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-3 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
        {filteredCommits.length === 0 ? (
          <p className="text-xs vh-text-dim text-center py-8">No commits found.</p>
        ) : (
          filteredCommits.map((c) => {
            const isCopied = copiedHash === c.hash;
            const isModalOpen = modalCommit?.hash === c.hash;
            const isHead = c.refs && c.refs.some((r) => r.includes("HEAD"));
            const isMerge = c.parents && c.parents.length > 1;

            return (
              <div
                key={c.hash}
                onClick={() => {
                  setModalCommit(c);
                  playTone("click");
                }}
                className={`relative pl-11 group transition cursor-pointer select-none`}
              >
                {/* Visual Graph Rail Node */}
                <div
                  className={`absolute left-3.5 top-3.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-125 z-10 ${
                    isHead
                      ? "border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                      : isMerge
                      ? "border-purple-400 bg-purple-600"
                      : isModalOpen
                      ? "border-sky-400 bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                      : "border-sky-400 bg-slate-900"
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Commit Box Card */}
                <div
                  className={`p-3.5 rounded-xl border transition ${
                    isModalOpen
                      ? "border-sky-500/50 bg-sky-500/10 shadow-sm"
                      : "vh-border bg-black/5 dark:bg-white/5 hover:border-sky-500/30 hover:bg-white/5"
                  }`}
                >
                  {/* Branch & Tag Pills */}
                  {c.refs && c.refs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {c.refs.map((refStr, rIdx) => {
                        const isCurrentHead = refStr.includes("HEAD");
                        const isRemote = refStr.includes("origin/") || refStr.includes("/");
                        const isTag = refStr.startsWith("tag:");

                        return (
                          <span
                            key={rIdx}
                            className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                              isCurrentHead
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                : isTag
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                : isRemote
                                ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                                : "bg-sky-500/15 border-sky-500/30 text-sky-300"
                            }`}
                          >
                            {isCurrentHead ? (
                              <GitBranch size={10} className="text-emerald-400" />
                            ) : isTag ? (
                              <Tag size={10} className="text-amber-400" />
                            ) : (
                              <GitBranch size={10} className="text-sky-400" />
                            )}
                            <span>{refStr}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Message, Split Diff Button & Short Hash */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold vh-text-main leading-relaxed">
                      {c.message}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalCommit(c);
                          playTone("click");
                        }}
                        title="Open side-by-side split diff modal for this commit"
                        className="flex items-center gap-1 font-mono text-[11px] px-2.5 py-0.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-semibold transition shadow-xs"
                      >
                        <Split size={12} />
                        <span>Split Diff</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyHash(c.hash);
                        }}
                        title="Copy full commit SHA"
                        className="flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-lg border vh-border bg-white/5 vh-text-muted hover:text-sky-400 hover:border-sky-400/40 transition"
                      >
                        {isCopied ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{c.shortHash}</span>
                      </button>
                    </div>
                  </div>

                  {/* Author & Timestamp Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t vh-border text-[11px] font-mono">
                    {/* User Avatar + Name */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full bg-gradient-to-tr ${getAuthorColor(
                          c.author,
                        )} flex items-center justify-center text-[9px] font-bold text-white shadow-sm shrink-0`}
                      >
                        {getInitials(c.author)}
                      </div>
                      <span className="font-semibold text-slate-200">{c.author}</span>
                      <span className="vh-text-dim text-[10px] hidden sm:inline-block">
                        &lt;{c.email}&gt;
                      </span>
                    </div>

                    {/* Relative & Absolute Date */}
                    <div className="flex items-center gap-2 vh-text-dim text-[10px]">
                      <span className="text-sky-400">{c.relativeDate}</span>
                      <span>•</span>
                      <span>{c.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Side-by-Side Split Diff Modal for Commits */}
      <CommitDiffModal
        commit={modalCommit}
        isOpen={modalCommit !== null}
        onClose={() => setModalCommit(null)}
      />
    </div>
  );
}
