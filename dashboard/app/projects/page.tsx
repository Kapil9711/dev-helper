"use client";

import { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Boxes,
  Clock3,
  Activity,
  ArrowUpRight,
} from "lucide-react";

import { useAppsQuery } from "@/lib/queries";

function formatLastSeen(timestamp: number) {
  if (!timestamp) return "No activity recorded";

  return new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isRecentlyActive(timestamp: number) {
  return Date.now() - timestamp < 60_000;
}

export default function ProjectsPage() {
  const query = useAppsQuery();
  const [search, setSearch] = useState("");

  const apps = query.data?.data ?? [];

  const filteredApps = useMemo(() => {
    const term = search.trim().toLowerCase();

    return apps.filter((app) => app.app_name.toLowerCase().includes(term));
  }, [apps, search]);

  const activeCount = apps.filter((app) =>
    isRecentlyActive(app.last_seen),
  ).length;

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 bg-[#0b1120] p-5 text-white md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-gray-400">
            Applications reporting activity to VH DevTools.
          </p>
        </div>

        <button
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.07] disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={query.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Registered applications
            </span>
            <Boxes size={19} className="text-blue-400" />
          </div>
          <p className="mt-4 text-3xl font-semibold">
            {query.isPending ? "—" : apps.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Applications known to the helper
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Recently active</span>
            <Activity size={19} className="text-emerald-400" />
          </div>
          <p className="mt-4 text-3xl font-semibold">
            {query.isPending ? "—" : activeCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Seen within the last 60 seconds
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">All projects</h2>
            <p className="mt-1 text-xs text-gray-500">
              {filteredApps.length} matching applications
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1120] px-3 sm:w-72">
            <Search size={15} className="shrink-0 text-gray-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-600"
            />
          </div>
        </div>

        {query.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-red-300">Could not load projects.</p>
            <button
              onClick={() => void query.refetch()}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : query.isPending ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading projects...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes size={28} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-300">
              {search ? "No matching projects" : "No projects registered"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {search
                ? "Try another application name."
                : "Run an instrumented application to see it here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredApps.map((app) => {
              const active = isRecentlyActive(app.last_seen);

              return (
                <div
                  key={app.app_name}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 transition hover:bg-white/[0.02] sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/10 text-blue-400">
                      <Boxes size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-100">
                        {app.app_name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock3 size={12} />
                        Last seen: {formatLastSeen(app.last_seen)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
                        active
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-white/10 bg-white/[0.03] text-gray-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          active ? "bg-emerald-400" : "bg-gray-500"
                        }`}
                      />
                      {active ? "Recently active" : "Inactive"}
                    </span>

                    <a
                      href="/console/"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      View logs <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-gray-600">
        Activity status is inferred from the last recorded timestamp. It does
        not guarantee that a process is currently running.
      </p>
    </main>
  );
}
