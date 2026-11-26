"use client";

import { useServerInfoQuery } from "@/lib/queries";
import { Server, Cpu, HardDrive, CheckCircle2, AlertCircle, Terminal } from "lucide-react";

export function UtilitySettingsTab() {
  const serverInfoQuery = useServerInfoQuery();
  const info = serverInfoQuery.data;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white">Utility Server Runtime Environment</h3>
        <p className="text-xs vh-text-dim">
          All image transformations, PDF generation, video/audio encoding, and cryptographic operations run locally on your host machine via Node.js native streams and C++ bindings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-xl border vh-border bg-white/[0.02] p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400">Server Mode</span>
              <Server size={14} className="text-cyan-400" />
            </div>
            <p className="text-lg font-bold text-white">Standalone Utility</p>
            <p className="text-[11px] vh-text-dim">Port: {info?.port || 4320}</p>
          </div>

          <div className="rounded-xl border vh-border bg-white/[0.02] p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400">Sharp Engine</span>
              <Cpu size={14} className="text-cyan-400" />
            </div>
            <p className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Active
            </p>
            <p className="text-[11px] vh-text-dim">libvips / WebP / AVIF</p>
          </div>

          <div className="rounded-xl border vh-border bg-white/[0.02] p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400">FFmpeg Engine</span>
              <HardDrive size={14} className="text-cyan-400" />
            </div>
            <p className="text-lg font-bold text-white flex items-center gap-1.5">
              {info?.ffmpegAvailable ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" /> Available
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-yellow-400" /> Host PATH
                </>
              )}
            </p>
            <p className="text-[11px] vh-text-dim">Video & Audio Processing</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal size={16} className="text-cyan-400" />
          <span>CLI Commands Reference</span>
        </h3>

        <div className="space-y-2">
          {[
            { cmd: "vh utility", desc: "Launch the standalone MERN Developer Utility Dashboard on port 4320" },
            { cmd: "vh util", desc: "Short alias for `vh utility`" },
            { cmd: "vh utility -p 5000", desc: "Launch utility dashboard on a custom port" },
            { cmd: "vh utility --no-open", desc: "Run server in headless mode without automatically launching browser" },
          ].map((item) => (
            <div
              key={item.cmd}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border vh-border bg-black/40 p-3"
            >
              <code className="text-xs font-mono font-bold text-cyan-300">{item.cmd}</code>
              <span className="text-xs vh-text-dim">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
