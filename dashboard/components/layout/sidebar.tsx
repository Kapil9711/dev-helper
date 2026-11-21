"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Code2,
  Network,
  Settings,
  Terminal,
  Zap,
  PanelLeftClose,
  Pin,
  BookOpen,
  Gauge,
  GitBranch,
  GitCommit,
  FolderGit2,
  Archive,
  FileCode,
  Disc,
  Music,
} from "lucide-react";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import { useServerInfoQuery, useGitStatusQuery } from "@/lib/queries";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tab?: string;
}

// Navigation links for VH Logs Dashboard (Git is removed as requested)
const logsNavigation: NavItem[] = [
  { label: "Overview", href: "/", icon: Activity },
  { label: "Network", href: "/network/", icon: Network },
  { label: "API Docs", href: "/docs/", icon: BookOpen },
  { label: "Performance", href: "/performance/", icon: Gauge },
  { label: "Console", href: "/console/", icon: Terminal },
  { label: "Events", href: "/events/", icon: Zap },
  { label: "Projects", href: "/projects/", icon: Boxes },
  { label: "Settings", href: "/settings/", icon: Settings },
];

// Navigation links for VH Git Dashboard (Only Git tabs & Git settings)
const gitNavigation: NavItem[] = [
  { label: "Diff & Staging", href: "/git/?tab=diff", tab: "diff", icon: FolderGit2 },
  { label: "Live File Editor", href: "/git/?tab=editor", tab: "editor", icon: Code2 },
  { label: "Commit Graph", href: "/git/?tab=log", tab: "log", icon: GitCommit },
  { label: "Branches & Merge", href: "/git/?tab=branches", tab: "branches", icon: GitBranch },
  { label: "Stash Manager", href: "/git/?tab=stash", tab: "stash", icon: Archive },
  { label: "Settings", href: "/git/?tab=settings", tab: "settings", icon: Settings },
];

// Navigation links for VH Music Dashboard (Initially only Song tab and Settings tab)
const musicNavigation: NavItem[] = [
  { label: "Song", href: "/music/?tab=song", tab: "song", icon: Disc },
  { label: "Settings", href: "/music/?tab=settings", tab: "settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { preferences, updatePreferences, toggleSidebar } = useDashboardPreferences();
  const serverInfoQuery = useServerInfoQuery();
  const gitStatusQuery = useGitStatusQuery();

  const isGitServer = serverInfoQuery.data?.mode === "git";
  const isGitPath = pathname.startsWith("/git");
  const isGitMode = isGitServer || isGitPath;

  const isMusicServer = serverInfoQuery.data?.mode === "music";
  const isMusicPath = pathname.startsWith("/music");
  const isMusicMode = isMusicServer || isMusicPath;

  const [isHovered, setIsHovered] = useState(false);
  const [currentGitTab, setCurrentGitTab] = useState("diff");
  const [currentMusicTab, setCurrentMusicTab] = useState("song");

  // Track active git tab from URL or custom events
  useEffect(() => {
    const syncGitTab = () => {
      if (typeof window === "undefined") return;
      const tab = new URLSearchParams(window.location.search).get("tab") || "diff";
      setCurrentGitTab(tab);
    };

    syncGitTab();

    const handleCustomTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setCurrentGitTab(detail);
    };

    window.addEventListener("vh-git-tab-change", handleCustomTab);
    window.addEventListener("popstate", syncGitTab);

    return () => {
      window.removeEventListener("vh-git-tab-change", handleCustomTab);
      window.removeEventListener("popstate", syncGitTab);
    };
  }, []);

  // Track active music tab from URL or custom events
  useEffect(() => {
    const syncMusicTab = () => {
      if (typeof window === "undefined") return;
      const tab = new URLSearchParams(window.location.search).get("tab") || "song";
      setCurrentMusicTab(tab);
    };

    syncMusicTab();

    const handleCustomMusicTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setCurrentMusicTab(detail);
    };

    window.addEventListener("vh-music-tab-change", handleCustomMusicTab);
    window.addEventListener("popstate", syncMusicTab);

    return () => {
      window.removeEventListener("vh-music-tab-change", handleCustomMusicTab);
      window.removeEventListener("popstate", syncMusicTab);
    };
  }, []);

  // Expanded if NOT collapsed, OR if collapsed but currently hovered
  const isExpanded = !preferences.sidebarCollapsed || isHovered;

  const handleToggle = () => {
    toggleSidebar();
    playTone("click");
  };

  const handleGitLinkClick = (tabId: string) => {
    playTone("click");
    setCurrentGitTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.origin + "/git/");
      url.searchParams.set("tab", tabId);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("vh-git-tab-change", { detail: tabId }));
    }
  };

  const handleMusicLinkClick = (tabId: string) => {
    playTone("click");
    setCurrentMusicTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.origin + "/music/");
      url.searchParams.set("tab", tabId);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("vh-music-tab-change", { detail: tabId }));
    }
  };

  const currentNav = isMusicMode
    ? musicNavigation
    : isGitMode
    ? gitNavigation
    : logsNavigation;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r vh-border vh-bg-sidebar transition-all duration-300 ease-in-out md:flex ${
        isExpanded ? "w-64 shadow-2xl" : "w-16"
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b vh-border px-3.5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            {isMusicMode ? <Disc size={20} className="animate-[spin_12s_linear_infinite]" /> : isGitMode ? <FolderGit2 size={20} /> : <Code2 size={20} />}
          </div>

          <div
            className={`transition-all duration-200 ${
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            }`}
          >
            <p className="font-bold text-sm tracking-tight vh-text-main whitespace-nowrap">
              {isMusicMode ? "VH Music" : isGitMode ? "VH Git" : "VH DevTools"}
            </p>
            <p className="text-[10px] vh-text-dim whitespace-nowrap">
              {isMusicMode ? "Song Player" : isGitMode ? "Git Dashboard" : "Developer observability"}
            </p>
          </div>
        </div>

        {/* Pin / Collapse Toggle button */}
        {isExpanded && (
          <button
            onClick={handleToggle}
            title={preferences.sidebarCollapsed ? "Pin sidebar open" : "Collapse to icon strip"}
            className="rounded-lg p-1.5 vh-text-dim hover:bg-white/10 hover:text-white transition shrink-0"
          >
            {preferences.sidebarCollapsed ? (
              <Pin size={14} className="rotate-45" />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="px-2.5 pt-5 flex-1 overflow-y-auto">
        {isExpanded && (
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] vh-text-dim transition-opacity duration-200">
            {isMusicMode ? "Music Player" : isGitMode ? "Git Workspace" : "Workspace"}
          </p>
        )}

        <nav className="space-y-1">
          {currentNav.map((item) => {
            const Icon = item.icon;
            let active = false;

            if (isMusicMode && item.tab) {
              active = currentMusicTab === item.tab;
            } else if (isGitMode && item.tab) {
              active = currentGitTab === item.tab;
            } else {
              active =
                item.href === "/"
                  ? pathname === "/" || pathname === ""
                  : pathname.startsWith(item.href) ||
                    pathname.startsWith(item.href.replace(/\/$/, ""));
            }

            if ((isMusicMode || isGitMode) && item.tab) {
              const tabId = item.tab;
              const clickHandler = isMusicMode
                ? () => handleMusicLinkClick(tabId)
                : () => handleGitLinkClick(tabId);

              return (
                <button
                  key={item.label}
                  onClick={clickHandler}
                  title={!isExpanded ? item.label : undefined}
                  className={`group relative flex w-full items-center rounded-xl transition ${
                    isExpanded ? "px-3 py-2.5 gap-3 text-sm" : "h-11 w-11 justify-center mx-auto"
                  } ${
                    active
                      ? "border vh-border-accent vh-bg-accent font-semibold vh-text-accent shadow-xs"
                      : "vh-text-muted hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />

                  {isExpanded && (
                    <span className="whitespace-nowrap truncate transition-opacity duration-200 text-left">
                      {item.label}
                    </span>
                  )}

                  {active && isExpanded && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                  )}

                  {!isExpanded && (
                    <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md border vh-border vh-bg-modal px-2.5 py-1 text-xs font-medium vh-text-main shadow-xl whitespace-nowrap group-hover:block z-50">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`group relative flex items-center rounded-xl transition ${
                  isExpanded ? "px-3 py-2.5 gap-3 text-sm" : "h-11 w-11 justify-center mx-auto"
                } ${
                  active
                    ? "border vh-border-accent vh-bg-accent font-semibold vh-text-accent shadow-xs"
                    : "vh-text-muted hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon size={18} className="shrink-0" />

                {isExpanded && (
                  <span className="whitespace-nowrap truncate transition-opacity duration-200">
                    {item.label}
                  </span>
                )}

                {active && isExpanded && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                )}

                {!isExpanded && (
                  <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md border vh-border vh-bg-modal px-2.5 py-1 text-xs font-medium vh-text-main shadow-xl whitespace-nowrap group-hover:block z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Active Project Filter pill (ONLY in Logs Dashboard mode) */}
      {!isGitMode && !isMusicMode && preferences.selectedProject !== "ALL" && (
        <div className={`mx-2.5 mb-3 transition-all duration-200 ${isExpanded ? "p-3" : "p-1.5"}`}>
          {isExpanded ? (
            <div className="rounded-xl border vh-border-accent vh-bg-accent/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider vh-text-dim">
                  Scoped Project
                </span>
                <Boxes size={12} className="vh-text-accent" />
              </div>
              <p className="mt-1 truncate text-xs font-semibold vh-text-accent">
                {preferences.selectedProject}
              </p>
              <button
                onClick={() => updatePreferences({ selectedProject: "ALL" })}
                className="mt-1.5 text-[10px] vh-text-dim hover:text-white underline"
              >
                Reset to all projects
              </button>
            </div>
          ) : (
            <div
              title={`Filtered by: ${preferences.selectedProject}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border vh-border-accent vh-bg-accent vh-text-accent mx-auto"
            >
              <Boxes size={16} />
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-auto border-t vh-border p-2.5">
        {isExpanded ? (
          <div className="flex items-center gap-2.5 rounded-xl border vh-border-subtle vh-bg-card p-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg vh-bg-accent vh-text-accent">
              {isMusicMode ? <Disc size={14} className="animate-[spin_8s_linear_infinite]" /> : isGitMode ? <GitBranch size={14} /> : <Boxes size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium vh-text-main">
                {isMusicMode
                  ? "VH Music Player"
                  : isGitMode
                  ? gitStatusQuery.data?.currentBranch?.current ||
                    serverInfoQuery.data?.currentBranch ||
                    "Git Local"
                  : "VH Local Server"}
              </p>
              <p className="text-[10px] vh-text-dim">
                {isMusicMode
                  ? `Port ${serverInfoQuery.data?.port || 4319} · SQLite`
                  : isGitMode
                  ? "Port 4318 · Git"
                  : "Port 4317 · SQLite"}
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        ) : (
          <div
            title={
              isMusicMode
                ? "VH Music Player connected (SQLite)"
                : isGitMode
                ? `Git Dashboard connected (${serverInfoQuery.data?.currentBranch || "Local"})`
                : "VH Local Server connected on port 4317"
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl vh-bg-card border vh-border-subtle mx-auto relative"
          >
            {isMusicMode ? (
              <Disc size={16} className="vh-text-accent" />
            ) : isGitMode ? (
              <GitBranch size={16} className="vh-text-accent" />
            ) : (
              <Boxes size={16} className="vh-text-accent" />
            )}
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>
        )}
      </div>
    </aside>
  );
}
