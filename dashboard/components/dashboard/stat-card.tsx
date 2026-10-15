import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  accent: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  accent,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-400">{title}</p>

        <div className={`rounded-lg bg-white/5 p-2 ${accent}`}>{icon}</div>
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}
