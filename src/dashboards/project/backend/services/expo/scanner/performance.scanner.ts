import { fileCollector } from "./file.scanner";

export type PerformanceData = {
  score: number;

  consoleLogs: number;

  largeComponents: number;

  inlineFunctions: number;

  useEffectsWithoutDeps: number;

  missingMemoization: number;

  flatListRisks: number;

  hugeJsonFiles: number;

  asyncInsideLoops: number;

  heavyImports: string[];

  findings: {
    severity: "LOW" | "MEDIUM" | "HIGH";

    title: string;

    description: string;

    file?: string;
  }[];
};

class PerformanceScanner {
  scan(): PerformanceData {
    const files = fileCollector.collect();

    const findings: any = [];

    let consoleLogs = 0;

    let inlineFunctions = 0;

    let largeComponents = 0;

    let useEffectsWithoutDeps = 0;

    let missingMemoization = 0;

    let flatListRisks = 0;

    let hugeJsonFiles = 0;

    let asyncInsideLoops = 0;

    const heavyImports = new Set<string>();

    const heavyPackages = [
      "moment",

      "lodash",

      "firebase",

      "@aws-sdk",

      "crypto",

      "react-native-fs",

      "realm",
    ];

    for (const file of files) {
      const content = file.content;

      /*
       * console logs
       */

      const logs = content.match(/console\.(log|warn|error|debug)/g) ?? [];

      consoleLogs += logs.length;

      /*
       * inline arrow fn
       */

      const inline = content.match(/=>\s*\{/g) ?? [];

      inlineFunctions += inline.length;

      /*
       * large component
       */

      if (file.lines > 600) {
        largeComponents++;

        findings.push({
          severity: "MEDIUM",

          title: "Large component",

          description: `${file.lines} LOC component detected`,

          file: file.relativePath,
        });
      }

      /*
       * useEffect deps
       */

      const badEffects =
        content.match(/useEffect\s*\(\s*\(\)\s*=>[\s\S]*?\)\s*;/g) ?? [];

      useEffectsWithoutDeps += badEffects.length;

      /*
       * memo missing
       */

      const maps = content.match(/\.map\(/g) ?? [];

      const memo = content.includes("useMemo") || content.includes("memo(");

      if (maps.length > 5 && !memo) {
        missingMemoization++;
      }

      /*
       * flatlist
       */

      const flat = content.includes("FlatList");

      const optimized =
        content.includes("getItemLayout") || content.includes("windowSize");

      if (flat && !optimized) {
        flatListRisks++;
      }

      /*
       * huge json
       */

      if (file.extension === ".json" && file.sizeKB > 300) {
        hugeJsonFiles++;
      }

      /*
       * async loop
       */

      const asyncLoop = /for\s*\(.*\)\s*\{[\s\S]*await/g.test(content);

      if (asyncLoop) {
        asyncInsideLoops++;
      }

      /*
       * heavy imports
       */

      for (const imp of file.imports) {
        const match = heavyPackages.find((pkg) => imp.includes(pkg));

        if (match) {
          heavyImports.add(match);
        }
      }
    }

    if (consoleLogs > 20) {
      findings.push({
        severity: "LOW",

        title: "Too many console logs",

        description: `${consoleLogs} logs detected`,
      });
    }

    if (flatListRisks > 0) {
      findings.push({
        severity: "MEDIUM",

        title: "FlatList optimization risk",

        description: `${flatListRisks} lists missing optimization`,
      });
    }

    const penalties =
      largeComponents * 5 +
      useEffectsWithoutDeps * 2 +
      flatListRisks * 4 +
      missingMemoization * 3 +
      asyncInsideLoops * 4;

    const score = Math.max(0, 100 - penalties);

    return {
      score,

      consoleLogs,

      largeComponents,

      inlineFunctions,

      useEffectsWithoutDeps,

      missingMemoization,

      flatListRisks,

      hugeJsonFiles,

      asyncInsideLoops,

      heavyImports: Array.from(heavyImports),

      findings,
    };
  }
}

export const performanceScanner = new PerformanceScanner();
