"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      <Sidebar />

      <div className="min-h-screen md:pl-64">
        <Topbar />
        <div>{children}</div>
      </div>
    </div>
  );
}
