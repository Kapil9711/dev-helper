"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  GitBranch,
  Globe,
  Save,
  Palette,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Layers,
  Zap,
  Box,
  Shapes,
  Terminal,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGitConfigQuery, queryKeys } from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import {
  useDashboardPreferences,
  AVAILABLE_THEMES,
  playTone,
  type Theme,
  type UIStyle,
  type IconStyle,
  type AccentColor,
  type Density,
} from "@/lib/prefrences";

export function GitSettings() {
  const queryClient = useQueryClient();
  const configQuery = useGitConfigQuery();
  const { preferences, updatePreferences, resetPreferences } =
    useDashboardPreferences();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (configQuery.data) {
      setUserName(configQuery.data.userName || "");
      setUserEmail(configQuery.data.userEmail || "");
      setDefaultBranch(configQuery.data.defaultBranch || "main");
    }
  }, [configQuery.data]);

  const handleSaveGitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await apiClient.saveGitConfig({
        userName,
        userEmail,
        defaultBranch,
      });
      if (res.success) {
        setSaveSuccess(true);
        playTone("success");
        await queryClient.invalidateQueries({ queryKey: queryKeys.gitConfig });
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        playTone("error");
      }
    } catch {
      playTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  const accentOptions: { id: AccentColor; name: string; dot: string }[] = [
    { id: "blue", name: "Electric Blue", dot: "bg-blue-500" },
    { id: "violet", name: "Amethyst Violet", dot: "bg-violet-500" },
    { id: "emerald", name: "Emerald Mint", dot: "bg-emerald-500" },
    { id: "amber", name: "Solar Amber", dot: "bg-amber-500" },
    { id: "rose", name: "Ruby Rose", dot: "bg-rose-500" },
    { id: "cyan", name: "Cyan Ice", dot: "bg-cyan-500" },
  ];

  const iconStyles = [
    {
      id: "default" as IconStyle,
      title: "Adaptive System",
      desc: "Matches current UI paradigm automatically",
      icon: Layers,
    },
    {
      id: "glow" as IconStyle,
      title: "Luminous Glow",
      desc: "Outer neon halo on active icons & badges",
      icon: Zap,
    },
    {
      id: "stamped" as IconStyle,
      title: "Brutalist Stamped",
      desc: "Chunky bordered stamp boxes with offset shadow",
      icon: Stamp,
    },
    {
      id: "minimal" as IconStyle,
      title: "Minimal Stroke",
      desc: "Clean line-work without shadows or halos",
      icon: SlidersHorizontal,
    },
  ];

  const uiStyles: { id: UIStyle; name: string; desc: string; icon: any; color: string }[] = [
    {
      id: "modern",
      name: "Modern Flat",
      desc: "Clean flat cards, smooth transparencies & crisp hairline borders",
      icon: Sparkles,
      color: "text-blue-400",
    },
    {
      id: "skeuomorphic",
      name: "Skeuomorphism",
      desc: "Tactile 3D beveled cards, debossed inset inputs & physical LED glow",
      icon: Box,
      color: "text-amber-400",
    },
    {
      id: "neubrutalism",
      name: "Neubrutalism",
      desc: "High-contrast solid borders, hard 4px offset shadow with zero blur",
      icon: Shapes,
      color: "text-pink-400",
    },
    {
      id: "glassmorphism",
      name: "Glassmorphism",
      desc: "Frosted glass blur (20px), specular sheen & diffuse ambient depth",
      icon: Layers,
      color: "text-cyan-400",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk HUD",
      desc: "Sci-fi terminal, neon hairlines, glowing indicators & monospace fonts",
      icon: Terminal,
      color: "text-emerald-400",
    },
  ];

  const densities: { id: Density; name: string; desc: string }[] = [
    { id: "comfortable", name: "Comfortable (15.5px)", desc: "Relaxed spacing and larger typography" },
    { id: "standard", name: "Standard (14.5px)", desc: "Balanced everyday layout" },
    { id: "compact", name: "Compact (13.5px)", desc: "High density data view" },
  ];

  const handleResetPreferences = () => {
    resetPreferences();
    setResetDone(true);
    playTone("click");
    setTimeout(() => setResetDone(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Git Identity Settings Card */}
      <section className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b vh-border pb-4 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base vh-text-main">
              Git Author Profile
            </h3>
            <p className="text-xs vh-text-dim">
              Configure your local git user and commit signing metadata for this repository
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGitConfig} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold vh-text-main mb-1.5">
              Git Author Name (`user.name`)
            </label>
            <div className="relative">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your Name"
                className="w-full rounded-xl border vh-border vh-bg-app px-3.5 py-2 pl-9 text-xs vh-text-main focus:outline-none focus:border-emerald-500/50"
              />
              <User size={14} className="absolute left-3 top-3 vh-text-dim" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold vh-text-main mb-1.5">
              Git Author Email (`user.email`)
            </label>
            <div className="relative">
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-xl border vh-border vh-bg-app px-3.5 py-2 pl-9 text-xs vh-text-main focus:outline-none focus:border-emerald-500/50"
              />
              <Mail size={14} className="absolute left-3 top-3 vh-text-dim" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold vh-text-main mb-1.5">
              Default Init Branch (`init.defaultBranch`)
            </label>
            <div className="relative">
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                className="w-full rounded-xl border vh-border vh-bg-app px-3.5 py-2 pl-9 text-xs vh-text-main focus:outline-none focus:border-emerald-500/50"
              />
              <GitBranch size={14} className="absolute left-3 top-3 vh-text-dim" />
            </div>
          </div>

          {configQuery.data?.remoteUrl && (
            <div>
              <label className="block text-xs font-semibold vh-text-main mb-1.5">
                Remote Origin URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={configQuery.data.remoteUrl}
                  className="w-full rounded-xl border vh-border vh-bg-app/50 px-3.5 py-2 pl-9 text-xs vh-text-dim font-mono cursor-default"
                />
                <Globe size={14} className="absolute left-3 top-3 vh-text-dim" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <Save size={13} />
              <span>{isSaving ? "Saving..." : "Save Git Config"}</span>
            </button>

            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Check size={14} />
                Git config updated
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 2. Accent Color & Spacing Section (NEW) */}
      <section className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b vh-border pb-4 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base vh-text-main">
              Accent Color & Spacing
            </h3>
            <p className="text-xs vh-text-dim">
              Refine your highlight color and interface density scaling across Git views
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Accent Color Options */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider vh-text-dim">
              Highlight Accent Color
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
                        ? "border-2 vh-border-accent vh-bg-accent shadow-xs scale-[1.02]"
                        : "vh-border vh-bg-input vh-text-main hover:border-white/20"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${acc.dot}`} />
                    <span className="truncate">{acc.name}</span>
                    {isSelected && <Check size={13} className="ml-auto vh-text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interface Density */}
          <div className="pt-4 border-t vh-border">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider vh-text-dim">
              Interface Density Scale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {densities.map((d) => {
                const isSelected = preferences.density === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      updatePreferences({ density: d.id });
                      playTone("click");
                    }}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                      isSelected
                        ? "border-2 vh-border-accent vh-bg-accent shadow-xs scale-[1.01]"
                        : "vh-border vh-bg-input hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs vh-text-main">{d.name}</span>
                      {isSelected && <Check size={14} className="vh-text-accent" />}
                    </div>
                    <span className="text-[11px] vh-text-dim mt-1">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Icon Presentation Theme Section (NEW) */}
      <section className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b vh-border pb-4 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <Stamp size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base vh-text-main">
              Icon Presentation Theme
            </h3>
            <p className="text-xs vh-text-dim">
              Select how icons, branch tags, and diff badges are visually emphasized
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {iconStyles.map((item) => {
            const isSelected = preferences.iconStyle === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  updatePreferences({ iconStyle: item.id });
                  playTone("click");
                }}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-2 vh-border-accent vh-bg-accent font-semibold shadow-xs scale-[1.01]"
                    : "vh-border vh-bg-input hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon size={16} className={isSelected ? "vh-text-accent" : "vh-text-dim"} />
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

      {/* 4. Design System Paradigm (UI Styles) */}
      <section className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b vh-border pb-4 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base vh-text-main">
              Design System Paradigm
            </h3>
            <p className="text-xs vh-text-dim">
              Switch the Git dashboard visual style between Modern Minimal, 3D Skeuomorphism, Neubrutalism, Glassmorphism, and Cyberpunk HUD
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {uiStyles.map((style) => {
            const isSelected = preferences.uiStyle === style.id;
            const Icon = style.icon;
            return (
              <button
                key={style.id}
                onClick={() => {
                  updatePreferences({ uiStyle: style.id });
                  playTone("click");
                }}
                className={`flex flex-col justify-between text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-2 vh-border-accent vh-bg-accent shadow-md scale-[1.02]"
                    : "vh-border vh-bg-input hover:border-white/20 hover:scale-[1.005]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={style.color} />
                      <span className="font-bold text-xs vh-text-main">{style.name}</span>
                    </div>
                    {isSelected && <Check size={13} className="vh-text-accent" />}
                  </div>
                  <p className="text-[11px] vh-text-dim mt-2 leading-relaxed">{style.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Developer Theme Presets (Curated Themes) */}
      <section className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b vh-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
              <Palette size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base vh-text-main">
                  Developer Theme Presets
                </h3>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold vh-text-muted">
                  {AVAILABLE_THEMES.length} Curated Themes
                </span>
              </div>
              <p className="text-xs vh-text-dim">
                Hand-curated dark & light palettes with high contrast code diff highlights
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                className={`flex items-center justify-between p-3.5 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? "border-2 vh-border-accent shadow-md scale-[1.02] font-bold"
                    : "vh-border hover:border-white/20 hover:scale-[1.005]"
                } ${t.cardBg}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`h-3 w-3 rounded-full shrink-0 ${t.accentDot}`} />
                  <span className={`truncate ${isLightCard ? "text-zinc-900" : "text-slate-100"}`}>
                    {t.name}
                  </span>
                </div>
                {isSelected && <Check size={14} className="vh-text-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Interface Audio Effects & Preferences Reset */}
      <section className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider vh-text-main">
              Interface Audio & Defaults
            </h3>
            <p className="text-[11px] vh-text-dim mt-0.5">
              Subtle click & operational audio cues, or reset all visual preferences to factory defaults
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = !preferences.soundAlerts;
                updatePreferences({ soundAlerts: next });
                if (next) playTone("click");
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                preferences.soundAlerts
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "vh-border vh-bg-input vh-text-dim"
              }`}
            >
              {preferences.soundAlerts ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{preferences.soundAlerts ? "Sound Enabled" : "Sound Muted"}</span>
            </button>

            <button
              onClick={handleResetPreferences}
              className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-input px-3 py-1.5 text-xs font-semibold vh-text-dim hover:text-slate-900 dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition"
            >
              <RotateCcw size={13} />
              <span>{resetDone ? "Preferences Reset!" : "Reset to Defaults"}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
