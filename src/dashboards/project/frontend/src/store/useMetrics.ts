import { useEffect, useState } from "react";

type DashboardData = {
  runtime: {
    pid: number;

    cpu: number;

    memory: any;

    elapsed: number;

    uptime: number;
  };

  project: {
    name: string;

    version: string;

    scripts: Record<string, string>;

    cwd: string;
  };

  git: {
    branch: string;

    changesCount: number;

    changes: string[];
  };
};

export function useMetrics() {
  const [data, setData] = useState<DashboardData | undefined>();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4545");

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);

      if (parsed.event === "dashboard:update") {
        setData(parsed.payload);
      }
    };

    ws.onerror = () => {
      console.log("Websocket disconnected");
    };

    return () => ws.close();
  }, []);

  return data;
}
