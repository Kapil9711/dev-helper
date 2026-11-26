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
  GitBranch,
  FolderGit2,
  Disc,
  Music,
  Wrench,
} from "lucide-react";
import { ConnectionStatus } from "./connection-status";
import {
  useDashboardPreferences,
  AVAILABLE_THEMES,
  playTone,
} from "@/lib/prefrences";
import {
  useAppsQuery,
  useServerInfoQuery,
  useGitStatusQuery,
} from "@/lib/queries";

const titles: Record<string, string> = {
  "/": "Overview",
  "/network": "Network",
  "/docs": "API Docs",
  "/performance": "Performance",
  "/console": "Console",
  "/events": "Events",
  "/projects": "Projects",
  "/settings": "Settings",
  "/git": "Git Dashboard",
  "/utility": "Utility Dashboard",
};

export function Topbar() {
  const pathname = usePathname();
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  const { preferences, updatePreferences, toggleSidebar } =
    useDashboardPreferences();
  const appsQuery = useAppsQuery();
  const serverInfoQuery = useServerInfoQuery();
  const gitStatusQuery = useGitStatusQuery();

  const isGitServer = serverInfoQuery.data?.mode === "git";
  const isGitPath = pathname.startsWith("/git");
  const isGitMode = isGitServer || isGitPath;

  const isMusicServer = serverInfoQuery.data?.mode === "music";
  const isMusicPath = pathname.startsWith("/music");
  const isMusicMode = isMusicServer || isMusicPath;

  const isUtilityServer = serverInfoQuery.data?.mode === "utility";
  const isUtilityPath = pathname.startsWith("/utility");
  const isUtilityMode = isUtilityServer || isUtilityPath;

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

  const currentProjectName =
    serverInfoQuery.data?.projectName || "Current Repository";
  const currentBranchName =
    gitStatusQuery.data?.currentBranch?.current ||
    serverInfoQuery.data?.currentBranch ||
    "main";

  return (
    <header
      className="sticky top-0 flex h-16 items-center justify-between border-b vh-border vh-bg-sidebar/95 px-4 backdrop-blur-md transition-colors md:px-7"
      style={{ zIndex: 90 }}
    >
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
              {isUtilityMode
                ? "VH Utility"
                : isMusicMode
                ? "VH Music"
                : isGitMode
                ? "Git Dashboard"
                : titles[normalizedPath] ?? "Dashboard"}
            </h1>

            {!isGitMode && !isMusicMode && !isUtilityMode && preferences.selectedProject !== "ALL" && (
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
            {isUtilityMode ? (
              <>
                VH Utility <span className="mx-1">/</span> MERN Dev Suite
              </>
            ) : isMusicMode ? (
              <>
                VH Music <span className="mx-1">/</span> Hi-Fi Retro Player
              </>
            ) : isGitMode ? (
              <>
                VH Git <span className="mx-1">/</span> {currentProjectName}
              </>
            ) : (
              <>
                VH DevTools <span className="mx-1">/</span>{" "}
                {titles[normalizedPath] ?? "Dashboard"}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* IN UTILITY MODE: Show Utility Badge */}
        {isUtilityMode ? (
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 shadow-xs">
            <Wrench size={14} />
            <span className="hidden sm:inline">Node.js Engine Active</span>
          </div>
        ) : isMusicMode ? (
          <div className="flex items-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-400 shadow-xs">
            <Disc size={14} className="animate-[spin_6s_linear_infinite]" />
            <span className="hidden sm:inline">Hi-Fi Audio Player</span>
          </div>
        ) : isGitMode ? (
          <>
            {/* Current Project / Repository Indicator */}
            <div
              title={`Active Git Repository: ${serverInfoQuery.data?.repoRoot || currentProjectName}`}
              className="flex items-center gap-2 rounded-xl border vh-border vh-bg-card px-3 py-1.5 text-xs font-semibold vh-text-main shadow-xs"
            >
              <FolderGit2 size={14} className="vh-text-accent" />
              <span className="max-w-[120px] truncate sm:max-w-[170px]">
                {currentProjectName}
              </span>
            </div>

            {/* Active Branch Badge */}
            <div
              title={`Active Branch: ${currentBranchName}`}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 shadow-xs"
            >
              <GitBranch size={13} />
              <span className="max-w-[100px] truncate sm:max-w-[140px]">
                {currentBranchName}
              </span>
              {Boolean(gitStatusQuery.data?.currentBranch?.ahead) && (
                <span className="text-[10px] font-mono text-emerald-300">
                  ↑{gitStatusQuery.data?.currentBranch?.ahead}
                </span>
              )}
              {Boolean(gitStatusQuery.data?.currentBranch?.behind) && (
                <span className="text-[10px] font-mono text-amber-300">
                  ↓{gitStatusQuery.data?.currentBranch?.behind}
                </span>
              )}
            </div>

            {/* Working Tree Clean / Modified indicator */}
            {gitStatusQuery.data && (
              <div
                className={`hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                  (gitStatusQuery.data.files?.length || 0) === 0
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    (gitStatusQuery.data.files?.length || 0) === 0
                      ? "bg-emerald-400"
                      : "bg-amber-400"
                  }`}
                />
                <span>
                  {(gitStatusQuery.data.files?.length || 0) === 0
                    ? "Clean"
                    : `${gitStatusQuery.data.files.length} changes`}
                </span>
              </div>
            )}
          </>
        ) : (
          /* IN LOGS DASHBOARD MODE: Global Project Switcher Dropdown */
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
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl border vh-border vh-bg-modal p-1.5 shadow-2xl backdrop-blur-xl"
                style={{ zIndex: 100 }}
              >
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
                              isRecent
                                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                : "bg-zinc-500"
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
        )}

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
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl border vh-border vh-bg-modal p-1.5 shadow-2xl backdrop-blur-xl"
              style={{ zIndex: 100 }}
            >
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
            <div
              className="absolute right-0 mt-2 w-60 rounded-xl border vh-border vh-bg-modal p-1.5 shadow-2xl backdrop-blur-xl"
              style={{ zIndex: 100 }}
            >
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
