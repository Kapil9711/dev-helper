"use client";

import { useState } from "react";
import {
  Globe,
  Terminal,
  Copy,
  Check,
  X,
  Play,
  Sparkles,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

interface ChromeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChromeWindowModal({ isOpen, onClose }: ChromeWindowModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState("http://localhost:3000");
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    playTone("click");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchStatus(null);
    playTone("click");

    try {
      const res = await fetch("/api/logs/open-window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!res.ok) throw new Error("Could not trigger Chrome window. You can also run `vh logs window` in your terminal.");
      setLaunchStatus("Chrome window launched with remote debugging!");
    } catch (err: any) {
      setLaunchStatus(`Note: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const scriptTagCode = `<script src="http://localhost:4317/client.js" data-app="my-website"></script>`;
  const cliCommandCode = `vh logs window ${targetUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border vh-border vh-bg-card shadow-2xl overflow-hidden space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b vh-border p-5 bg-black/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Globe size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold vh-text-main">Chrome Live Capture Window</h2>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                  CDP Engine
                </span>
              </div>
              <p className="text-xs vh-text-dim mt-0.5">
                Stream real-time console logs and network traffic from any visited website directly into your dashboard
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playTone("click");
              onClose();
            }}
            className="p-1.5 rounded-lg vh-text-dim hover:vh-text-main hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Method 1: Automated Chrome Window */}
          <div className="rounded-xl border vh-border bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm vh-text-main flex items-center gap-1.5">
                <Terminal size={15} className="text-cyan-400" />
                Method 1: Launch Dedicated Chrome Window
              </span>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">Zero Setup Required</span>
            </div>
            <p className="vh-text-dim leading-relaxed">
              Launches an isolated Chrome window. Every website you navigate to in this window automatically captures requests, responses, headers, and console outputs without modifying your code.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="Target website URL (e.g. http://localhost:3000)"
                className="w-full sm:flex-1 rounded-xl border vh-border vh-bg-input px-3 py-2 font-mono text-xs vh-text-main focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-black shadow-md shadow-cyan-500/20 hover:bg-cyan-400 transition disabled:opacity-50"
              >
                <Play size={13} />
                <span>{isLaunching ? "Launching..." : "Launch Window"}</span>
              </button>
            </div>

            {launchStatus && (
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium pt-1">
                <CheckCircle2 size={14} />
                <span>{launchStatus}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border vh-border bg-black/40 p-2.5 font-mono text-[11px]">
              <span className="text-cyan-300">$ {cliCommandCode}</span>
              <button
                onClick={() => handleCopy(cliCommandCode, "cli")}
                className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:underline ml-2 shrink-0"
              >
                {copiedType === "cli" ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedType === "cli" ? "Copied" : "Copy Command"}</span>
              </button>
            </div>
          </div>

          {/* Method 2: In-Browser Script Tag */}
          <div className="rounded-xl border vh-border bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm vh-text-main flex items-center gap-1.5">
                <Code2 size={15} className="text-emerald-400" />
                Method 2: Include Client Script in Any Web App
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">Universal HTML</span>
            </div>
            <p className="vh-text-dim leading-relaxed">
              Add this single script tag into the <code className="font-mono text-cyan-400">&lt;head&gt;</code> of your HTML template or web app to automatically stream fetch, XHR, and console logs from any browser.
            </p>

            <div className="flex items-center justify-between rounded-xl border vh-border bg-black/40 p-2.5 font-mono text-[11px] overflow-x-auto">
              <code className="text-emerald-300 break-all">{scriptTagCode}</code>
              <button
                onClick={() => handleCopy(scriptTagCode, "script")}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline ml-3 shrink-0"
              >
                {copiedType === "script" ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedType === "script" ? "Copied" : "Copy Script Tag"}</span>
              </button>
            </div>
          </div>

          {/* Features Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border vh-border bg-black/20 p-3 space-y-1">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Full Request & Response
              </span>
              <p className="text-[11px] vh-text-dim">
                Captures headers, payloads, status codes, and execution timings for every fetch and XHR.
              </p>
            </div>
            <div className="rounded-xl border vh-border bg-black/20 p-3 space-y-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Live Console Mirror
              </span>
              <p className="text-[11px] vh-text-dim">
                Real-time capture of log, info, warn, and error calls with arguments and stack traces.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t vh-border p-4 bg-black/10 dark:bg-white/5">
          <button
            onClick={() => {
              playTone("click");
              onClose();
            }}
            className="rounded-xl border vh-border px-4 py-2 text-xs font-semibold vh-text-main hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
