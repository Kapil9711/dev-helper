"use client";

import { useState, useEffect } from "react";
import {
  Settings,
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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGitConfigQuery, queryKeys } from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import {
  useDashboardPreferences,
  AVAILABLE_THEMES,
  playTone,
  type UIStyle,
  type Density,
} from "@/lib/prefrences";

export function GitSettings() {
  const queryClient = useQueryClient();
  const configQuery = useGitConfigQuery();
  const { preferences, updatePreferences } = useDashboardPreferences();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const uiStyles: { id: UIStyle; name: string; desc: string }[] = [
    { id: "modern", name: "Modern", desc: "Clean borders and soft rounded corners" },
    { id: "skeuomorphic", name: "Skeuomorphic", desc: "Tactile bevels, metallic gradients & inset shadows" },
    { id: "neubrutalism", name: "Neubrutalism", desc: "Bold black borders, hard shadows & high contrast" },
    { id: "glassmorphism", name: "Glassmorphism", desc: "Frosted glass acrylic blur with luminous borders" },
    { id: "cyberpunk", name: "Cyberpunk", desc: "Neon edges, digital glow & futuristic typography" },
  ];

  const densities: { id: Density; name: string; desc: string }[] = [
    { id: "comfortable", name: "Comfortable (15.5px)", desc: "Relaxed spacing and larger typography" },
    { id: "standard", name: "Standard (14.5px)", desc: "Balanced everyday layout" },
    { id: "compact", name: "Compact (13.5px)", desc: "High density data view" },
  ];

  return (
    <div className="space-y-6">
      {/* Git Identity Settings Card */}
      <div className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b vh-border pb-4 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base vh-text-main">
              Git Author Profile
            </h3>
            <p className="text-xs vh-text-dim">
              Configure your local git user and commit signing metadata
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
      </div>

      {/* Dashboard UI & Theme Settings Card */}
      <div className="rounded-2xl border vh-border vh-bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b vh-border pb-4 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base vh-text-main">
              Dashboard Theme & UI Styles
            </h3>
            <p className="text-xs vh-text-dim">
              Personalize colors, styling paradigms, layout density, and audio feedback
            </p>
          </div>
        </div>

        {/* UI Style Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider vh-text-dim mb-2.5">
            Design Paradigm
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uiStyles.map((style) => {
              const isSelected = preferences.uiStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    updatePreferences({ uiStyle: style.id });
                    playTone("click");
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                    isSelected
                      ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
                      : "vh-border vh-bg-app hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs vh-text-main">
                      {style.name}
                    </span>
                    {isSelected && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <span className="text-[11px] vh-text-dim mt-1">
                    {style.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Density Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider vh-text-dim mb-2.5">
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
                      ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
                      : "vh-border vh-bg-app hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs vh-text-main">{d.name}</span>
                    {isSelected && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <span className="text-[11px] vh-text-dim mt-1">{d.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Themes Grid */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider vh-text-dim mb-2.5">
            Color Theme ({AVAILABLE_THEMES.length} Available)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {AVAILABLE_THEMES.map((t) => {
              const isSelected = preferences.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    updatePreferences({ theme: t.id });
                    playTone("click");
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                    isSelected
                      ? "border-emerald-500/50 bg-emerald-500/10 font-bold vh-text-main shadow-xs"
                      : "vh-border vh-bg-app vh-text-dim hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${t.accentDot}`} />
                    <span className="truncate">{t.name}</span>
                  </span>
                  {isSelected && <Check size={13} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound Feedback Toggle */}
        <div className="flex items-center justify-between border-t vh-border pt-4">
          <div>
            <p className="text-xs font-semibold vh-text-main">Interface Audio Effects</p>
            <p className="text-[11px] vh-text-dim">Subtle click & completion audio feedback</p>
          </div>
          <button
            onClick={() => {
              const next = !preferences.soundAlerts;
              updatePreferences({ soundAlerts: next });
              if (next) playTone("click");
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              preferences.soundAlerts
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "vh-border vh-bg-card vh-text-dim"
            }`}
          >
            {preferences.soundAlerts ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{preferences.soundAlerts ? "Enabled" : "Muted"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
