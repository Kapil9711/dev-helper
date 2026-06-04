import { useEffect, useState } from "react";

export type Finding = {
  id: string;

  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  category: string;

  title: string;

  description: string;

  recommendation: string;

  whyItMatters: string;

  confidence: number;

  weight: number;

  files?: string[];
};

export type NavigationFinding = {
  severity: string;

  title: string;

  file: string;

  why: string;

  recommendation: string;
};

export type DashboardData = {
  runtime: {
    pid: number;

    cpu: number;

    memory: {
      usedMB: number;

      totalMB: number;
    };

    elapsed: number;

    uptime: number;
  };

  system: {
    cpu: number;

    memory: {
      usedMB: number;

      totalMB: number;
    };

    machine: {
      arch?: string;

      model?: string;

      platform?: string;
    };
  };

  project: {
    name: string;

    version: string;

    scripts: Record<string, string>;

    cwd: string;

    private?: boolean;

    dependenciesCount?: number;

    devDependenciesCount?: number;

    packageManager?: string;
  };

  git: {
    branch: string;

    changesCount: number;

    changes: string[];

    dirty?: boolean;

    staged?: string[];

    untracked?: string[];
  };

  dependencies: {
    total: number;

    devTotal: number;

    expoPackages: string[];

    nativePackages: string[];

    riskyPackages: string[];

    stateManagement: string[];

    usesFirebase: boolean;

    usesSentry: boolean;

    usesAnalytics: boolean;
  };

  structure: {
    architecture: string;

    folderCount: number;

    featureBased: boolean;

    modular: boolean;

    folders: Record<string, boolean>;
  };

  environment: {
    node: {
      version: string;

      platform: string;

      arch: string;
    };

    tooling: {
      expo?: string;

      eas?: string;

      packageManager?: string;
    };

    readiness: {
      easInstalled: boolean;

      expoInstalled: boolean;

      enoughMemory: boolean;

      supportsBuild: boolean;
    };
  };

  navigation: {
    library: string;

    filesScanned: number;

    routes: {
      stackScreens: number;

      tabScreens: number;

      routeGroups: number;
    };

    navigationUsage: {
      goBack: number;

      routerBack: number;

      replace: number;

      reset: number;

      hiddenHeaders: number;
    };

    auth: {
      redirects: number;
    };

    deepLinking: {
      configured: boolean;

      matches: number;
    };

    findings: NavigationFinding[];

    risks: {
      hiddenWithoutBack: number;

      reviewerTrapRisk: boolean;

      missingBackFlow: boolean;
    };
  };

  permissions: Record<string, unknown>;

  assets: Record<string, unknown>;

  updates: Record<string, unknown>;

  build: Record<string, unknown>;

  expo: Record<string, unknown>;

  analysis: {
    score: number;

    rejectionChance: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";

    findings: Finding[];

    grouped: {
      critical: Finding[];

      high: Finding[];

      medium: Finding[];

      low: Finding[];
    };
  };
};

export function useMetrics() {
  const [data, setData] = useState<DashboardData | undefined>();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4545");

    ws.onopen = () => {
      console.log("dashboard connected");
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed.event === "dashboard:update") {
          setData(parsed.payload);
        }
      } catch (error) {
        console.log("parse error", error);
      }
    };

    ws.onerror = () => {
      console.log("websocket error");
    };

    ws.onclose = () => {
      console.log("dashboard disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  return data;
}
