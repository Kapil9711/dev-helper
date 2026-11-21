"use client";

import { useState } from "react";
import {
  Shuffle,
  Disc,
  Download,
  Music,
  Sparkles,
  Archive,
  Layers,
  Check,
} from "lucide-react";
import type { SongCategory, SoundQuality } from "@/types/music";
import { playTone } from "@/lib/prefrences";

interface CategorySelectorProps {
  categories: SongCategory[];
  activeCategory: string; // "random" or category id e.g. "evergreen"
  totalSongs: number;
  downloadQuality: SoundQuality;
  onSelectCategory: (category: string) => void;
  onDownloadWholeList: (category: string) => void;
}

export function CategorySelector({
  categories,
  activeCategory,
  totalSongs,
  downloadQuality,
  onSelectCategory,
  onDownloadWholeList,
}: CategorySelectorProps) {
  const isRandom = activeCategory === "random" || !activeCategory;

  const currentCategoryObj = categories.find((c) => c.id === activeCategory);
  const currentCategoryName = isRandom ? "Random Shuffle" : currentCategoryObj?.name || activeCategory;
  const currentCategoryCount = isRandom ? totalSongs : currentCategoryObj?.count || 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border vh-border vh-bg-card p-4 shadow-sm">
      {/* Left: Buttons for Random and all .json files */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider vh-text-dim mr-1 flex items-center gap-1.5">
          <Music size={14} />
          Playlists:
        </span>

        {/* 1. Default Random Button (Plays random song from any file without repeating) */}
        <button
          onClick={() => {
            onSelectCategory("random");
            playTone("click");
          }}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition shadow-xs ${
            isRandom
              ? "border border-pink-500/40 bg-pink-500/15 text-pink-400 font-bold shadow-[0_0_12px_rgba(236,72,153,0.25)]"
              : "border vh-border vh-bg-input vh-text-muted hover:text-white hover:border-white/20"
          }`}
          title="Play random songs across all playlist files without repeating"
        >
          <Shuffle size={14} className={isRandom ? "animate-pulse" : ""} />
          <span>Random</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              isRandom ? "bg-pink-500/30 text-pink-300" : "bg-white/10 vh-text-dim"
            }`}
          >
            {totalSongs}
          </span>
          {isRandom && <span className="h-1.5 w-1.5 rounded-full bg-pink-400 shrink-0" />}
        </button>

        {/* 2. Dynamic Category Buttons generated from all .json files (e.g. evergreen.json) */}
        {categories.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                onSelectCategory(cat.id);
                playTone("click");
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition shadow-xs ${
                active
                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-bold shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                  : "border vh-border vh-bg-input vh-text-muted hover:text-white hover:border-white/20"
              }`}
              title={`Play only songs from ${cat.fileName}`}
            >
              <Disc size={14} className={active ? "animate-[spin_4s_linear_infinite]" : ""} />
              <span>{cat.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  active ? "bg-emerald-500/30 text-emerald-300" : "bg-white/10 vh-text-dim"
                }`}
              >
                {cat.count}
              </span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Right: Download Whole List Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            onDownloadWholeList(isRandom ? "all" : activeCategory);
            playTone("click");
          }}
          className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition shadow-xs"
          title={`Download full ${currentCategoryName} playlist as ZIP archive (${downloadQuality})`}
        >
          <Archive size={14} />
          <span>
            Download {isRandom ? "All" : currentCategoryName} List ({currentCategoryCount})
          </span>
        </button>
      </div>
    </div>
  );
}
