"use client";

import { useState, useMemo } from "react";
import {
  Play,
  Pause,
  Download,
  Search,
  Music,
  ListMusic,
  Sparkles,
  Disc3,
  Clock,
  Layers,
} from "lucide-react";
import type { SongData, SoundQuality } from "@/types/music";
import { playTone } from "@/lib/prefrences";

interface UpcomingSongsProps {
  songs: SongData[];
  currentSong: SongData | null;
  isPlaying: boolean;
  categoryName: string;
  downloadQuality: SoundQuality;
  onSelectSong: (song: SongData) => void;
  onDownloadSong: (song: SongData) => void;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function UpcomingSongs({
  songs,
  currentSong,
  isPlaying,
  categoryName,
  downloadQuality,
  onSelectSong,
  onDownloadSong,
}: UpcomingSongsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;
    const term = searchTerm.toLowerCase();
    return songs.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(term);
      const albumMatch = s.album?.name?.toLowerCase().includes(term);
      const artistMatch = s.artists?.primary?.some((a) =>
        a.name.toLowerCase().includes(term),
      );
      return nameMatch || albumMatch || artistMatch;
    });
  }, [songs, searchTerm]);

  return (
    <div className="rounded-2xl border vh-border vh-bg-card shadow-xl overflow-hidden">
      {/* Queue Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b vh-border bg-black/20 p-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg vh-bg-accent vh-text-accent">
            <ListMusic size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold vh-text-main flex items-center gap-2">
              <span>Upcoming Tracks · {categoryName}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono vh-text-dim">
                {filteredSongs.length} songs
              </span>
            </h3>
            <p className="text-[11px] vh-text-dim">
              Click any track to play immediately · Download available for each song
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 vh-text-dim"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search song, artist, album..."
            className="w-full rounded-xl border vh-border vh-bg-input pl-9 pr-3 py-1.5 text-xs font-mono vh-text-main placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 transition"
          />
        </div>
      </div>

      {/* Song List Queue */}
      <div className="divide-y vh-border-subtle max-h-[460px] overflow-y-auto">
        {filteredSongs.length === 0 ? (
          <div className="p-8 text-center vh-text-dim text-xs font-mono">
            No tracks found matching "{searchTerm}"
          </div>
        ) : (
          filteredSongs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            const primaryArtists =
              song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
            const thumb =
              song.image?.find((i) => i.quality === "50x50")?.url ||
              song.image?.[0]?.url ||
              "/favicon.ico";

            return (
              <div
                key={song.id}
                onClick={() => {
                  onSelectSong(song);
                  playTone("click");
                }}
                className={`group flex items-center justify-between gap-3 px-4 sm:px-6 py-3 cursor-pointer transition ${
                  isCurrent
                    ? "bg-pink-500/10 border-l-4 border-pink-500 font-semibold"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                {/* Left: Index / Playing Icon & Thumbnail */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Track # or Animated Playing Equalizer */}
                  <div className="w-6 shrink-0 flex items-center justify-center font-mono text-xs vh-text-dim">
                    {isCurrent && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className="w-1 bg-pink-400 animate-[bounce_0.6s_ease-in-out_infinite]" />
                        <span className="w-1 bg-pink-400 animate-[bounce_0.8s_ease-in-out_infinite]" />
                        <span className="w-1 bg-pink-400 animate-[bounce_0.5s_ease-in-out_infinite]" />
                      </div>
                    ) : (
                      <span className="group-hover:hidden">{index + 1}</span>
                    )}
                    {!isCurrent && (
                      <Play
                        size={13}
                        className="hidden group-hover:block text-pink-400 fill-pink-400"
                      />
                    )}
                  </div>

                  {/* Album Artwork Thumbnail */}
                  <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-zinc-800">
                    <img
                      src={thumb}
                      alt={song.name}
                      className="h-full w-full object-cover select-none"
                    />
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs ${
                        isCurrent
                          ? "text-pink-400 font-bold"
                          : "vh-text-main group-hover:text-white"
                      }`}
                    >
                      {song.name}
                    </p>
                    <p className="truncate text-[11px] vh-text-dim">
                      {primaryArtists}
                    </p>
                  </div>
                </div>

                {/* Album Name (Hidden on smallest mobile) */}
                <div className="hidden md:block w-44 truncate text-[11px] vh-text-dim">
                  {song.album?.name || "Single"}
                </div>

                {/* Duration & Download Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs vh-text-dim flex items-center gap-1">
                    <Clock size={11} className="hidden sm:inline" />
                    {formatDuration(song.duration)}
                  </span>

                  {/* Download Song Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadSong(song);
                      playTone("click");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 vh-text-muted hover:border-pink-500/40 hover:bg-pink-500/20 hover:text-pink-400 transition"
                    title={`Download "${song.name}" (${downloadQuality})`}
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
