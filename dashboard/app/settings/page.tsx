"use client";

import { useEffect, useState, useRef } from "react";
import {
  RefreshCw,
  Server,
  Activity,
  SlidersHorizontal,
  Palette,
  CheckCircle2,
  XCircle,
  Clock3,
  Database,
  Globe,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Boxes,
  Eye,
  Check,
  Zap,
  PanelLeftClose,
  Code2,
  FileCode,
  Download,
  Upload,
  Box,
  Shapes,
  Stamp,
  Layers,
  Terminal,
} from "lucide-react";
import {
  useDashboardPreferences,
  AVAILABLE_THEMES,
  playTone,
  type Theme,
  type UIStyle,
  type IconStyle,
  type AccentColor,
  type Density,
  type TimestampFormat,
  type JsonViewerMode,
  type FontFamily,
} from "@/lib/prefrences";
import { useAppsQuery } from "@/lib/queries";

type HealthStatus = "checking" | "online" | "offline";

export default function SettingsPage() {
  const { preferences, updatePreferences, resetPreferences } =
    useDashboardPreferences();
  const appsQuery = useAppsQuery();
  const apps = appsQuery.data?.data ?? [];

  const [health, setHealth] = useState<HealthStatus>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function checkHealth() {
    setLoading(true);
    setHealth("checking");
    const start = performance.now();

    try {
      const response = await fetch("/health", { cache: "no-store" });
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setHealth(response.ok ? "online" : "offline");
      playTone("success");
    } catch {
      setHealth("offline");
      setLatency(null);
      playTone("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkHealth();
  }, []);

  const accentOptions: { id: AccentColor; name: string; dot: string }[] = [
    { id: "blue", name: "Electric Blue", dot: "bg-blue-500" },
    { id: "violet", name: "Amethyst Violet", dot: "bg-violet-500" },
    { id: "emerald", name: "Emerald Mint", dot: "bg-emerald-500" },
    { id: "amber", name: "Solar Amber", dot: "bg-amber-500" },
    { id: "rose", name: "Ruby Rose", dot: "bg-rose-500" },
    { id: "cyan", name: "Cyan Ice", dot: "bg-cyan-500" },
  ];

  const handleReset = () => {
    resetPreferences();
    setResetDone(true);
    playTone("click");
    setTimeout(() => setResetDone(false), 2000);
  };

  const exportSettings = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(preferences, null, 2));
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "vh-devtools-settings.json");
    dl.click();
    setExportDone(true);
    playTone("success");
    setTimeout(() => setExportDone(false), 2000);
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        updatePreferences(parsed);
        playTone("success");
      } catch {
        playTone("error");
      }
    };
    reader.readAsText(file);
  };

  const testAudio = () => {
    playTone("success");
    setTimeout(() => playTone("error"), 250);
  };

  const selectClassName =
    "w-full rounded-xl border vh-border vh-bg-input px-3.5 py-2.5 text-xs font-semibold vh-text-main outline-none transition focus:border-blue-500";

  return (
    <div className="space-y-6 pb-12 vh-bg-app p-5 vh-text-main md:p-7">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings & Customization</h1>
          <p className="mt-1 text-sm vh-text-muted">
            Configure 4 curated themes, Skeuomorphism 3D, Neubrutalism, icon styles, and telemetry limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={importSettings}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-3 py-2 text-xs font-medium vh-text-muted hover:border-white/20 hover:text-white transition"
          >
            <Upload size={13} />
            Import
          </button>

          <button
            onClick={exportSettings}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-3 py-2 text-xs font-medium vh-text-muted hover:border-white/20 hover:text-white transition"
          >
            {exportDone ? <Check size={13} className="text-emerald-400" /> : <Download size={13} />}
            {exportDone ? "Exported!" : "Export"}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-3.5 py-2 text-xs font-medium vh-text-muted hover:border-white/20 hover:text-white transition"
          >
            {resetDone ? <Check size={13} className="text-emerald-400" /> : <RotateCcw size={13} />}
            {resetDone ? "Preferences Reset" : "Reset Defaults"}
          </button>
        </div>
      </div>

      {/* 1. Design System Paradigm (Modern / Skeuomorphism / Neubrutalism) */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
              <Boxes size={20} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm vh-text-main">Design System Paradigm</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold vh-text-muted">
                  5 Design Paradigms
                </span>
              </div>
              <p className="text-xs vh-text-dim">
                Switch the entire dashboard look and feel between Modern Minimal, 3D Skeuomorphism, Neubrutalism, Glassmorphism, and Cyberpunk HUD.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* Option A: Modern Flat */}
          <button
            onClick={() => {
              updatePreferences({ uiStyle: "modern" });
              playTone("click");
            }}
            className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all ${
              preferences.uiStyle === "modern"
                ? "border-2 vh-border-accent bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.01]"
                : "vh-border vh-bg-subtle hover:border-white/20 hover:scale-[1.005]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm vh-text-main">Modern Flat</h3>
                    <span className="text-[10px] font-mono text-blue-400">Default & Minimal</span>
                  </div>
                </div>
                {preferences.uiStyle === "modern" && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/30">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 vh-text-muted">
                Clean flat cards, smooth transparencies, subtle overlays, and crisp hairline borders for low distraction.
              </p>

              {/* Mini visual mockup */}
              <div className="mt-4 rounded-lg border vh-border vh-bg-input p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-medium">Flat Preview</span>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.2 text-[10px] font-medium border border-emerald-500/30">
                    200 OK
                  </span>
                </div>
                <div className="h-6 w-full rounded border border-white/10 bg-white/5 flex items-center px-2 text-[10px] text-zinc-400">
                  Clean line input
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t vh-border-subtle flex items-center justify-between text-[11px] vh-text-dim">
              <span>Razor borders • Clean</span>
              <span className="font-mono text-[10px]">data-style="modern"</span>
            </div>
          </button>

          {/* Option B: Skeuomorphism */}
          <button
            onClick={() => {
              updatePreferences({ uiStyle: "skeuomorphic" });
              playTone("click");
            }}
            className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all ${
              preferences.uiStyle === "skeuomorphic"
                ? "border-2 border-amber-400/80 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-[1.01]"
                : "vh-border vh-bg-subtle hover:border-white/20 hover:scale-[1.005]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.4)]">
                    <Box size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm vh-text-main">Skeuomorphism</h3>
                    <span className="text-[10px] font-mono text-amber-400">3D Depth & Realism</span>
                  </div>
                </div>
                {preferences.uiStyle === "skeuomorphic" && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 vh-text-muted">
                Tactile 3D beveled cards, debossed inset inputs, physical keycap press down, and radiant hardware LED glow lights.
              </p>

              {/* Mini visual mockup */}
              <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 space-y-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-300 font-semibold">Physical Bevels</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399,inset_0_1px_2px_white]" />
                </div>
                <div className="h-6 w-full rounded border border-white/20 bg-gradient-to-b from-white/10 to-black/30 flex items-center justify-center text-[10px] font-bold text-amber-200 shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]">
                  Tactile Keycap
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t vh-border-subtle flex items-center justify-between text-[11px] vh-text-dim">
              <span>3D Bevel • Inset • LEDs</span>
              <span className="font-mono text-[10px]">data-style="skeuomorphic"</span>
            </div>
          </button>

          {/* Option C: Neubrutalism */}
          <button
            onClick={() => {
              updatePreferences({ uiStyle: "neubrutalism" });
              playTone("click");
            }}
            className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all ${
              preferences.uiStyle === "neubrutalism"
                ? "border-2 border-pink-400/90 bg-pink-500/10 shadow-xl shadow-pink-500/10 scale-[1.01]"
                : "vh-border vh-bg-subtle hover:border-white/20 hover:scale-[1.005]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 border-2 border-pink-400 shadow-[2px_2px_0px_#f472b6]">
                    <Shapes size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm vh-text-main">Neubrutalism</h3>
                    <span className="text-[10px] font-mono text-pink-400">Bold & Offset Shadows</span>
                  </div>
                </div>
                {preferences.uiStyle === "neubrutalism" && (
                  <span className="flex items-center gap-1 rounded bg-pink-500 px-2 py-0.5 text-[11px] font-black text-black border-2 border-black shadow-[2px_2px_0px_#000]">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 vh-text-muted">
                High-contrast solid borders, hard 4px drop shadows with zero blur, snappy push-down clicks, and retro stamps.
              </p>

              {/* Mini visual mockup */}
              <div className="mt-4 rounded-lg border-2 border-current bg-pink-950/20 p-3 space-y-2 shadow-[3px_3px_0px_currentColor]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-pink-300">Retro Stamp</span>
                  <span className="rounded border-2 border-black bg-yellow-300 px-1.5 text-[9px] font-black text-black shadow-[1.5px_1.5px_0px_#000]">
                    NEW
                  </span>
                </div>
                <div className="h-6 w-full rounded border-2 border-black bg-pink-400 flex items-center justify-center text-[10px] font-black text-black shadow-[2px_2px_0px_#000]">
                  PUSH BUTTON
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t vh-border-subtle flex items-center justify-between text-[11px] vh-text-dim">
              <span>Hard 4px Shadow • Zero Blur</span>
              <span className="font-mono text-[10px]">data-style="neubrutalism"</span>
            </div>
          </button>

          {/* Option D: Glassmorphism */}
          <button
            onClick={() => {
              updatePreferences({ uiStyle: "glassmorphism" });
              playTone("click");
            }}
            className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all ${
              preferences.uiStyle === "glassmorphism"
                ? "border-2 border-cyan-400/90 bg-cyan-500/10 shadow-xl shadow-cyan-500/10 scale-[1.01]"
                : "vh-border vh-bg-subtle hover:border-white/20 hover:scale-[1.005]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 backdrop-blur-md shadow-[0_4px_12px_rgba(6,182,212,0.25)]">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm vh-text-main">Glassmorphism</h3>
                    <span className="text-[10px] font-mono text-cyan-400">Frosted Glass & Depth</span>
                  </div>
                </div>
                {preferences.uiStyle === "glassmorphism" && (
                  <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 vh-text-muted">
                Translucent frosted glass blur (20px), specular highlights, diffuse ambient glow, and floating depth.
              </p>

              {/* Mini visual mockup */}
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md p-3 space-y-2 shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-300 font-semibold">Frosted Layer</span>
                  <span className="rounded-full bg-cyan-500/20 backdrop-blur-sm text-cyan-300 px-2 py-0.5 text-[9px] font-bold border border-cyan-400/40">
                    GLOW
                  </span>
                </div>
                <div className="h-6 w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-[10px] font-medium text-cyan-200">
                  Translucent Pill
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t vh-border-subtle flex items-center justify-between text-[11px] vh-text-dim">
              <span>Frosted Blur • Specular Sheen</span>
              <span className="font-mono text-[10px]">data-style="glassmorphism"</span>
            </div>
          </button>

          {/* Option E: Cyberpunk HUD */}
          <button
            onClick={() => {
              updatePreferences({ uiStyle: "cyberpunk" });
              playTone("click");
            }}
            className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all ${
              preferences.uiStyle === "cyberpunk"
                ? "border-2 border-emerald-400/90 bg-emerald-500/10 shadow-xl shadow-emerald-500/10 scale-[1.01]"
                : "vh-border vh-bg-subtle hover:border-white/20 hover:scale-[1.005]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    <Terminal size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm vh-text-main font-mono">Cyber HUD</h3>
                    <span className="text-[10px] font-mono text-emerald-400">Sci-Fi Terminal</span>
                  </div>
                </div>
                {preferences.uiStyle === "cyberpunk" && (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-300 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    <Check size={12} /> ACTIVE
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 vh-text-muted">
                Futuristic sci-fi HUD aesthetic, hairline neon borders, micro-grid backdrop, and monospace terminal brackets.
              </p>

              {/* Mini visual mockup */}
              <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-950/20 p-3 space-y-2 shadow-[0_0_16px_rgba(16,185,129,0.2)] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold tracking-wider">[ HUD_V2 ]</span>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold border border-emerald-500/50">
                    ONLINE
                  </span>
                </div>
                <div className="h-6 w-full rounded border border-emerald-500/50 bg-black/60 flex items-center justify-center text-[10px] font-bold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  &gt; RUN_SYS
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t vh-border-subtle flex items-center justify-between text-[11px] vh-text-dim">
              <span>Neon Hairline • Micro-Grid</span>
              <span className="font-mono text-[10px]">data-style="cyberpunk"</span>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Icon Appearance & Styling System */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
              <Stamp size={20} />
            </div>

            <div>
              <h2 className="font-bold text-sm vh-text-main">Icon Presentation Theme</h2>
              <p className="text-xs vh-text-dim">
                Select how icons, navigation badges, and telemetry indicators are visually highlighted.
              </p>
            </div>
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
                  updatePreferences({ iconStyle: item.id });
                  playTone("click");
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

      {/* 3. Theme Presets (Curated Themes) */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
              <Palette size={20} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm vh-text-main">Developer Theme Presets</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold vh-text-muted">
                  {AVAILABLE_THEMES.length} Curated Themes
                </span>
              </div>
              <p className="text-xs vh-text-dim">
                Hand-curated dark & light palettes: Midnight Slate, Carbon Pro, Matrix Emerald, Tokyo Night, Nordic Frost, Retro Amber CRT, Neon Synthwave, Sepia Warm, Sky Mist, Warm Off-White, and Clean White.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {AVAILABLE_THEMES.map((t) => {
            const isSelected = preferences.theme === t.id;
            const isLightCard =
              t.isLight ??
              (t.id === "light" || t.id === "off-white" || t.id === "sky-mist");

            return (
              <button
                key={t.id}
                onClick={() => {
                  updatePreferences({ theme: t.id });
                  playTone("click");
                }}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-2 vh-border-accent shadow-lg shadow-blue-500/10 scale-[1.02]"
                    : "vh-border hover:border-white/20 hover:scale-[1.01]"
                } ${t.cardBg}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold text-xs ${
                        isLightCard ? "text-zinc-900" : "text-slate-100"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isLightCard
                          ? "bg-black/10 text-zinc-700"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {t.tag}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-[11px] leading-4 line-clamp-2 ${
                      isLightCard ? "text-zinc-600" : "text-slate-400"
                    }`}
                  >
                    {t.desc}
                  </p>
                </div>

                <div
                  className={`mt-4 flex items-center justify-between border-t pt-2.5 ${
                    isLightCard ? "border-black/10" : "border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.accentDot}`} />
                    <span
                      className={`text-[10px] font-mono uppercase ${
                        isLightCard ? "text-zinc-500" : "text-slate-400"
                      }`}
                    >
                      {t.id}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-500">
                      <Check size={13} /> Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Sidebar Navigation Behavior */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <PanelLeftClose size={20} />
          </div>

          <div>
            <h2 className="font-bold text-sm vh-text-main">Sidebar & Layout Mode</h2>
            <p className="text-xs vh-text-dim">
              Configure compact icon-only strip and hover auto-expansion.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border vh-border vh-bg-input p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold vh-text-main">Collapsible Icon-Only Mode</p>
                <p className="mt-1 text-[11px] vh-text-dim">
                  Renders the sidebar as a compact 64px icon strip, maximizing table space.
                </p>
              </div>

              <button
                onClick={() => {
                  updatePreferences({ sidebarCollapsed: !preferences.sidebarCollapsed });
                  playTone("click");
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  preferences.sidebarCollapsed ? "bg-blue-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    preferences.sidebarCollapsed ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="mt-3 text-[11px] font-medium vh-text-accent">
              Status: {preferences.sidebarCollapsed ? "Icon-Only Mode Active (Expands on Hover)" : "Always Expanded"}
            </p>
          </div>

          <div className="rounded-xl border vh-border vh-bg-input p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold vh-text-main">Auto-Expand on Hover</p>
                <p className="mt-1 text-[11px] vh-text-dim">
                  Hovering over the icon strip smoothly expands labels and active project info.
                </p>
              </div>

              <button
                onClick={() => {
                  updatePreferences({ sidebarHoverExpand: !preferences.sidebarHoverExpand });
                  playTone("click");
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  preferences.sidebarHoverExpand ? "bg-blue-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    preferences.sidebarHoverExpand ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="mt-3 text-[11px] font-medium text-emerald-400">
              Enabled: Hovering smoothly reveals full navigation
            </p>
          </div>
        </div>
      </section>

      {/* 5. JSON Output & Formatting Settings */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <Code2 size={20} />
          </div>

          <div>
            <h2 className="font-bold text-sm vh-text-main">JSON Output & Viewer Preferences</h2>
            <p className="text-xs vh-text-dim">
              Set default view modes and line wrapping for network payloads and log data.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider vh-text-dim">
              Default JSON View Mode
            </span>
            <select
              value={preferences.jsonViewerMode}
              onChange={(e) => updatePreferences({ jsonViewerMode: e.target.value as JsonViewerMode })}
              className={selectClassName}
            >
              <option value="tree">Interactive Collapsible Tree</option>
              <option value="raw">Raw Formatted Code Block</option>
            </select>
            <span className="block text-[11px] vh-text-dim">
              Tree allows folding nested objects; Raw shows complete formatted text.
            </span>
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider vh-text-dim">
              Code Monospace Font
            </span>
            <select
              value={preferences.fontFamily}
              onChange={(e) => updatePreferences({ fontFamily: e.target.value as FontFamily })}
              className={selectClassName}
            >
              <option value="mono">System Monospace (Clean & Fast)</option>
              <option value="code">JetBrains / Fira Code (Ligatures)</option>
              <option value="sans">Modern Sans-Serif</option>
            </select>
            <span className="block text-[11px] vh-text-dim">
              Applied across preformatted JSON and terminal logs.
            </span>
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider vh-text-dim">
              Audio Feedback
            </span>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  updatePreferences({ soundAlerts: !preferences.soundAlerts });
                  playTone("click");
                }}
                className={`flex items-center gap-2 rounded-xl border vh-border px-3.5 py-2 text-xs font-semibold transition ${
                  preferences.soundAlerts
                    ? "vh-bg-accent vh-text-accent border-2 vh-border-accent"
                    : "vh-bg-input vh-text-dim hover:text-white"
                }`}
              >
                {preferences.soundAlerts ? <Volume2 size={15} /> : <VolumeX size={15} />}
                {preferences.soundAlerts ? "Audio Active" : "Muted"}
              </button>

              <button
                type="button"
                onClick={testAudio}
                className="rounded-xl border vh-border px-3 py-2 text-xs vh-text-muted hover:text-white hover:bg-white/5 transition"
              >
                Test Chime
              </button>
            </div>
            <span className="block text-[11px] vh-text-dim">
              Synthesizes subtle audio chimes on error logs & failed requests.
            </span>
          </label>
        </div>
      </section>

      {/* 6. Accent Color & Density */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <Sparkles size={20} />
          </div>

          <div>
            <h2 className="font-bold text-sm vh-text-main">Accent Color & Spacing</h2>
            <p className="text-xs vh-text-dim">
              Refine your highlight color and interface spacing.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Accents */}
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

          {/* Density & Formatting */}
          <div className="grid gap-5 sm:grid-cols-2 pt-2 border-t vh-border">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider vh-text-dim">
                Interface Density
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {[
                  {
                    id: "comfortable",
                    label: "Comfortable",
                    desc: "Spacious layout with relaxed breathing room",
                  },
                  {
                    id: "standard",
                    label: "Standard",
                    desc: "Balanced medium density for everyday work",
                  },
                  {
                    id: "compact",
                    label: "Compact",
                    desc: "Dense layout for high-volume logs",
                  },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      updatePreferences({ density: d.id as Density });
                      playTone("click");
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      preferences.density === d.id
                        ? "border-2 vh-border-accent vh-bg-accent font-semibold"
                        : "vh-border vh-bg-input vh-text-main hover:border-white/20"
                    }`}
                  >
                    <p className="text-xs font-semibold">{d.label}</p>
                    <p className="mt-0.5 text-[11px] vh-text-dim">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider vh-text-dim">
                Timestamp Display
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "relative", label: "Relative (2m ago)" },
                  { id: "absolute", label: "Time (14:32:05)" },
                  { id: "full", label: "Full Date & Time" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      updatePreferences({ timestampFormat: t.id as TimestampFormat });
                      playTone("click");
                    }}
                    className={`rounded-xl border p-2.5 text-center transition ${
                      preferences.timestampFormat === t.id
                        ? "border-2 vh-border-accent vh-bg-accent font-semibold"
                        : "vh-border vh-bg-input vh-text-main hover:border-white/20"
                    }`}
                  >
                    <p className="text-[11px] font-medium">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Project Scoping & Stream Behavior */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
            <SlidersHorizontal size={20} />
          </div>

          <div>
            <h2 className="font-bold text-sm vh-text-main">Telemetry Fetching Limits</h2>
            <p className="text-xs vh-text-dim">
              Set default project view and fine-tune live streaming features.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Default Project Filter */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider vh-text-dim">
              <Boxes size={14} className="vh-text-accent" />
              Default Active Project
            </span>

            <select
              value={preferences.selectedProject}
              onChange={(e) => updatePreferences({ selectedProject: e.target.value })}
              className={selectClassName}
            >
              <option value="ALL">All Applications (Combined Telemetry)</option>
              {apps.map((a) => (
                <option key={a.app_name} value={a.app_name}>
                  {a.app_name}
                </option>
              ))}
            </select>

            <span className="block text-[11px] vh-text-dim">
              {preferences.selectedProject === "ALL"
                ? "Currently showing telemetry from all apps."
                : `Currently filtered to "${preferences.selectedProject}".`}
            </span>
          </label>

          {/* Refresh interval */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider vh-text-dim">
              <Clock3 size={14} className="vh-text-accent" />
              Polling Interval
            </span>

            <select
              value={String(preferences.refreshInterval)}
              onChange={(e) => updatePreferences({ refreshInterval: Number(e.target.value) })}
              className={selectClassName}
            >
              <option value="1">Every 1 second (Ultra-fast)</option>
              <option value="2">Every 2 seconds</option>
              <option value="5">Every 5 seconds (Recommended)</option>
              <option value="10">Every 10 seconds</option>
              <option value="30">Every 30 seconds</option>
            </select>

            <span className="block text-[11px] vh-text-dim">
              WebSocket events update instantly regardless of poll interval.
            </span>
          </label>

          {/* Log Limit */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider vh-text-dim">
              <Database size={14} className="vh-text-accent" />
              Console Log Limit
            </span>

            <select
              value={String(preferences.logLimit)}
              onChange={(e) => updatePreferences({ logLimit: Number(e.target.value) })}
              className={selectClassName}
            >
              <option value="25">25 log entries</option>
              <option value="50">50 log entries</option>
              <option value="100">100 log entries (Standard)</option>
              <option value="200">200 log entries (High volume)</option>
            </select>
          </label>

          {/* Network Limit */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider vh-text-dim">
              <Globe size={14} className="vh-text-accent" />
              Network Request Limit
            </span>

            <select
              value={String(preferences.networkLimit)}
              onChange={(e) => updatePreferences({ networkLimit: Number(e.target.value) })}
              className={selectClassName}
            >
              <option value="25">25 HTTP requests</option>
              <option value="50">50 HTTP requests</option>
              <option value="100">100 HTTP requests (Standard)</option>
              <option value="200">200 HTTP requests (High volume)</option>
            </select>
          </label>
        </div>

        {/* Toggles */}
        <div className="mt-6 pt-5 border-t vh-border grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.showDedupeBadges}
              onChange={(e) => updatePreferences({ showDedupeBadges: e.target.checked })}
              className="h-4 w-4 rounded border-gray-600 bg-transparent text-blue-500 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold vh-text-main">Deduplication Badges</p>
              <p className="text-[11px] vh-text-dim">Display occurrence counts (e.g. ×4) on repeating messages</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.autoScrollLogs}
              onChange={(e) => updatePreferences({ autoScrollLogs: e.target.checked })}
              className="h-4 w-4 rounded border-gray-600 bg-transparent text-blue-500 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold vh-text-main">Auto-Scroll Console</p>
              <p className="text-[11px] vh-text-dim">Automatically follow live incoming log records</p>
            </div>
          </label>
        </div>
      </section>

      {/* 8. Server Diagnostics */}
      <section className="rounded-xl border vh-border vh-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border vh-border vh-bg-accent p-2.5 vh-text-accent">
              <Server size={20} />
            </div>

            <div>
              <h2 className="font-bold text-sm vh-text-main">Backend Agent Health</h2>
              <p className="text-xs vh-text-dim">
                Real-time connection test and environment telemetry.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void checkHealth()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border vh-border vh-bg-input px-3.5 py-2 text-xs font-semibold vh-text-main hover:border-white/20 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Ping Server
          </button>
        </div>

        <div className="space-y-3 divide-y vh-border-subtle rounded-xl border vh-border vh-bg-subtle text-xs">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="vh-text-dim">Health Status</span>
            <span className="flex items-center gap-2 font-semibold">
              {health === "online" ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={15} /> Online {latency ? `(${latency} ms)` : ""}
                </span>
              ) : health === "offline" ? (
                <span className="flex items-center gap-1.5 text-red-400">
                  <XCircle size={15} /> Unreachable
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <RefreshCw size={14} className="animate-spin" /> Checking...
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="vh-text-dim">Transport Layer</span>
            <span className="font-mono vh-text-main">HTTP + Socket.IO v4</span>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="vh-text-dim">Storage Engine</span>
            <span className="font-mono vh-text-main">better-sqlite3 (WAL Mode)</span>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="vh-text-dim">Active Origin</span>
            <span className="font-mono vh-text-main">
              {typeof window !== "undefined" ? window.location.origin : "http://localhost:4317"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
