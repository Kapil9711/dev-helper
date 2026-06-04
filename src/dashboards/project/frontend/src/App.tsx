import "./App.css";

import {
  Cpu,
  MemoryStick,
  GitBranch,
  AlertTriangle,
  Package,
  Navigation,
  FolderTree,
  Smartphone,
} from "lucide-react";

import { useMetrics } from "./store/useMetrics";

function SmallCard({ title, value, icon }: any) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex justify-between text-zinc-500 text-xs">
        <span>{title}</span>

        {icon}
      </div>

      <div className="text-lg font-semibold mt-2 truncate">
        {String(value ?? "-")}
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="font-semibold mb-4">{title}</div>

      {children}
    </div>
  );
}

function KV({ label, value }: any) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-zinc-500">{label}</span>

      <span className="truncate max-w-[220px]">{String(value ?? "-")}</span>
    </div>
  );
}

export default function App() {
  const data = useMetrics();

  console.log("dashboard", data);

  if (!data || !data.project) {
    return (
      <div className="bg-zinc-950 text-white min-h-screen flex items-center justify-center">
        Waiting for dashboard...
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-white p-4">
      {/* header */}

      <div className="flex justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold">VH Dashboard</h1>

          <div className="text-zinc-500 text-sm">{data.project?.name}</div>
        </div>

        <div className="border border-zinc-800 rounded-xl px-4 py-3">
          <div className="text-xs text-zinc-500">Risk Score</div>

          <div className="text-2xl font-bold">{data.analysis?.score ?? 0}</div>
        </div>
      </div>

      {/* top cards */}

      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        <SmallCard
          title="CPU"
          value={`${data.runtime?.cpu ?? 0}%`}
          icon={<Cpu size={14} />}
        />

        <SmallCard
          title="RAM"
          value={`${data.system?.memory?.usedMB ?? 0} MB`}
          icon={<MemoryStick size={14} />}
        />

        <SmallCard
          title="Branch"
          value={data.git?.branch}
          icon={<GitBranch size={14} />}
        />

        <SmallCard
          title="Deps"
          value={data.dependencies?.total}
          icon={<Package size={14} />}
        />

        <SmallCard
          title="Findings"
          value={data.analysis?.findings?.length ?? 0}
          icon={<AlertTriangle size={14} />}
        />

        <SmallCard
          title="Navigation"
          value={data.navigation?.library}
          icon={<Navigation size={14} />}
        />

        <SmallCard
          title="Architecture"
          value={data.structure?.architecture}
          icon={<FolderTree size={14} />}
        />

        <SmallCard
          title="Platform"
          value={data.environment?.node?.platform}
          icon={<Smartphone size={14} />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 mt-4">
        {/* left */}

        <div className="col-span-7 space-y-4">
          <Section title="Risk Findings">
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {(data.analysis?.findings ?? []).map((risk) => (
                <div
                  key={`${risk.id}-${risk.title}`}
                  className="border border-zinc-800 rounded-xl p-3"
                >
                  <div className="flex justify-between">
                    <div>{risk.title}</div>

                    <div className="text-xs">{risk.severity}</div>
                  </div>

                  <div className="text-xs text-zinc-500 mt-2">
                    {risk.description}
                  </div>

                  <div className="text-xs mt-2">{risk.recommendation}</div>

                  {!!risk.files?.length && (
                    <div className="text-cyan-400 text-xs mt-2">
                      {risk.files.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* middle */}

        <div className="col-span-3 space-y-4">
          <Section title="Project">
            <KV label="Version" value={data.project?.version} />

            <KV label="Package Manager" value={data.project?.packageManager} />

            <KV label="Dependencies" value={data.dependencies?.total} />

            <KV label="Folders" value={data.structure?.folderCount} />

            <KV
              label="Expo Packages"
              value={data.dependencies?.expoPackages?.length}
            />
          </Section>

          <Section title="Navigation">
            <KV label="Stacks" value={data.navigation?.routes?.stackScreens} />

            <KV label="Tabs" value={data.navigation?.routes?.tabScreens} />

            <KV
              label="goBack"
              value={data.navigation?.navigationUsage?.goBack}
            />

            <KV
              label="Replace"
              value={data.navigation?.navigationUsage?.replace}
            />
          </Section>
        </div>

        {/* right */}

        <div className="col-span-2 space-y-4">
          <Section title="Environment">
            <KV label="Node" value={data.environment?.node?.version} />

            <KV label="Arch" value={data.environment?.node?.arch} />

            <KV
              label="Expo"
              value={data.environment?.readiness?.expoInstalled}
            />

            <KV label="EAS" value={data.environment?.readiness?.easInstalled} />
          </Section>

          <Section title="Permissions">
            <KV
              label="Android Count"
              value={(data.permissions as any)?.android?.length ?? 0}
            />

            <KV
              label="iOS Permissions"
              value={Object.keys((data.permissions as any)?.ios ?? {}).length}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
