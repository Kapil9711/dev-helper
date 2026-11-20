"use client";

import { useState } from "react";
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
  PanelLeft,
  Pin,
  PinOff,
  BookOpen,
} from "lucide-react";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";

const navigation = [
  { label: "Overview", href: "/", icon: Activity },
  { label: "Network", href: "/network/", icon: Network },
  { label: "API Docs", href: "/docs/", icon: BookOpen },
  { label: "Console", href: "/console/", icon: Terminal },
  { label: "Events", href: "/events/", icon: Zap },
  { label: "Projects", href: "/projects/", icon: Boxes },
  { label: "Settings", href: "/settings/", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { preferences, updatePreferences, toggleSidebar } = useDashboardPreferences();

  const [isHovered, setIsHovered] = useState(false);

  // Expanded if NOT collapsed, OR if collapsed but currently hovered
  const isExpanded = !preferences.sidebarCollapsed || isHovered;

  const handleToggle = () => {
    toggleSidebar();
    playTone("click");
  };

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
            <Code2 size={20} />
          </div>

          <div
            className={`transition-all duration-200 ${
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            }`}
          >
            <p className="font-bold text-sm tracking-tight vh-text-main whitespace-nowrap">
              VH DevTools
            </p>
            <p className="text-[10px] vh-text-dim whitespace-nowrap">
              Developer observability
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
            Workspace
          </p>
        )}

        <nav className="space-y-1">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/" || pathname === ""
                : pathname.startsWith(href) || pathname.startsWith(href.replace(/\/$/, ""));

            return (
              <Link
                key={href}
                href={href}
                title={!isExpanded ? label : undefined}
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
                    {label}
                  </span>
                )}

                {active && isExpanded && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                )}

                {/* Floating tooltip when in narrow icon-only state */}
                {!isExpanded && (
                  <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md border vh-border vh-bg-modal px-2.5 py-1 text-xs font-medium vh-text-main shadow-xl whitespace-nowrap group-hover:block z-50">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Active Project Filter pill in sidebar */}
      {preferences.selectedProject !== "ALL" && (
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
              <Boxes size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium vh-text-main">VH Local Server</p>
              <p className="text-[10px] vh-text-dim">Port 4317 · SQLite</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        ) : (
          <div
            title="VH Local Server connected on port 4317"
            className="flex h-10 w-10 items-center justify-center rounded-xl vh-bg-card border vh-border-subtle mx-auto relative"
          >
            <Boxes size={16} className="vh-text-accent" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>
        )}
      </div>
    </aside>
  );
}
