"use client";

import { useState, useMemo } from "react";
import type { GitCommitItem } from "@/types/git";
import { GitCommit, Copy, Check, Search, Calendar, User } from "lucide-react";
import { playTone } from "@/lib/prefrences";

interface CommitHistoryProps {
  commits: GitCommitItem[];
}

export function CommitHistory({ commits }: CommitHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredCommits = useMemo(() => {
    if (!searchTerm.trim()) return commits;
    const q = searchTerm.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.shortHash.toLowerCase().includes(q) ||
        c.hash.toLowerCase().includes(q),
    );
  }, [commits, searchTerm]);

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
          <h2 className="text-sm font-semibold vh-text-main">Commit History</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border vh-border vh-text-dim">
            {filteredCommits.length} commits
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 vh-text-dim" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search commits by message, SHA..."
            className="w-full rounded-lg border vh-border vh-bg-card pl-7 pr-3 py-1.5 text-xs vh-text-main focus:outline-none"
          />
        </div>
      </div>

      {/* Commits Timeline */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
        {filteredCommits.length === 0 ? (
          <p className="text-xs vh-text-dim text-center py-8">No commits found.</p>
        ) : (
          filteredCommits.map((c) => {
            const isCopied = copiedHash === c.hash;

            return (
              <div
                key={c.hash}
                className="relative pl-9 group hover:translate-x-0.5 transition-transform"
              >
                {/* Timeline Dot */}
                <div className="absolute left-2.5 top-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-sky-400 bg-slate-900 group-hover:scale-110 transition-transform" />

                <div className="p-3 rounded-xl border vh-border bg-black/5 dark:bg-white/5 hover:border-sky-500/30 transition">
                  {/* Top Bar: Message & Short Hash */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold vh-text-main leading-relaxed">
                      {c.message}
                    </p>

                    <button
                      onClick={() => handleCopyHash(c.hash)}
                      title="Click to copy full commit hash"
                      className="flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded border vh-border bg-white/5 vh-text-muted hover:text-sky-400 hover:border-sky-400/40 transition shrink-0"
                    >
                      {isCopied ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                      <span>{c.shortHash}</span>
                    </button>
                  </div>

                  {/* Meta Bar: Author & Date */}
                  <div className="flex items-center gap-4 mt-2 text-[11px] vh-text-dim font-mono">
                    <span className="flex items-center gap-1.5">
                      <User size={12} className="opacity-60" />
                      {c.author}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="opacity-60" />
                      {c.date}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
