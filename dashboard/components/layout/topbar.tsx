"use client";

import { usePathname } from "next/navigation";
import { Search, Command } from "lucide-react";
import { ConnectionStatus } from "./connection-status";

const titles: Record<string, string> = {
  "/": "Overview",
  "/network": "Network",
  "/console": "Console",
  "/events": "Events",
  "/projects": "Projects",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#0b1120]/95 px-5 backdrop-blur md:px-7">
      <div>
        <p className="text-sm font-medium text-gray-200">
          {titles[normalizedPath] ?? "Dashboard"}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          VH DevTools <span className="mx-1">/</span>{" "}
          {titles[normalizedPath] ?? "Dashboard"}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-500 sm:flex">
          <Search size={14} />
          <span>Search dashboard</span>
          <span className="ml-3 flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5">
            <Command size={11} /> K
          </span>
        </div>

        <ConnectionStatus />
      </div>
    </header>
  );
}
