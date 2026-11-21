"use client";

import { Play, Download, SkipForward, Music2, Clock, Sparkles } from "lucide-react";
import type { SongData, SoundQuality } from "@/types/music";
import { playTone } from "@/lib/prefrences";

interface UpNextCardProps {
  nextSong: SongData | null;
  categoryName: string;
  totalQueueCount: number;
  downloadQuality: SoundQuality;
  onPlayNext: () => void;
  onDownloadSong: (song: SongData) => void;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function UpNextCard({
  nextSong,
  categoryName,
  totalQueueCount,
  downloadQuality,
  onPlayNext,
  onDownloadSong,
}: UpNextCardProps) {
  if (!nextSong) {
    return (
      <div className="rounded-2xl border vh-border vh-bg-card p-5 text-center vh-text-dim text-xs font-mono shadow-sm">
        No upcoming track in queue
      </div>
    );
  }

  const thumb =
    nextSong.image?.find((i) => i.quality === "150x150")?.url ||
    nextSong.image?.find((i) => i.quality === "50x50")?.url ||
    nextSong.image?.[0]?.url ||
    "/favicon.ico";

  const primaryArtists =
    nextSong.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist";

  return (
    <div className="rounded-2xl border vh-border vh-bg-card p-5 shadow-lg relative overflow-hidden group hover:border-pink-500/40 transition-all">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Up Next Label & Track Details */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Thumbnail */}
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shadow-md">
            <img
              src={thumb}
              alt={nextSong.name}
              className="h-full w-full object-cover select-none group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={18} className="text-white fill-white" />
            </div>
          </div>

          {/* Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-md">
                <SkipForward size={10} />
                Up Next
              </span>
              <span className="text-[10px] font-mono vh-text-dim">
                {categoryName} · {totalQueueCount} tracks left in pool
              </span>
            </div>

            <h4 className="mt-1 truncate text-sm font-bold vh-text-main group-hover:text-pink-300 transition-colors">
              {nextSong.name}
            </h4>

            <p className="truncate text-xs vh-text-dim">
              {primaryArtists}
              {nextSong.album?.name && ` · ${nextSong.album.name}`}
            </p>
          </div>
        </div>

        {/* Right: Duration & Quick Actions */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="font-mono text-xs vh-text-dim flex items-center gap-1.5 mr-2">
            <Clock size={12} />
            {formatDuration(nextSong.duration)}
          </span>

          {/* Quick Play Next Button */}
          <button
            onClick={() => {
              onPlayNext();
              playTone("click");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-500/15 px-3.5 py-2 text-xs font-bold text-pink-300 hover:bg-pink-500/25 hover:border-pink-500/50 transition shadow-xs"
            title={`Play "${nextSong.name}" now`}
          >
            <Play size={13} className="fill-pink-300" />
            <span>Play Next</span>
          </button>

          {/* Quick Download Button */}
          <button
            onClick={() => {
              onDownloadSong(nextSong);
              playTone("click");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border vh-border vh-bg-input vh-text-muted hover:text-white hover:border-white/20 transition"
            title={`Download "${nextSong.name}" (${downloadQuality})`}
          >
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
