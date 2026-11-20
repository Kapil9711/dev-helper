import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  accent?: string;
  badge?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  accent = "vh-text-accent",
  badge,
}: StatCardProps) {
  return (
    <div className="rounded-xl border vh-border vh-bg-card p-5 transition-all hover:border-white/20 vh-bg-card-hover shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium vh-text-muted">{title}</p>

        <div className={`rounded-xl border vh-border p-2.5 ${accent} vh-bg-subtle`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight vh-text-main">
          {value}
        </p>
        {badge && (
          <span className="rounded-md border vh-border-subtle bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium vh-text-muted">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs vh-text-dim">{description}</p>
    </div>
  );
}
