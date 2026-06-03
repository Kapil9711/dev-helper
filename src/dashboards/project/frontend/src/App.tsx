import "./App.css";

import {
  Cpu,
  MemoryStick,
  GitBranch,
  FolderCode,
  Hash,
  Monitor,
  Activity,
  Folder,
  FileCode2,
} from "lucide-react";

import { useMetrics } from "./store/useMetrics";

function Card({ title, value, icon }: any) {
  return (
    <div
      className="
      rounded-2xl
      border
      border-zinc-800
      bg-zinc-900/60
      backdrop-blur-xl
      p-5
      transition
      hover:border-zinc-700
      "
    >
      <div className="flex justify-between items-center">
        <span className="text-zinc-400 text-sm">{title}</span>

        {icon}
      </div>

      <div
        className="
        mt-4
        text-2xl
        font-bold
        text-white
        "
      >
        {value}
      </div>
    </div>
  );
}

export default function App() {
  const data = useMetrics();

  if (!data) {
    return (
      <div
        className="
        min-h-screen
        bg-zinc-950
        flex
        items-center
        justify-center
        text-zinc-500
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
      w-screen
      bg-zinc-950
      text-white
      flex
      "
    >
      {/* SIDEBAR */}

      <aside
        className="
        w-72
        border-r
        border-zinc-900
        p-6
        flex
        flex-col
        "
      >
        <h1
          className="
          text-2xl
          font-bold
          "
        >
          VH Dashboard
        </h1>

        <p className="text-zinc-500 mt-1">Dev Observability</p>

        <div className="mt-10 space-y-3">
          <SidebarItem label="Dashboard" />

          <SidebarItem label="Console" />

          <SidebarItem label="Network" />

          <SidebarItem label="API Docs" />
        </div>
      </aside>

      {/* CONTENT */}

      <main
        className="
        flex-1
        p-8
        overflow-auto
        "
      >
        {/* PROJECT */}

        <section>
          <h2
            className="
            text-3xl
            font-bold
            "
          >
            {data.project.name}
          </h2>

          <p className="text-zinc-500 mt-2">{data.project.cwd}</p>
        </section>

        {/* METRICS */}

        <section
          className="
          grid
          grid-cols-4
          gap-5
          mt-8
          "
        >
          <Card
            title="CPU"
            value={`${data.runtime.cpu.toFixed(1)}%`}
            icon={<Cpu />}
          />

          <Card
            title="System RAM"
            value={data?.runtime?.memory?.usedMB.toFixed(2)}
            icon={<MemoryStick />}
          />

          <Card title="PID" value={data.runtime.pid} icon={<Hash />} />

          <Card
            title="Uptime"
            value={`${Math.floor(data.runtime.uptime)}s`}
            icon={<Activity />}
          />
        </section>

        {/* PROJECT + GIT */}

        <div
          className="
          grid
          grid-cols-2
          gap-6
          mt-8
          "
        >
          <div
            className="
            rounded-2xl
            border
            border-zinc-800
            p-6
            "
          >
            <h3 className="font-semibold">Project</h3>

            <div className="mt-5 space-y-4">
              <Row
                icon={<Folder />}
                label="Version"
                value={data.project.version}
              />

              <Row
                icon={<FileCode2 />}
                label="Scripts"
                value={String(Object.keys(data.project.scripts).length)}
              />

              <Row
                icon={<Monitor />}
                label="Platform"
                value={navigator.platform}
              />
            </div>
          </div>

          <div
            className="
            rounded-2xl
            border
            border-zinc-800
            p-6
            "
          >
            <h3 className="font-semibold">Git</h3>

            <div className="mt-5 space-y-4">
              <Row
                icon={<GitBranch />}
                label="Branch"
                value={data.git.branch}
              />

              <Row
                icon={<FolderCode />}
                label="Changes"
                value={String(data.git.changesCount)}
              />
            </div>
          </div>
        </div>

        {/* CONSOLE */}

        <section
          className="
          mt-8
          rounded-2xl
          border
          border-zinc-800
          bg-black
          p-6
          h-72
          overflow-auto
          "
        >
          <div className="text-zinc-500">Console logs will stream here...</div>
        </section>
      </main>
    </div>
  );
}

function SidebarItem({ label }: { label: string }) {
  return (
    <button
      className="
      w-full
      rounded-xl
      p-3
      text-left
      text-zinc-400
      hover:bg-zinc-900
      "
    >
      {label}
    </button>
  );
}

function Row({ icon, label, value }: any) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-3 items-center text-zinc-400">
        {icon}

        {label}
      </div>

      <span className="font-medium">{value}</span>
    </div>
  );
}
