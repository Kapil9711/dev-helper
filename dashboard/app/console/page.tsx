"use client";

import { Suspense } from "react";
import { ConsolePanel } from "@/components/console/console-panel";

export default function ConsolePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 vh-bg-app p-5 vh-text-main md:p-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Console</h1>
        <p className="mt-1 text-sm vh-text-muted">
          Search, filter, and inspect logs collected in real-time from your applications.
        </p>
      </header>

      <Suspense fallback={<div className="p-10 text-center text-xs vh-text-dim">Loading console panel...</div>}>
        <ConsolePanel />
      </Suspense>
    </main>
  );
}
