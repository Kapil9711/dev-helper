"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "midnight" | "sky-mist" | "off-white" | "light";

export type UIStyle = "modern" | "skeuomorphic" | "neubrutalism";
export type IconStyle = "default" | "glow" | "stamped" | "minimal";

export type AccentColor =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan";

export type Density = "comfortable" | "compact";
export type TimestampFormat = "relative" | "absolute" | "full";
export type JsonViewerMode = "tree" | "raw";
export type FontFamily = "mono" | "sans" | "code";

export interface DashboardPreferences {
  theme: Theme;
  uiStyle: UIStyle;
  iconStyle: IconStyle;
  accentColor: AccentColor;
  density: Density;
  timestampFormat: TimestampFormat;
  selectedProject: string; // "ALL" or app name
  autoScrollLogs: boolean;
  soundAlerts: boolean;
  showDedupeBadges: boolean;
  refreshInterval: number;
  logLimit: number;
  networkLimit: number;
  sidebarCollapsed: boolean;
  sidebarHoverExpand: boolean;
  jsonViewerMode: JsonViewerMode;
  jsonWrapLines: boolean;
  fontFamily: FontFamily;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  theme: "midnight",
  uiStyle: "modern",
  iconStyle: "default",
  accentColor: "blue",
  density: "comfortable",
  timestampFormat: "relative",
  selectedProject: "ALL",
  autoScrollLogs: true,
  soundAlerts: false,
  showDedupeBadges: true,
  refreshInterval: 5,
  logLimit: 100,
  networkLimit: 100,
  sidebarCollapsed: false,
  sidebarHoverExpand: true,
  jsonViewerMode: "tree",
  jsonWrapLines: true,
  fontFamily: "mono",
};

export const AVAILABLE_THEMES: {
  id: Theme;
  name: string;
  tag: string;
  desc: string;
  cardBg: string;
  accentDot: string;
}[] = [
  {
    id: "midnight",
    name: "Midnight Black",
    tag: "Slate Dark",
    desc: "Balanced deep slate-black with refined indigo contrast",
    cardBg: "bg-[#0b0f17]",
    accentDot: "bg-blue-500",
  },
  {
    id: "sky-mist",
    name: "Sky Mist",
    tag: "Atmospheric",
    desc: "Ethereal morning sky mist with crisp cyan-slate typography",
    cardBg: "bg-[#edf4f9]",
    accentDot: "bg-sky-500",
  },
  {
    id: "off-white",
    name: "Warm Off-White",
    tag: "Paper Cream",
    desc: "Soft warm ivory & paper cream for gentle daytime viewing",
    cardBg: "bg-[#f4f0e8]",
    accentDot: "bg-amber-600",
  },
  {
    id: "light",
    name: "Clean White",
    tag: "Daylight",
    desc: "Crisp architectural pure white with slate typography",
    cardBg: "bg-[#ffffff]",
    accentDot: "bg-blue-600",
  },
];

interface PreferencesContextValue {
  preferences: DashboardPreferences;
  updatePreferences: (updates: Partial<DashboardPreferences>) => void;
  resetPreferences: () => void;
  toggleSidebar: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const STORAGE_KEY = "vh-dashboard-preferences-v6";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] =
    useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DashboardPreferences>;
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
          theme: AVAILABLE_THEMES.some((t) => t.id === parsed.theme)
            ? (parsed.theme as Theme)
            : DEFAULT_PREFERENCES.theme,
          uiStyle: ["modern", "skeuomorphic", "neubrutalism"].includes(
            parsed.uiStyle as string,
          )
            ? (parsed.uiStyle as UIStyle)
            : DEFAULT_PREFERENCES.uiStyle,
          iconStyle: ["default", "glow", "stamped", "minimal"].includes(
            parsed.iconStyle as string,
          )
            ? (parsed.iconStyle as IconStyle)
            : DEFAULT_PREFERENCES.iconStyle,
          accentColor: [
            "blue",
            "violet",
            "emerald",
            "amber",
            "rose",
            "cyan",
          ].includes(parsed.accentColor as string)
            ? (parsed.accentColor as AccentColor)
            : DEFAULT_PREFERENCES.accentColor,
          density: ["comfortable", "compact"].includes(parsed.density as string)
            ? (parsed.density as Density)
            : DEFAULT_PREFERENCES.density,
          timestampFormat: ["relative", "absolute", "full"].includes(
            parsed.timestampFormat as string,
          )
            ? (parsed.timestampFormat as TimestampFormat)
            : DEFAULT_PREFERENCES.timestampFormat,
          jsonViewerMode: ["tree", "raw"].includes(parsed.jsonViewerMode as string)
            ? (parsed.jsonViewerMode as JsonViewerMode)
            : DEFAULT_PREFERENCES.jsonViewerMode,
          fontFamily: ["mono", "sans", "code"].includes(parsed.fontFamily as string)
            ? (parsed.fontFamily as FontFamily)
            : DEFAULT_PREFERENCES.fontFamily,
          sidebarCollapsed:
            typeof parsed.sidebarCollapsed === "boolean"
              ? parsed.sidebarCollapsed
              : DEFAULT_PREFERENCES.sidebarCollapsed,
          sidebarHoverExpand:
            typeof parsed.sidebarHoverExpand === "boolean"
              ? parsed.sidebarHoverExpand
              : DEFAULT_PREFERENCES.sidebarHoverExpand,
          jsonWrapLines:
            typeof parsed.jsonWrapLines === "boolean"
              ? parsed.jsonWrapLines
              : DEFAULT_PREFERENCES.jsonWrapLines,
          selectedProject: parsed.selectedProject ?? DEFAULT_PREFERENCES.selectedProject,
          autoScrollLogs:
            typeof parsed.autoScrollLogs === "boolean"
              ? parsed.autoScrollLogs
              : DEFAULT_PREFERENCES.autoScrollLogs,
          soundAlerts:
            typeof parsed.soundAlerts === "boolean"
              ? parsed.soundAlerts
              : DEFAULT_PREFERENCES.soundAlerts,
          showDedupeBadges:
            typeof parsed.showDedupeBadges === "boolean"
              ? parsed.showDedupeBadges
              : DEFAULT_PREFERENCES.showDedupeBadges,
          refreshInterval: [1, 2, 5, 10, 30].includes(Number(parsed.refreshInterval))
            ? Number(parsed.refreshInterval)
            : DEFAULT_PREFERENCES.refreshInterval,
          logLimit: [25, 50, 100, 200].includes(Number(parsed.logLimit))
            ? Number(parsed.logLimit)
            : DEFAULT_PREFERENCES.logLimit,
          networkLimit: [25, 50, 100, 200].includes(Number(parsed.networkLimit))
            ? Number(parsed.networkLimit)
            : DEFAULT_PREFERENCES.networkLimit,
        }));
      }
    } catch {
      // Ignore parse errors and use defaults
    } finally {
      setHydrated(true);
    }
  }, []);

  // Sync dataset attributes on document root
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = preferences.theme;
      root.dataset.style = preferences.uiStyle;
      root.dataset.iconStyle = preferences.iconStyle;
      root.dataset.accent = preferences.accentColor;
      root.dataset.density = preferences.density;
      root.dataset.font = preferences.fontFamily;
      if (
        preferences.theme === "light" ||
        preferences.theme === "off-white" ||
        preferences.theme === "sky-mist"
      ) {
        root.classList.remove("dark");
      } else {
        root.classList.add("dark");
      }
    }
  }, [
    preferences.theme,
    preferences.uiStyle,
    preferences.iconStyle,
    preferences.accentColor,
    preferences.density,
    preferences.fontFamily,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {}
  }, [preferences, hydrated]);

  function updatePreferences(updates: Partial<DashboardPreferences>) {
    setPreferences((current) => ({ ...current, ...updates }));
  }

  function toggleSidebar() {
    setPreferences((current) => ({
      ...current,
      sidebarCollapsed: !current.sidebarCollapsed,
    }));
  }

  function resetPreferences() {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        toggleSidebar,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error(
      "useDashboardPreferences must be used within PreferencesProvider",
    );
  }
  return context;
}

/** Web Audio feedback synthesizer for alerts and clicks */
export function playTone(type: "error" | "success" | "click") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    }
  } catch {}
}
