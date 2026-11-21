"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Download,
  Headphones,
  Sparkles,
  Radio,
  Check,
  Disc3,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { SongData, SoundQuality } from "@/types/music";
import { playTone } from "@/lib/prefrences";

interface CdPlayerProps {
  currentSong: SongData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  soundQuality: SoundQuality;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  isFullscreen: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onQualityChange: (quality: SoundQuality) => void;
  onDownloadCurrentSong: () => void;
  onToggleFullscreen: () => void;
}

const QUALITY_OPTIONS: { label: string; value: SoundQuality; desc: string; badge: string }[] = [
  { label: "320 kbps", value: "320kbps", desc: "Ultra HD / Lossless feel", badge: "HQ" },
  { label: "160 kbps", value: "160kbps", desc: "High Quality", badge: "HIGH" },
  { label: "96 kbps", value: "96kbps", desc: "Standard Streaming", badge: "MID" },
  { label: "48 kbps", value: "48kbps", desc: "Low Bandwidth", badge: "ECO" },
  { label: "12 kbps", value: "12kbps", desc: "Data Saver", badge: "MIN" },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function CdPlayer({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  soundQuality,
  shuffle,
  repeat,
  isFullscreen,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onQualityChange,
  onDownloadCurrentSong,
  onToggleFullscreen,
}: CdPlayerProps) {
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);

  // Close quality dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        qualityDropdownRef.current &&
        !qualityDropdownRef.current.contains(e.target as Node)
      ) {
        setIsQualityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayTime = isDraggingSeek ? dragTime : currentTime;
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;

  // Best album art
  const albumArt = useMemo(() => {
    if (!currentSong?.image?.length) return "/favicon.ico";
    const high = currentSong.image.find((i) => i.quality === "500x500");
    const mid = currentSong.image.find((i) => i.quality === "150x150");
    return high?.url || mid?.url || currentSong.image[0]?.url || "/favicon.ico";
  }, [currentSong]);

  const primaryArtists = useMemo(() => {
    return currentSong?.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist";
  }, [currentSong]);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    onSeek(newTime);
    playTone("click");
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverSeekTime(ratio * duration);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border vh-border vh-bg-card shadow-2xl transition-all ${
        isFullscreen ? "p-4 sm:p-8" : ""
      }`}
    >
      {/* Top Vintage Bezel Bar */}
      <div className="flex items-center justify-between border-b vh-border bg-black/60 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.8)]">
            <span
              className={`h-1.5 w-1.5 rounded-full bg-white ${
                isPlaying ? "animate-ping" : ""
              }`}
            />
          </span>
          <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-zinc-300">
            VH-AUDIO · RETRO HI-FI DECK
          </span>
          <span className="hidden sm:inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            OPTICAL DISC RUNNER
          </span>
        </div>

        {/* Right Controls: Sound Quality Selector & Fullscreen Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Sound Quality Selector in Player Header */}
          <div className="relative" ref={qualityDropdownRef}>
            <button
              onClick={() => setIsQualityOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-pink-500/40 bg-pink-500/15 px-3 py-1.5 text-xs font-mono font-semibold text-pink-300 hover:bg-pink-500/25 transition shadow-xs"
              title="Select audio streaming sound quality (persisted in SQLite)"
            >
              <Headphones size={13} />
              <span>{soundQuality}</span>
              <span className="rounded bg-pink-500/30 px-1 text-[9px] font-bold uppercase text-pink-200">
                {QUALITY_OPTIONS.find((q) => q.value === soundQuality)?.badge || "HQ"}
              </span>
            </button>

            {isQualityOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border vh-border vh-bg-modal p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider vh-text-dim border-b vh-border mb-1">
                  Audio Stream Quality
                </div>
                <div className="space-y-1">
                  {QUALITY_OPTIONS.map((opt) => {
                    const active = soundQuality === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          onQualityChange(opt.value);
                          setIsQualityOpen(false);
                          playTone("click");
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                          active
                            ? "bg-pink-500/20 text-pink-400 font-bold border border-pink-500/30"
                            : "hover:bg-white/5 vh-text-main"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{opt.label}</span>
                            <span className="rounded border border-white/10 bg-white/5 px-1 text-[9px] font-mono">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[10px] vh-text-dim">{opt.desc}</p>
                        </div>
                        {active && <Check size={14} className="text-pink-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 border-t vh-border pt-1.5 px-2 text-[9px] vh-text-dim">
                  ✓ Auto-saved to persistent SQLite DB
                </div>
              </div>
            )}
          </div>

          {/* Full Screen Toggle Button */}
          <button
            onClick={() => {
              onToggleFullscreen();
              playTone("click");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border vh-border vh-bg-input vh-text-dim hover:text-white hover:border-white/20 transition shadow-xs"
            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen Mode"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Player Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-6 sm:p-10 items-center">
        {/* Left Col: Running CD / Vinyl Player Graphic */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Turntable / CD Deck Outer Chassis */}
            <div className="relative h-64 w-64 sm:h-76 sm:w-76 rounded-full border-4 border-zinc-700/70 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800 p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_2px_15px_rgba(255,255,255,0.15)] flex items-center justify-center">
              {/* Spinning Vinyl / CD Disc */}
              <div
                className="relative h-full w-full rounded-full border-2 border-zinc-600/50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950 flex items-center justify-center shadow-inner overflow-hidden select-none"
                style={{
                  animation: isPlaying ? "cd-disc-spin 6s linear infinite" : "none",
                }}
              >
                {/* Vinyl Grooves (Concentric Circles) */}
                <div className="absolute inset-2 rounded-full border border-zinc-700/30 pointer-events-none" />
                <div className="absolute inset-5 rounded-full border border-zinc-700/25 pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-zinc-700/35 pointer-events-none" />
                <div className="absolute inset-12 rounded-full border border-zinc-700/20 pointer-events-none" />
                <div className="absolute inset-16 rounded-full border border-zinc-700/30 pointer-events-none" />
                <div className="absolute inset-20 rounded-full border border-zinc-700/20 pointer-events-none" />

                {/* CD Iridescent Rainbow Sheen Reflection */}
                <div className="absolute inset-0 rounded-full opacity-30 pointer-events-none bg-[conic-gradient(from_0deg,transparent_0deg,rgba(236,72,153,0.35)_60deg,transparent_120deg,rgba(59,130,246,0.35)_180deg,transparent_240deg,rgba(16,185,129,0.35)_300deg,transparent_360deg)]" />

                {/* Center Album Art Label (Rotating with the disc!) */}
                <div className="relative h-26 w-26 sm:h-30 sm:w-30 rounded-full border-2 border-white/30 overflow-hidden shadow-2xl flex items-center justify-center bg-zinc-900">
                  {currentSong ? (
                    <img
                      src={albumArt}
                      alt={currentSong.name}
                      className="h-full w-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                      <Disc3 size={32} className="text-zinc-500" />
                    </div>
                  )}

                  {/* CD Center Spindle Hole with Chrome Ring */}
                  <div className="absolute h-8 w-8 rounded-full border-2 border-zinc-300 bg-zinc-950 shadow-inner flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-zinc-600 border border-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Tonearm / Turntable Needle (Swings in when playing) */}
              <div
                className={`absolute top-2 right-4 w-14 h-32 origin-top-right transition-transform duration-700 pointer-events-none hidden sm:block ${
                  isPlaying ? "rotate-[22deg]" : "rotate-[0deg]"
                }`}
              >
                <div className="w-2 h-24 bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-600 rounded-full mx-auto shadow-md" />
                <div className="w-4 h-7 bg-zinc-900 border border-zinc-500 rounded-sm mx-auto shadow-lg -mt-1 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Disc Status Tag */}
          <div className="mt-5 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPlaying
                  ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse"
                  : "bg-zinc-600"
              }`}
            />
            <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-zinc-300">
              {isPlaying ? "DISC RUNNING · ACTIVE" : "DECK IDLE · READY"}
            </span>
          </div>
        </div>

        {/* Right Col: Song Meta, LED Equalizer & Tactile Controls */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-6">
          {/* Retro LED Track Info Screen */}
          <div className="rounded-2xl border border-rose-500/30 bg-black/80 p-5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)] backdrop-blur-sm relative overflow-hidden">
            {/* CRT scanline overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 border border-rose-500/30">
                    TRACK {currentSong?.year ? `'${currentSong.year.slice(-2)}` : "01"}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-rose-400/80">
                    {currentSong?.language || "STEREO HI-FI"}
                  </span>
                </div>

                <h2 className="mt-1.5 truncate font-mono text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                  {currentSong?.name || "Select Track"}
                </h2>

                <p className="mt-1 truncate font-mono text-xs sm:text-sm text-rose-300 font-semibold">
                  {primaryArtists}
                </p>

                {currentSong?.album?.name && (
                  <p className="mt-0.5 truncate font-mono text-xs text-zinc-400">
                    Album: {currentSong.album.name}
                  </p>
                )}
              </div>

              {/* Download Current Song Button */}
              <button
                onClick={() => {
                  onDownloadCurrentSong();
                  playTone("click");
                }}
                disabled={!currentSong}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 font-mono text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-40 shadow-xs"
                title={`Download current song (${soundQuality})`}
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>

            {/* LED Time & Frequency Equalizer Display */}
            <div className="mt-4 flex items-center justify-between border-t border-rose-500/20 pt-3">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl sm:text-3xl font-black text-rose-400">
                  {formatTime(displayTime)}
                </span>
                <span className="text-xs text-rose-500/70 font-semibold">
                  / {formatTime(duration)}
                </span>
                <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                  {Math.round(progressPercent)}%
                </span>
              </div>

              {/* Pulsing Graphic Equalizer Bars */}
              <div className="flex items-end gap-1 h-7">
                {[45, 80, 60, 95, 65, 90, 50, 100, 75, 55, 85, 70].map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-xs bg-rose-500 transition-all duration-150 shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                    style={{
                      height: isPlaying
                        ? `${Math.max(18, (height * (1 + Math.sin(Date.now() / 180 + i))) / 2)}%`
                        : "15%",
                      opacity: isPlaying ? 0.95 : 0.25,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* HIGH-CONTRAST, CLEARLY VISIBLE PROGRESS BAR */}
          <div className="space-y-2 bg-black/40 p-3.5 rounded-2xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between font-mono text-xs font-bold">
              <span className="text-rose-400">{formatTime(displayTime)}</span>
              <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                Playback Position
              </span>
              <span className="text-zinc-400">
                -{formatTime(Math.max(0, duration - displayTime))}
              </span>
            </div>

            {/* Main Interactive Progress Scrubber */}
            <div
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={() => setHoverSeekTime(null)}
              className="relative h-3.5 w-full cursor-pointer rounded-full bg-zinc-950 border-2 border-zinc-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] overflow-hidden group hover:border-pink-500/60 transition-colors"
            >
              {/* Vibrant Filled Progress Bar */}
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.7)] transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Always Visible Glowing Scrubber Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -ml-2 h-4 w-4 rounded-full bg-white border-2 border-rose-500 shadow-[0_0_10px_rgba(255,255,255,0.9)] pointer-events-none transition-transform group-hover:scale-125"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover preview tooltip */}
              {hoverSeekTime !== null && (
                <div
                  className="absolute -top-7 -translate-x-1/2 rounded-md bg-black border border-white/20 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-xl pointer-events-none z-30"
                  style={{
                    left: `${Math.min(95, Math.max(5, (hoverSeekTime / duration) * 100))}%`,
                  }}
                >
                  {formatTime(hoverSeekTime)}
                </div>
              )}
            </div>
          </div>

          {/* Tactile Control Buttons & Sliders */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Shuffle Toggle */}
              <button
                onClick={() => {
                  onToggleShuffle();
                  playTone("click");
                }}
                className={`p-2.5 rounded-xl transition ${
                  shuffle
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs"
                    : "vh-text-dim hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                title={shuffle ? "Shuffle ON" : "Shuffle OFF"}
              >
                <Shuffle size={16} />
              </button>

              {/* Prev Button */}
              <button
                onClick={() => {
                  onPrev();
                  playTone("click");
                }}
                className="p-3 rounded-2xl border vh-border vh-bg-input vh-text-main hover:border-white/25 hover:scale-105 active:scale-95 transition shadow-sm"
                title="Previous track"
              >
                <SkipBack size={18} />
              </button>

              {/* Play / Pause Giant Tactile Button */}
              <button
                onClick={() => {
                  onPlayPause();
                  playTone("click");
                }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:scale-105 active:scale-95 transition"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={24} className="fill-white" />
                ) : (
                  <Play size={24} className="fill-white ml-0.5" />
                )}
              </button>

              {/* Next Button */}
              <button
                onClick={() => {
                  onNext();
                  playTone("click");
                }}
                className="p-3 rounded-2xl border vh-border vh-bg-input vh-text-main hover:border-white/25 hover:scale-105 active:scale-95 transition shadow-sm"
                title="Next track"
              >
                <SkipForward size={18} />
              </button>

              {/* Repeat Mode Button */}
              <button
                onClick={() => {
                  onToggleRepeat();
                  playTone("click");
                }}
                className={`p-2.5 rounded-xl transition ${
                  repeat !== "off"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs"
                    : "vh-text-dim hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                title={`Repeat: ${repeat}`}
              >
                {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </div>

            {/* Volume Control Slider */}
            <div className="flex items-center gap-2 bg-black/30 px-3.5 py-2 rounded-xl border vh-border">
              <button
                onClick={() => {
                  onToggleMute();
                  playTone("click");
                }}
                className="p-1 rounded-lg vh-text-dim hover:text-white transition"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={16} className="text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="h-1.5 w-20 sm:w-24 cursor-pointer accent-rose-500 rounded-lg bg-zinc-700"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />

              <span className="font-mono text-[10px] vh-text-dim w-7 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
