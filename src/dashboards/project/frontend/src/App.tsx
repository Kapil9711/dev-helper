import "./App.css";

import {
  Cpu,
  MemoryStick,
  GitBranch,
  Monitor,
  Hash,
  Code2,
} from "lucide-react";

import { useMetrics } from "./store/useMetrics";

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
      relative
      overflow-hidden
      rounded-3xl
      border
      border-zinc-800
      bg-zinc-900/70
      backdrop-blur-xl
      p-6
      transition-all
      duration-300
      hover:-translate-y-1
      hover:border-zinc-700
      hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]
      "
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{title}</span>

        <div className="text-zinc-500">{icon}</div>
      </div>

      <h2
        className="
        mt-5
        text-3xl
        font-bold
        text-white
        break-all
        "
      >
        {value}
      </h2>

      <div
        className="
        absolute
        -right-10
        -top-10
        h-24
        w-24
        rounded-full
        bg-white/5
        blur-2xl
        "
      />
    </div>
  );
}

export default function App() {
  const metrics = useMetrics();

  if (!metrics) {
    return (
      <div
        className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-zinc-950
        text-zinc-500
        animate-pulse
        text-lg
        "
      >
        Loading dashboard...
      </div>
    );
  }

  return (
    <div
      className="
      min-h-screen
      bg-zinc-950
      text-white
      px-8
      py-10
      relative
      overflow-hidden
      "
    >
      <div
        className="
        absolute
        left-20
        top-20
        h-80
        w-80
        rounded-full
        bg-cyan-500/10
        blur-3xl
        animate-pulse
        "
      />

      <div
        className="
        absolute
        bottom-10
        right-20
        h-96
        w-96
        rounded-full
        bg-violet-500/10
        blur-3xl
        animate-pulse
        "
      />

      <header className="mb-12 relative z-10">
        <h1
          className="
          text-5xl
          font-bold
          tracking-tight
          "
        >
          VH Dashboard
        </h1>

        <p className="mt-3 text-zinc-500">Real-time project observability</p>
      </header>

      <div
        className="
        relative
        z-10
        grid
        gap-6
        sm:grid-cols-2
        xl:grid-cols-3
        "
      >
        <MetricCard
          title="CPU Usage"
          value={`${metrics.cpu?.toFixed(1) || 0}%`}
          icon={<Cpu size={20} />}
        />

        <MetricCard
          title="Memory"
          value={`${(
            (metrics.memory || metrics.memoryUsed || 0) /
            1024 /
            1024 /
            1024
          ).toFixed(2)} GB`}
          icon={<MemoryStick size={20} />}
        />

        <MetricCard
          title="Node Version"
          value={metrics.nodeVersion || "-"}
          icon={<Code2 size={20} />}
        />

        <MetricCard
          title="Git Branch"
          value={metrics.gitBranch || "-"}
          icon={<GitBranch size={20} />}
        />

        <MetricCard
          title="PID"
          value={String(metrics.pid || "-")}
          icon={<Hash size={20} />}
        />

        <MetricCard
          title="Platform"
          value={metrics.platform || "-"}
          icon={<Monitor size={20} />}
        />
      </div>
    </div>
  );
}
