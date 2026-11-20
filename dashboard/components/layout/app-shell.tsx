"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useDashboardPreferences } from "@/lib/prefrences";

export function AppShell({ children }: { children: ReactNode }) {
  const { preferences } = useDashboardPreferences();

  return (
    <div className="min-h-screen vh-bg-app vh-text-main transition-colors duration-200">
      <Sidebar />

      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          preferences.sidebarCollapsed ? "md:pl-16" : "md:pl-64"
        }`}
      >
        <Topbar />
        <div className="flex-1 vh-bg-app">{children}</div>
      </div>
    </div>
  );
}
