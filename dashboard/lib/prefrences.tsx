"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme =
  | "midnight"
  | "carbon-dark"
  | "obsidian-emerald"
  | "tokyo-night"
  | "nordic-slate"
  | "retro-amber"
  | "retro-synthwave"
  | "sepia-dark"
  | "sky-mist"
  | "off-white"
  | "light";

export type UIStyle =
  | "modern"
  | "skeuomorphic"
  | "neubrutalism"
  | "glassmorphism"
  | "cyberpunk";
export type IconStyle = "default" | "glow" | "stamped" | "minimal";

export type AccentColor =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan";

export type Density = "comfortable" | "standard" | "compact";
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
  isLight?: boolean;
}[] = [
  {
    id: "midnight",
    name: "Midnight Slate",
    tag: "Deep Indigo",
    desc: "Refined deep obsidian-slate with elegant indigo accents",
    cardBg: "bg-[#0b1120]",
    accentDot: "bg-blue-500",
    isLight: false,
  },
  {
    id: "carbon-dark",
    name: "Carbon Pro",
    tag: "Pure Minimal",
    desc: "Ultra-crisp Linear / Vercel neutral charcoal black with high-contrast slate borders",
    cardBg: "bg-[#09090b]",
    accentDot: "bg-zinc-200",
    isLight: false,
  },
  {
    id: "obsidian-emerald",
    name: "Matrix Emerald",
    tag: "Terminal Dark",
    desc: "Pitch dark hacker terminal with refined bio-emerald accents and calm labels",
    cardBg: "bg-[#060b08]",
    accentDot: "bg-emerald-400",
    isLight: false,
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    tag: "Cyber Indigo",
    desc: "Deep cyberpunk indigo night sky with neon lavender & fuchsia highlights",
    cardBg: "bg-[#0f1423]",
    accentDot: "bg-indigo-400",
    isLight: false,
  },
  {
    id: "nordic-slate",
    name: "Nordic Frost",
    tag: "Arctic Slate",
    desc: "Cool polar blue-slate dark with crisp arctic ice cyan accents",
    cardBg: "bg-[#0c121c]",
    accentDot: "bg-sky-400",
    isLight: false,
  },
  {
    id: "retro-amber",
    name: "Retro Amber CRT",
    tag: "VT220 Vintage",
    desc: "Iconic 1980s amber phosphor CRT terminal with authentic warm monochrome glow",
    cardBg: "bg-[#120e06]",
    accentDot: "bg-amber-400",
    isLight: false,
  },
  {
    id: "retro-synthwave",
    name: "Neon Synthwave",
    tag: "80s Outrun",
    desc: "Retro 80s arcade dark with electric cyan, laser magenta, and deep purple",
    cardBg: "bg-[#130826]",
    accentDot: "bg-pink-500",
    isLight: false,
  },
  {
    id: "sepia-dark",
    name: "Sepia Warm",
    tag: "Vintage Dark",
    desc: "Warm dark espresso & coffee tones with cozy honey amber glow",
    cardBg: "bg-[#15110d]",
    accentDot: "bg-amber-500",
    isLight: false,
  },
  {
    id: "sky-mist",
    name: "Sky Mist",
    tag: "Atmospheric",
    desc: "Ethereal morning sky mist with crisp cyan-slate typography",
    cardBg: "bg-[#edf4f9]",
    accentDot: "bg-sky-500",
    isLight: true,
  },
  {
    id: "off-white",
    name: "Warm Off-White",
    tag: "Paper Cream",
    desc: "Soft warm ivory & paper cream for gentle daytime viewing",
    cardBg: "bg-[#f4f0e8]",
    accentDot: "bg-amber-600",
    isLight: true,
  },
  {
    id: "light",
    name: "Clean White",
    tag: "Daylight",
    desc: "Crisp architectural pure white with slate typography",
    cardBg: "bg-[#ffffff]",
    accentDot: "bg-blue-600",
    isLight: true,
  },
];

export const AVAILABLE_UI_STYLES: {
  id: UIStyle;
  name: string;
  subtitle: string;
  desc: string;
  badge: string;
  accentColor: string;
}[] = [
  {
    id: "modern",
    name: "Modern Flat",
    subtitle: "Clean & Razor Borders",
    desc: "Minimalist flat panels, refined hairline borders, and subtle focus transitions.",
    badge: "Clean Flat",
    accentColor: "text-blue-400",
  },
  {
    id: "skeuomorphic",
    name: "Skeuomorphism",
    subtitle: "3D Tactile & Hardware LEDs",
    desc: "Tactile 3D beveled cards, debossed inset wells, physical keycaps, and hardware LED indicators.",
    badge: "3D Depth",
    accentColor: "text-amber-400",
  },
  {
    id: "neubrutalism",
    name: "Neubrutalism",
    subtitle: "Hard Black Shadows & Pop",
    desc: "High-contrast solid borders, hard 4px offset drop shadows, snappy click physics, and retro stamps.",
    badge: "Bold Pop",
    accentColor: "text-pink-400",
  },
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    subtitle: "Frosted Blur & Specular Sheen",
    desc: "Translucent frosted backdrop blur, specular gradient highlights, and diffuse ambient depth.",
    badge: "Frosted Glass",
    accentColor: "text-cyan-400",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk HUD",
    subtitle: "Neon Hairlines & Grid Matrix",
    desc: "High-tech terminal HUD, glowing neon hairline outlines, micro-grid backdrop, and monospace data brackets.",
    badge: "Cyber HUD",
    accentColor: "text-emerald-400",
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
          uiStyle: [
            "modern",
            "skeuomorphic",
            "neubrutalism",
            "glassmorphism",
            "cyberpunk",
          ].includes(parsed.uiStyle as string)
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
          density: ["comfortable", "standard", "compact"].includes(parsed.density as string)
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
