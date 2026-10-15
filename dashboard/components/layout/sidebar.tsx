"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Blocks,
  Boxes,
  Code2,
  Network,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: Activity },
  { label: "Network", href: "/network/", icon: Network },
  { label: "Console", href: "/console/", icon: Terminal },
  { label: "Events", href: "/events/", icon: Zap },
  { label: "Projects", href: "/projects/", icon: Boxes },
  { label: "Settings", href: "/settings/", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-[#0b1120] md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
          <Code2 size={21} />
        </div>

        <div>
          <p className="font-semibold tracking-tight text-white">VH DevTools</p>
          <p className="text-[11px] text-gray-500">Developer observability</p>
        </div>
      </div>

      <div className="px-4 pt-7">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "border border-blue-400/15 bg-blue-500/10 font-medium text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Blocks size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200">VH Helper</p>
            <p className="text-xs text-gray-500">Local development</p>
          </div>
          <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  );
}
