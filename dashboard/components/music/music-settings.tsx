"use client";

import { useState } from "react";
import {
  Download,
  Headphones,
  Sliders,
  Sparkles,
  Palette,
  Layers,
  Database,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Volume2,
  Check,
  Disc,
  Stamp,
  Zap,
  SlidersHorizontal,
  Paintbrush,
  Maximize2,
  Type,
  LayoutGrid,
  Waves,
} from "lucide-react";
import type { MusicSettings, SoundQuality, MusicStatsResponse } from "@/types/music";
import { EQ_PRESETS, REVERB_PRESETS, type EQPresetKey } from "@/lib/audio-engine";
import {
  useDashboardPreferences,
  AVAILABLE_THEMES,
  playTone,
  Theme,
  UIStyle,
  Density,
  FontFamily,
  AccentColor,
  IconStyle,
} from "@/lib/prefrences";

interface MusicSettingsTabProps {
  settings: MusicSettings;
  stats?: MusicStatsResponse;
  onUpdateSettings: (partial: Partial<MusicSettings>) => void;
  onResetSettings: () => void;
}

const QUALITY_OPTIONS: { label: string; value: SoundQuality; desc: string; badge: string }[] = [
  { label: "320 kbps (Ultra HQ)", value: "320kbps", desc: "Crisp maximum bitrate audio", badge: "320k" },
  { label: "160 kbps (High Quality)", value: "160kbps", desc: "Standard high definition", badge: "160k" },
  { label: "96 kbps (Medium Quality)", value: "96kbps", desc: "Balanced fidelity and bandwidth", badge: "96k" },
  { label: "48 kbps (Low Quality)", value: "48kbps", desc: "Low bandwidth mobile saver", badge: "48k" },
  { label: "12 kbps (Data Saver)", value: "12kbps", desc: "Extreme compression data saver", badge: "12k" },
];

export function MusicSettingsTab({
  settings,
  stats,
  onUpdateSettings,
  onResetSettings,
}: MusicSettingsTabProps) {
  const { preferences, updatePreferences } = useDashboardPreferences();
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleDownloadQualityChange = (quality: SoundQuality) => {
    onUpdateSettings({ downloadQuality: quality });
    playTone("click");
    triggerToast(`Download Quality saved: ${quality}`);
  };

  const handleSoundQualityChange = (quality: SoundQuality) => {
    onUpdateSettings({ soundQuality: quality });
    playTone("click");
    triggerToast(`Streaming Quality saved: ${quality}`);
  };

  const accentOptions: { id: AccentColor; name: string; dot: string }[] = [
    { id: "blue", name: "Electric Blue", dot: "bg-blue-500" },
    { id: "violet", name: "Amethyst Violet", dot: "bg-violet-500" },
    { id: "emerald", name: "Emerald Mint", dot: "bg-emerald-500" },
    { id: "amber", name: "Solar Amber", dot: "bg-amber-500" },
    { id: "rose", name: "Ruby Rose", dot: "bg-rose-500" },
    { id: "cyan", name: "Cyan Ice", dot: "bg-cyan-500" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold vh-text-main flex items-center gap-2.5">
          <Sliders className="text-pink-400" size={22} />
          Music Dashboard & Audio Settings
        </h1>
        <p className="mt-1 text-xs vh-text-dim">
          All audio qualities, theme settings, accent colors, and icon styles are saved into your persistent SQLite database.
        </p>
      </div>

      {/* 1. Audio Download & Streaming Quality Section */}
      <section className="rounded-2xl border vh-border vh-bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b vh-border">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <Download size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold vh-text-main">Download Quality</h2>
            <p className="text-xs vh-text-dim">
              Set the default bitrate when downloading individual tracks or full playlists.
            </p>
          </div>
        </div>

        {/* Download Quality Radio Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUALITY_OPTIONS.map((opt) => {
            const active = settings.downloadQuality === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => handleDownloadQualityChange(opt.value)}
                className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition ${
                  active
                    ? "border-sky-500/50 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    : "vh-border vh-bg-input hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs vh-text-main">{opt.label}</span>
                  <span
                    className={`rounded font-mono text-[10px] px-1.5 py-0.5 font-bold ${
                      active ? "bg-sky-500 text-white" : "bg-white/10 vh-text-dim"
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="mt-2 text-[11px] vh-text-dim">{opt.desc}</p>
                {active && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-sky-400">
                    <Check size={13} />
                    <span>Active Download Quality</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Streaming Sound Quality */}
        <div className="pt-4 border-t vh-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
              <Headphones size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold vh-text-main">Streaming Sound Quality</h2>
              <p className="text-xs vh-text-dim">
                Bitrate used by the retro player for live playback (auto-persisted in SQLite).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUALITY_OPTIONS.map((opt) => {
              const active = settings.soundQuality === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSoundQualityChange(opt.value)}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition ${
                    active
                      ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                      : "vh-border vh-bg-input hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs vh-text-main">{opt.label}</span>
                    <span
                      className={`rounded font-mono text-[10px] px-1.5 py-0.5 font-bold ${
                        active ? "bg-pink-500 text-white" : "bg-white/10 vh-text-dim"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] vh-text-dim">{opt.desc}</p>
                  {active && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-pink-400">
                      <Check size={13} />
                      <span>Active Sound Quality</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Playback Toggles */}
        <div className="pt-4 border-t vh-border grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoPlay}
              onChange={(e) => {
                onUpdateSettings({ autoPlay: e.target.checked });
                playTone("click");
              }}
              className="h-4 w-4 rounded border-gray-600 bg-transparent text-pink-500 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold vh-text-main">Auto-Play Next Track</p>
              <p className="text-[11px] vh-text-dim">Automatically advance to the next track when current finishes</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.shuffle}
              onChange={(e) => {
                onUpdateSettings({ shuffle: e.target.checked });
                playTone("click");
              }}
              className="h-4 w-4 rounded border-gray-600 bg-transparent text-pink-500 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold vh-text-main">Shuffle Non-Repeating Pool</p>
              <p className="text-[11px] vh-text-dim">Ensures zero repeats until full category is finished</p>
            </div>
          </label>
        </div>
      </section>

      {/* Audio DSP: Equalizer & Reverb Section */}
      <section className="rounded-2xl border vh-border vh-bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b vh-border">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold vh-text-main">Web Audio DSP: Equalizer & Reverb</h2>
            <p className="text-xs vh-text-dim">
              Fine-tune the acoustic profile with real-time 5-band biquad filters and algorithmic stereo reverb.
            </p>
          </div>
        </div>

        {/* EQ Profiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-violet-300">
              Equalizer Curve Profiles
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              Current: {EQ_PRESETS[(settings.eqMode || "flat") as EQPresetKey]?.name || "Pure Flat"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(EQ_PRESETS) as EQPresetKey[]).map((key) => {
              const preset = EQ_PRESETS[key];
              const active = (settings.eqMode || "flat") === key;
              return (
                <div
                  key={key}
                  onClick={() => {
                    onUpdateSettings({ eqMode: key });
                    playTone("click");
                    triggerToast(`Equalizer mode: ${preset.name}`);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    active
                      ? "border-violet-500/60 bg-violet-500/15 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                      : "vh-border vh-bg-input hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs vh-text-main">{preset.name}</span>
                    <span
                      className={`rounded font-mono text-[9px] px-1.5 py-0.5 font-bold ${
                        active ? "bg-violet-500 text-white" : "bg-white/10 vh-text-dim"
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] vh-text-dim">{preset.description}</p>
                  {active && (
                    <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-violet-400">
                      <Check size={12} />
                      <span>Active Equalizer</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reverb Atmosphere */}
        <div className="pt-4 border-t vh-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Waves size={16} className="text-emerald-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-300">
                Algorithmic Reverb Effect
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {settings.reverbPercent ?? 0}% {((settings.reverbPercent ?? 0) === 0) ? "(Direct Dry)" : "(Wet Acoustic Space)"}
            </span>
          </div>

          <div className="bg-black/30 p-4 rounded-xl border vh-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>0% Dry (Direct)</span>
              <span>50% Concert Hall</span>
              <span>100% Cosmic Tail</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.reverbPercent ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateSettings({ reverbPercent: val });
              }}
              className="h-2.5 w-full cursor-pointer accent-emerald-500 rounded-lg bg-zinc-800"
            />

            <div className="flex flex-wrap gap-2 pt-2">
              {REVERB_PRESETS.map((p) => {
                const active = (settings.reverbPercent ?? 0) === p.percent;
                return (
                  <button
                    key={p.percent}
                    onClick={() => {
                      onUpdateSettings({ reverbPercent: p.percent });
                      playTone("click");
                      triggerToast(`Reverb set to: ${p.label} (${p.percent}%)`);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-mono font-semibold transition border ${
                      active
                        ? "bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-xs"
                        : "vh-border vh-bg-input text-zinc-300 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {p.label} {p.percent}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Icon Presentation Theme */}
      <section className="rounded-2xl border vh-border vh-bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b vh-border">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <Stamp size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold vh-text-main">Icon Presentation Theme</h2>
            <p className="text-xs vh-text-dim">
              Select how icons, navigation badges, and telemetry indicators are visually highlighted.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              {
                id: "default",
                title: "Adaptive System",
                desc: "Matches current UI paradigm automatically",
                icon: Layers,
              },
              {
                id: "glow",
                title: "Luminous Glow",
                desc: "Outer neon halo on active icons & badges",
                icon: Zap,
              },
              {
                id: "stamped",
                title: "Brutalist Stamped",
                desc: "Chunky bordered stamp boxes with offset shadow",
                icon: Stamp,
              },
              {
                id: "minimal",
                title: "Minimal Stroke",
                desc: "Clean line-work without shadows or halos",
                icon: SlidersHorizontal,
              },
            ] as const
          ).map((item) => {
            const isSelected = preferences.iconStyle === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  updatePreferences({ iconStyle: item.id as IconStyle });
                  playTone("click");
                  triggerToast(`Icon Presentation updated: ${item.title}`);
                }}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-2 vh-border-accent vh-bg-accent font-semibold"
                    : "vh-border vh-bg-input hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <item.icon size={16} className={isSelected ? "vh-text-accent" : "vh-text-dim"} />
                    {isSelected && <Check size={13} className="vh-text-accent" />}
                  </div>
                  <p className="mt-2 text-xs font-bold vh-text-main">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 vh-text-dim">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Accent Color & Spacing */}
      <section className="rounded-2xl border vh-border vh-bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b vh-border">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <Paintbrush size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold vh-text-main">Accent Color & Spacing</h2>
            <p className="text-xs vh-text-dim">
              Refine your highlight color, interface spacing, and layout density.
            </p>
          </div>
        </div>

        {/* Accent Colors */}
        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wider vh-text-dim">
            Accent Color
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {accentOptions.map((acc) => {
              const isSelected = preferences.accentColor === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    updatePreferences({ accentColor: acc.id });
                    playTone("click");
                    triggerToast(`Accent Color: ${acc.name}`);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition ${
                    isSelected
                      ? "border-2 vh-border-accent vh-bg-accent"
                      : "vh-border vh-bg-input vh-text-main hover:border-white/20"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${acc.dot}`} />
                  <span className="truncate">{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spacing & Interface Density */}
        <div className="pt-4 border-t vh-border">
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wider vh-text-dim">
            Interface Density & Spacing
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "comfortable",
                label: "Comfortable",
                desc: "Spacious layout with relaxed breathing room",
              },
              {
                id: "standard",
                label: "Standard",
                desc: "Balanced medium density for everyday music playback",
              },
              {
                id: "compact",
                label: "Compact",
                desc: "Dense layout maximizing visible screen content",
              },
            ].map((d) => {
              const isSelected = preferences.density === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    updatePreferences({ density: d.id as Density });
                    playTone("click");
                    triggerToast(`Density: ${d.label}`);
                  }}
                  className={`rounded-xl border p-3.5 text-left transition ${
                    isSelected
                      ? "border-2 vh-border-accent vh-bg-accent font-semibold"
                      : "vh-border vh-bg-input vh-text-main hover:border-white/20"
                  }`}
                >
                  <p className="text-xs font-semibold">{d.label}</p>
                  <p className="mt-1 text-[11px] vh-text-dim">{d.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Theme & Appearance Section */}
      <section className="rounded-2xl border vh-border vh-bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b vh-border">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold vh-text-main">Theme Presets & UI Paradigm</h2>
            <p className="text-xs vh-text-dim">
              Refined GitHub-style developer themes and visual aesthetics.
            </p>
          </div>
        </div>

        {/* Theme Grid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider vh-text-dim mb-3">
            Active Theme Preset
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {AVAILABLE_THEMES.map((theme) => {
              const active = preferences.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    updatePreferences({ theme: theme.id as Theme });
                    playTone("click");
                    triggerToast(`Theme: ${theme.name}`);
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                    active
                      ? "border-2 vh-border-accent vh-bg-accent shadow-sm"
                      : "vh-border vh-bg-input hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs vh-text-main">{theme.name}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${theme.accentDot}`} />
                  </div>
                  <span className="mt-1 text-[10px] vh-text-dim">{theme.tag}</span>
                  {active && (
                    <span className="mt-2 text-[10px] font-bold vh-text-accent flex items-center gap-1">
                      <Check size={11} /> Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* UI Style & Font */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t vh-border">
          <div>
            <label className="block text-xs font-semibold vh-text-dim mb-1.5">UI Style Paradigm</label>
            <select
              value={preferences.uiStyle}
              onChange={(e) => {
                updatePreferences({ uiStyle: e.target.value as UIStyle });
                triggerToast(`UI Style: ${e.target.value}`);
              }}
              className="w-full rounded-xl border vh-border vh-bg-input px-3 py-2 text-xs font-mono vh-text-main focus:outline-none"
            >
              <option value="modern">Modern Flat</option>
              <option value="skeuomorphic">Skeuomorphic Retro</option>
              <option value="neubrutalism">Neubrutalism</option>
              <option value="glassmorphism">Glassmorphism</option>
              <option value="cyberpunk">Cyberpunk Neon</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold vh-text-dim mb-1.5">Font Family</label>
            <select
              value={preferences.fontFamily}
              onChange={(e) => {
                updatePreferences({ fontFamily: e.target.value as FontFamily });
                triggerToast(`Font: ${e.target.value}`);
              }}
              className="w-full rounded-xl border vh-border vh-bg-input px-3 py-2 text-xs font-mono vh-text-main focus:outline-none"
            >
              <option value="mono">JetBrains / SF Mono</option>
              <option value="sans">Geist / Inter Sans</option>
              <option value="code">Fira Code</option>
            </select>
          </div>
        </div>
      </section>

      {/* 5. SQLite Database Telemetry Section */}
      <section className="rounded-2xl border vh-border vh-bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b vh-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold vh-text-main">Persistent SQLite Database</h2>
              <p className="text-xs vh-text-dim">
                Storage engine powering state persistence and play telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("Reset all music player preferences to defaults?")) {
                onResetSettings();
                playTone("click");
              }
            }}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <RotateCcw size={13} />
            Reset Defaults
          </button>
        </div>

        <div className="space-y-2.5 rounded-xl border vh-border vh-bg-subtle p-4 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="vh-text-dim">Database Location</span>
            <span className="truncate max-w-xs sm:max-w-md font-semibold text-emerald-400">
              {stats?.dbStats?.dbPath || "~/.vh-dev-helper/vh-music.sqlite"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="vh-text-dim">Storage Driver</span>
            <span className="vh-text-main font-semibold">better-sqlite3 (WAL Mode)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="vh-text-dim">Total Play Sessions Logged</span>
            <span className="vh-text-main">{stats?.dbStats?.totalPlays || 0} tracks</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="vh-text-dim">Total Song Library</span>
            <span className="vh-text-main font-semibold text-pink-400">
              {stats?.totalSongs || 50} songs across {stats?.totalCategories || 1} playlist files
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
