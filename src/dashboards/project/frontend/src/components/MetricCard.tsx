import { useMetrics } from "../store/useMetrics";
import "./App.css";

import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  MemoryStick,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  FolderCode,
  Activity,
  Hash,
  Smartphone,
  TriangleAlert,
} from "lucide-react";

function MetricCard({ title, value, icon }: any) {
  return (
    <div
      className="
      rounded-3xl
      border
      border-zinc-800
      bg-zinc-900/60
      p-5
      backdrop-blur-xl
      "
    >
      <div className="flex justify-between">
        <span className="text-zinc-400 text-sm">{title}</span>

        {icon}
      </div>

      <div className="mt-4 text-3xl font-bold">{value}</div>
    </div>
  );
}

function RiskItem({ risk }: any) {
  return (
    <div
      className="
      rounded-2xl
      border
      border-zinc-800
      p-4
      bg-zinc-900/40
      "
    >
      <div className="flex items-start gap-3">
        <TriangleAlert size={18} />

        <div className="flex-1">
          <div className="font-semibold">{risk.title}</div>

          <div className="text-zinc-400 text-sm mt-1">{risk.description}</div>

          <div className="mt-3 text-xs text-zinc-500">
            Fix: {risk.recommendation}
          </div>

          {!!risk.files?.length && (
            <div className="mt-2 text-xs text-zinc-600">
              {risk.files.join(", ")}
            </div>
          )}
        </div>

        <span
          className="
          px-2
          py-1
          rounded-lg
          text-xs
          bg-zinc-800
          "
        >
          {risk.severity}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const data = useMetrics();

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Loading VH Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      {/* HEADER */}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">VH Expo Dashboard</h1>

          <p className="text-zinc-500 mt-2">{data.project.name}</p>
        </div>

        <div
          className="
          px-5
          py-3
          rounded-2xl
          border
          border-zinc-800
          "
        >
          <div className="text-zinc-400 text-xs">Store Readiness</div>

          <div className="text-3xl font-bold">
            {data.analysis?.score}
            /100
          </div>
        </div>
      </div>

      {/* TOP METRICS */}

      <div className="grid grid-cols-5 gap-5 mt-8">
        <MetricCard title="CPU" value={`${data.runtime.cpu}%`} icon={<Cpu />} />

        <MetricCard
          title="RAM"
          value={`${data.runtime.memory.usedMB}MB`}
          icon={<MemoryStick />}
        />

        <MetricCard title="PID" value={data.runtime.pid} icon={<Hash />} />

        <MetricCard
          title="Branch"
          value={data.git.branch}
          icon={<GitBranch />}
        />

        <MetricCard
          title="Risks"
          value={data.analysis?.findings?.length}
          icon={<AlertTriangle />}
        />
      </div>

      {/* MAIN */}

      <div className="grid grid-cols-3 gap-6 mt-8">
        {/* LEFT */}

        <div className="col-span-2">
          <div
            className="
            rounded-3xl
            border
            border-zinc-800
            p-6
            "
          >
            <div className="flex justify-between">
              <h2 className="font-bold text-xl">Findings</h2>

              <span className="text-zinc-500">
                {data.analysis?.findings?.length}
              </span>
            </div>

            <div className="space-y-4 mt-6">
              {data.analysis.findings.map((risk: any) => (
                <RiskItem key={risk.id} risk={risk} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 p-6">
            <div className="font-bold">Project</div>

            <div className="mt-5 space-y-3 text-sm">
              <Info label="Version" value={data.project.version} />

              <Info
                label="Scripts"
                value={String(Object.keys(data.project.scripts).length)}
              />

              <Info label="Changes" value={String(data.git.changesCount)} />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 p-6">
            <div className="font-bold">Review Risk</div>

            <div className="mt-4 text-2xl font-bold">
              {data.analysis?.rejectionChance}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>

      <span>{value}</span>
    </div>
  );
}
