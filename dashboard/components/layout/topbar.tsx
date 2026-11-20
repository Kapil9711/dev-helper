"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  Check,
  Palette,
  X,
  PanelLeft,
  Sparkles,
  Box,
  Shapes,
  Layers,
  Terminal,
} from "lucide-react";
import { ConnectionStatus } from "./connection-status";
import {
  useDashboardPreferences,
  AVAILABLE_THEMES,
  playTone,
  type UIStyle,
} from "@/lib/prefrences";
import { useAppsQuery } from "@/lib/queries";

const titles: Record<string, string> = {
  "/": "Overview",
  "/network": "Network",
  "/docs": "API Docs",
  "/console": "Console",
  "/events": "Events",
  "/projects": "Projects",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  const { preferences, updatePreferences, toggleSidebar } =
    useDashboardPreferences();
  const appsQuery = useAppsQuery();
  const apps = appsQuery.data?.data ?? [];

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
      if (
        themeRef.current &&
        !themeRef.current.contains(event.target as Node)
      ) {
        setThemeDropdownOpen(false);
      }
      if (
        styleRef.current &&
        !styleRef.current.contains(event.target as Node)
      ) {
        setStyleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSidebarToggle = () => {
    toggleSidebar();
    playTone("click");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b vh-border vh-bg-sidebar/95 px-4 backdrop-blur-md transition-colors md:px-7">
      <div className="flex items-center gap-3">
        {/* Mobile / Desktop Quick Sidebar Toggle */}
        <button
          onClick={handleSidebarToggle}
          title={preferences.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border vh-border vh-bg-card vh-text-dim hover:text-white hover:border-white/20 transition"
        >
          <PanelLeft size={16} />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold vh-text-main">
              {titles[normalizedPath] ?? "Dashboard"}
            </h1>
            {preferences.selectedProject !== "ALL" && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold vh-bg-accent vh-text-accent border vh-border-accent">
                <Boxes size={11} />
                {preferences.selectedProject}
                <button
                  onClick={() => updatePreferences({ selectedProject: "ALL" })}
                  title="Clear project filter"
                  className="ml-1 hover:opacity-75"
                >
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] vh-text-dim">
            VH DevTools <span className="mx-1">/</span>{" "}
            {titles[normalizedPath] ?? "Dashboard"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Global Project Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProjectDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border vh-border vh-bg-card px-3 py-1.5 text-xs font-semibold vh-text-main transition hover:border-white/20 shadow-xs"
          >
            <Boxes size={14} className="vh-text-accent" />
            <span className="max-w-[120px] truncate sm:max-w-[160px]">
              {preferences.selectedProject === "ALL"
                ? `All Projects (${apps.length})`
                : preferences.selectedProject}
            </span>
            <ChevronDown size={13} className="vh-text-dim" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border vh-border vh-bg-modal p-1.5 shadow-2xl backdrop-blur-xl z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider vh-text-dim">
                Filter by Project
              </div>
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                <button
                  onClick={() => {
                    updatePreferences({ selectedProject: "ALL" });
                    setProjectDropdownOpen(false);
                    playTone("click");
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                    preferences.selectedProject === "ALL"
                      ? "vh-bg-accent vh-text-accent font-semibold"
                      : "vh-text-main hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Boxes size={14} />
                    All Projects ({apps.length})
                  </span>
                  {preferences.selectedProject === "ALL" && <Check size={14} />}
                </button>

                {apps.map((app) => {
                  const isSelected = preferences.selectedProject === app.app_name;
                  const isRecent = Date.now() - app.last_seen < 60_000;
                  return (
                    <button
                      key={app.app_name}
                      onClick={() => {
                        updatePreferences({ selectedProject: app.app_name });
                        setProjectDropdownOpen(false);
                        playTone("click");
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        isSelected
                          ? "vh-bg-accent vh-text-accent font-semibold"
                          : "vh-text-main hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isRecent ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-zinc-500"
                          }`}
                        />
                        <span className="truncate">{app.app_name}</span>
                      </span>
                      {isSelected && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}

                {apps.length === 0 && (
                  <p className="px-3 py-3 text-center text-xs vh-text-muted">
                    No projects registered yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Theme Switcher */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeDropdownOpen((prev) => !prev)}
            title="Switch theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border vh-border vh-bg-card vh-text-dim transition hover:border-white/20 hover:text-white"
          >
            <Palette size={16} />
          </button>

          {themeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border vh-border vh-bg-modal p-1.5 shadow-2xl backdrop-blur-xl z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider vh-text-dim">
                Dashboard Theme ({AVAILABLE_THEMES.length})
              </div>
              <div className="max-h-72 space-y-0.5 overflow-y-auto">
                {AVAILABLE_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      updatePreferences({ theme: t.id });
                      setThemeDropdownOpen(false);
                      playTone("click");
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                      preferences.theme === t.id
                        ? "vh-bg-accent vh-text-accent font-semibold"
                        : "vh-text-main hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${t.accentDot}`} />
                      <span className="truncate">{t.name}</span>
                    </span>
                    {preferences.theme === t.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick UI Style Switcher (Modern / Skeuo / Brutal / Glass / Cyber) */}
        <div className="relative" ref={styleRef}>
          <button
            onClick={() => setStyleDropdownOpen((prev) => !prev)}
            title={`UI Style: ${preferences.uiStyle}`}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-2.5 py-1.5 text-xs font-semibold vh-text-main transition hover:border-white/20 shadow-xs"
          >
            {preferences.uiStyle === "skeuomorphic" ? (
              <Box size={14} className="text-amber-400" />
            ) : preferences.uiStyle === "neubrutalism" ? (
              <Shapes size={14} className="text-pink-400" />
            ) : preferences.uiStyle === "glassmorphism" ? (
              <Layers size={14} className="text-cyan-400" />
            ) : preferences.uiStyle === "cyberpunk" ? (
              <Terminal size={14} className="text-emerald-400" />
            ) : (
              <Sparkles size={14} className="vh-text-accent" />
            )}
            <span className="hidden sm:inline capitalize">
              {preferences.uiStyle === "skeuomorphic"
                ? "Skeuo"
                : preferences.uiStyle === "neubrutalism"
                  ? "Brutal"
                  : preferences.uiStyle === "glassmorphism"
                    ? "Glass"
                    : preferences.uiStyle === "cyberpunk"
                      ? "Cyber"
                      : "Modern"}
            </span>
          </button>

          {styleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border vh-border vh-bg-modal p-1.5 shadow-2xl backdrop-blur-xl z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider vh-text-dim">
                Design System Paradigm
              </div>
              <div className="space-y-1">
                {(
                  [
                    {
                      id: "modern",
                      label: "Modern Flat",
                      desc: "Clean minimal & razor borders",
                      icon: Sparkles,
                      color: "text-blue-400",
                    },
                    {
                      id: "skeuomorphic",
                      label: "Skeuomorphism",
                      desc: "3D bevels, depth & LED glow",
                      icon: Box,
                      color: "text-amber-400",
                    },
                    {
                      id: "neubrutalism",
                      label: "Neubrutalism",
                      desc: "Hard black shadow & click physics",
                      icon: Shapes,
                      color: "text-pink-400",
                    },
                    {
                      id: "glassmorphism",
                      label: "Glassmorphism",
                      desc: "Frosted blur & specular highlights",
                      icon: Layers,
                      color: "text-cyan-400",
                    },
                    {
                      id: "cyberpunk",
                      label: "Cyberpunk HUD",
                      desc: "Neon hairlines & sci-fi terminal",
                      icon: Terminal,
                      color: "text-emerald-400",
                    },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      updatePreferences({ uiStyle: s.id });
                      setStyleDropdownOpen(false);
                      playTone("click");
                    }}
                    className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                      preferences.uiStyle === s.id
                        ? "vh-bg-accent vh-text-accent font-semibold"
                        : "vh-text-main hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 text-left">
                      <s.icon size={15} className={`mt-0.5 shrink-0 ${s.color}`} />
                      <div>
                        <p className="font-bold leading-none">{s.label}</p>
                        <p className="mt-1 text-[10px] vh-text-dim">{s.desc}</p>
                      </div>
                    </div>
                    {preferences.uiStyle === s.id && <Check size={14} className="shrink-0 ml-1 mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connection status badge */}
        <ConnectionStatus />
      </div>
    </header>
  );
}
