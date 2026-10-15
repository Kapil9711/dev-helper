"use client";

import { ConsolePanel } from "@/components/console/console-panel";

export default function ConsolePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 bg-[#0b1120] p-5 text-white md:p-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Console</h1>
        <p className="mt-1 text-sm text-gray-400">
          Search, filter, and inspect logs collected from your applications.
        </p>
      </header>

      <ConsolePanel />
    </main>
  );
}
