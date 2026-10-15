"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Server,
  Activity,
  SlidersHorizontal,
  Palette,
  CheckCircle2,
  XCircle,
  Clock3,
  Database,
  Globe,
} from "lucide-react";
import { useDashboardPreferences } from "@/lib/prefrences";

type HealthStatus = "checking" | "online" | "offline";

export default function SettingsPage() {
  const { preferences, updatePreferences } = useDashboardPreferences();

  const [health, setHealth] = useState<HealthStatus>("checking");
  const [loading, setLoading] = useState(false);

  async function checkHealth() {
    setLoading(true);
    setHealth("checking");

    try {
      const response = await fetch("/health", {
        cache: "no-store",
      });

      setHealth(response.ok ? "online" : "offline");
    } catch {
      setHealth("offline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkHealth();
  }, []);

  const healthColor = {
    checking: "text-amber-400",
    online: "text-emerald-400",
    offline: "text-red-400",
  }[health];

  const healthLabel = {
    checking: "Checking connection...",
    online: "Connected",
    offline: "Disconnected",
  }[health];

  const selectClassName =
    "w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500";

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your developer dashboard preferences and connection.
        </p>
      </div>

      {/* Server connection */}
      <section className="rounded-xl border border-white/10 bg-[#111827] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            <Server size={20} />
          </div>

          <div>
            <h2 className="font-medium text-white">Server connection</h2>
            <p className="text-sm text-slate-400">
              Check the status of your local helper server.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
            <span className="text-sm text-slate-400">Dashboard URL</span>

            <span className="break-all text-right text-sm text-slate-200">
              {typeof window !== "undefined" ? window.location.origin : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-400">Backend health</span>

            <span className={`flex items-center gap-2 text-sm ${healthColor}`}>
              {health === "online" ? (
                <CheckCircle2 size={16} />
              ) : health === "offline" ? (
                <XCircle size={16} />
              ) : (
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
              )}

              {healthLabel}
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => void checkHealth()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Check connection
            </button>
          </div>
        </div>
      </section>

      {/* Shared display preferences */}
      <section className="rounded-xl border border-white/10 bg-[#111827] p-5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400">
            <SlidersHorizontal size={20} />
          </div>

          <div>
            <h2 className="font-medium text-white">Display preferences</h2>
            <p className="text-sm text-slate-400">
              These values are shared with dashboard pages that use the
              preferences hook.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Refresh interval */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <Clock3 size={15} className="text-slate-500" />
              Refresh interval
            </span>

            <select
              value={String(preferences.refreshInterval)}
              onChange={(event) =>
                updatePreferences({
                  refreshInterval: Number(event.target.value),
                })
              }
              className={selectClassName}
            >
              <option value="2">Every 2 seconds</option>
              <option value="5">Every 5 seconds</option>
              <option value="10">Every 10 seconds</option>
              <option value="30">Every 30 seconds</option>
            </select>

            <span className="block text-xs text-slate-500">
              Current setting: {preferences.refreshInterval} seconds
            </span>
          </label>

          {/* Log limit */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <Database size={15} className="text-slate-500" />
              Console log limit
            </span>

            <select
              value={String(preferences.logLimit)}
              onChange={(event) =>
                updatePreferences({
                  logLimit: Number(event.target.value),
                })
              }
              className={selectClassName}
            >
              <option value="25">25 entries</option>
              <option value="50">50 entries</option>
              <option value="100">100 entries</option>
            </select>

            <span className="block text-xs text-slate-500">
              Maximum logs requested by configured pages
            </span>
          </label>

          {/* Network limit */}
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <Globe size={15} className="text-slate-500" />
              Network request limit
            </span>

            <select
              value={String(preferences.networkLimit)}
              onChange={(event) =>
                updatePreferences({
                  networkLimit: Number(event.target.value),
                })
              }
              className={selectClassName}
            >
              <option value="25">25 requests</option>
              <option value="50">50 requests</option>
              <option value="100">100 requests</option>
            </select>

            <span className="block text-xs text-slate-500">
              Maximum requests requested by configured pages
            </span>
          </label>
        </div>

        <div className="mt-5 rounded-lg border border-emerald-400/10 bg-emerald-400/5 p-3 text-xs text-emerald-200/80">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            <p>
              Preferences update immediately. The provider saves them in browser
              localStorage, so they persist after refreshes in this browser.
            </p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-xl border border-white/10 bg-[#111827] p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-pink-500/10 p-2 text-pink-400">
            <Palette size={20} />
          </div>

          <div className="flex-1">
            <h2 className="font-medium text-white">Appearance</h2>
            <p className="mt-1 text-sm text-slate-400">
              Dashboard color scheme
            </p>
          </div>

          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
            Dark theme
          </span>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          The dashboard currently uses its existing dark theme. Theme switching
          is not configured yet.
        </p>
      </section>

      {/* Runtime information */}
      <section className="rounded-xl border border-white/10 bg-[#111827] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <Activity size={20} />
          </div>

          <div>
            <h2 className="font-medium text-white">Runtime information</h2>
            <p className="text-sm text-slate-400">
              Dashboard environment and storage
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Environment</span>
            <span className="text-right text-slate-200">Local development</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Transport</span>
            <span className="text-right text-slate-200">HTTP + Socket.IO</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Database</span>
            <span className="text-right text-slate-200">SQLite</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Preferences storage</span>
            <span className="text-right text-slate-200">
              Browser localStorage
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
