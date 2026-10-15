"use client";

export function ConnectionStatus() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      Live monitoring
    </div>
  );
}
