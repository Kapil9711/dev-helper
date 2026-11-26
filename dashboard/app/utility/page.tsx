"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Image,
  FileText,
  Video,
  Code2,
  ShieldCheck,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";
import { OverviewTab } from "@/components/utility/OverviewTab";
import { ImageStudioTab } from "@/components/utility/ImageStudioTab";
import { PdfSuiteTab } from "@/components/utility/PdfSuiteTab";
import { MediaStudioTab } from "@/components/utility/MediaStudioTab";
import { MernToolsTab } from "@/components/utility/MernToolsTab";
import { CryptoTab } from "@/components/utility/CryptoTab";
import { UtilitySettingsTab } from "@/components/utility/UtilitySettingsTab";

type TabId = "overview" | "images" | "pdf" | "media" | "dev" | "crypto" | "settings";

export default function UtilityPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    const syncTab = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (
        tab &&
        ["overview", "images", "pdf", "media", "dev", "crypto", "settings"].includes(tab)
      ) {
        setActiveTab(tab as TabId);
      }
    };

    syncTab();

    const handleCustomTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (
        detail &&
        ["overview", "images", "pdf", "media", "dev", "crypto", "settings"].includes(detail)
      ) {
        setActiveTab(detail as TabId);
      }
    };

    window.addEventListener("vh-utility-tab-change", handleCustomTab);
    window.addEventListener("popstate", syncTab);

    return () => {
      window.removeEventListener("vh-utility-tab-change", handleCustomTab);
      window.removeEventListener("popstate", syncTab);
    };
  }, []);

  const handleTabChange = (tabId: string) => {
    playTone("click");
    setActiveTab(tabId as TabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("vh-utility-tab-change", { detail: tabId }));
    }
  };

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "images", label: "Image Studio", icon: Image },
    { id: "pdf", label: "PDF Suite", icon: FileText },
    { id: "media", label: "Video & Audio", icon: Video },
    { id: "dev", label: "MERN Dev Tools", icon: Code2 },
    { id: "crypto", label: "Crypto & Hashes", icon: ShieldCheck },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen vh-bg-main p-4 md:p-8 space-y-6">
      {/* Top Navigation Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b vh-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Wrench size={16} />
            </div>
            <h1 className="text-xl font-black text-white">VH Utility Dashboard</h1>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-400">
              MERN Suite
            </span>
          </div>
          <p className="mt-1 text-xs vh-text-dim">
            High performance server-side media processing, PDF generation, and full-stack development tools.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border vh-border bg-black/40 p-1.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold"
                    : "vh-text-dim hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="pt-2">
        {activeTab === "overview" && <OverviewTab onSelectTab={handleTabChange} />}
        {activeTab === "images" && <ImageStudioTab />}
        {activeTab === "pdf" && <PdfSuiteTab />}
        {activeTab === "media" && <MediaStudioTab />}
        {activeTab === "dev" && <MernToolsTab />}
        {activeTab === "crypto" && <CryptoTab />}
        {activeTab === "settings" && <UtilitySettingsTab />}
      </div>
    </div>
  );
}
