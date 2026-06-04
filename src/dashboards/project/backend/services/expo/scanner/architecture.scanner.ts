import path from "path";
import { fileCollector } from "./file.scanner";

export type ArchitectureData = {
  architecture: string;

  folderCount: number;

  featureBased: boolean;

  modular: boolean;

  averageDepth: number;

  deepestFolder: number;

  routeFiles: number;

  screenFiles: number;

  hooks: number;

  services: number;

  components: number;

  largeFiles: {
    path: string;

    lines: number;
  }[];

  circularRisk: string[];

  folders: Record<string, number>;

  findings: {
    severity: "LOW" | "MEDIUM" | "HIGH";

    title: string;

    description: string;

    file?: string;
  }[];
};

class ArchitectureScanner {
  scan(): ArchitectureData {
    const files = fileCollector.collect();

    const findings: any = [];

    const folderMap: Record<string, number> = {};

    let totalDepth = 0;

    let deepest = 0;

    let screens = 0;

    let hooks = 0;

    let services = 0;

    let components = 0;

    let routeFiles = 0;

    const importMap = new Map<string, string[]>();

    for (const file of files) {
      const folder = path.dirname(file.relativePath);

      folderMap[folder] = (folderMap[folder] ?? 0) + 1;

      totalDepth += file.depth;

      deepest = Math.max(deepest, file.depth);

      if (file.relativePath.includes("screen")) {
        screens++;
      }

      if (file.relativePath.includes("hook")) {
        hooks++;
      }

      if (file.relativePath.includes("service")) {
        services++;
      }

      if (file.relativePath.includes("component")) {
        components++;
      }

      if (
        file.relativePath.includes("/app/") ||
        file.relativePath.includes("_layout")
      ) {
        routeFiles++;
      }

      importMap.set(file.relativePath, file.imports);
    }

    /*
     * detect large files
     */

    const largeFiles = files
      .filter((f) => f.lines > 500)
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 10)
      .map((file) => ({
        path: file.relativePath,

        lines: file.lines,
      }));

    if (largeFiles.length > 0) {
      findings.push({
        severity: "MEDIUM",

        title: "Large files detected",

        description: `${largeFiles.length} files exceed 500 LOC`,
      });
    }

    /*
     * circular dependency risk
     */

    const circularRisk: string[] = [];

    for (const [file, imports] of importMap) {
      for (const imp of imports) {
        const found = importMap.get(imp)?.includes(file);

        if (found) {
          circularRisk.push(`${file} ↔ ${imp}`);
        }
      }
    }

    if (circularRisk.length > 0) {
      findings.push({
        severity: "HIGH",

        title: "Circular dependency risk",

        description: `${circularRisk.length} possible cycles found`,
      });
    }

    /*
     * architecture guess
     */

    const featureBased = Object.keys(folderMap).some(
      (folder) => folder.includes("feature") || folder.includes("module"),
    );

    const modular = services > 0 && hooks > 0 && components > 0;

    const architecture = featureBased
      ? "feature-based"
      : modular
        ? "modular"
        : "layer-based";

    return {
      architecture,

      folderCount: Object.keys(folderMap).length,

      featureBased,

      modular,

      averageDepth: Math.round(totalDepth / Math.max(files.length, 1)),

      deepestFolder: deepest,

      routeFiles,

      screenFiles: screens,

      hooks,

      services,

      components,

      largeFiles,

      circularRisk,

      folders: folderMap,

      findings,
    };
  }
}

export const architectureScanner = new ArchitectureScanner();
