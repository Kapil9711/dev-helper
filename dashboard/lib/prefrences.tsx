
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface DashboardPreferences {
  refreshInterval: number;
  logLimit: number;
  networkLimit: number;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  refreshInterval: 5,
  logLimit: 100,
  networkLimit: 100,
};

interface PreferencesContextValue {
  preferences: DashboardPreferences;
  updatePreferences: (updates: Partial<DashboardPreferences>) => void;
}

const PreferencesContext =
  createContext<PreferencesContextValue | null>(null);

const STORAGE_KEY = "vh-dashboard-preferences";

export function PreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DashboardPreferences>;

        setPreferences({
          refreshInterval: [2, 5, 10, 30].includes(
            Number(parsed.refreshInterval),
          )
            ? Number(parsed.refreshInterval)
            : DEFAULT_PREFERENCES.refreshInterval,
          logLimit: [25, 50, 100].includes(Number(parsed.logLimit))
            ? Number(parsed.logLimit)
            : DEFAULT_PREFERENCES.logLimit,
          networkLimit: [25, 50, 100].includes(
            Number(parsed.networkLimit),
          )
            ? Number(parsed.networkLimit)
            : DEFAULT_PREFERENCES.networkLimit,
        });
      }
    } catch {
      // Use defaults if saved preferences are invalid.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences, hydrated]);

  function updatePreferences(
    updates: Partial<DashboardPreferences>,
  ) {
    setPreferences((current) => ({ ...current, ...updates }));
  }

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreferences }}
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
