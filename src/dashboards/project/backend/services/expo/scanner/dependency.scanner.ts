import fs from "fs";
import path from "path";

export type DependencyInfo = {
  total: number;

  production: number;

  development: number;

  dependencies: Record<string, string>;

  devDependencies: Record<string, string>;

  expoPackages: string[];

  nativePackages: string[];

  stateManagement: string[];

  analytics: string[];

  firebase: boolean;

  sentry: boolean;

  packageManager: string;

  riskyPackages: string[];

  duplicateFamilies: string[];

  categories: {
    ui: number;

    networking: number;

    storage: number;

    testing: number;
  };
};

class DependencyCollector {
  private packageJson() {
    const file = path.join(process.cwd(), "package.json");

    if (!fs.existsSync(file)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  private detectPackageManager() {
    if (fs.existsSync("pnpm-lock.yaml")) {
      return "pnpm";
    }

    if (fs.existsSync("yarn.lock")) {
      return "yarn";
    }

    if (fs.existsSync("package-lock.json")) {
      return "npm";
    }

    return "unknown";
  }

  collect(): DependencyInfo {
    const pkg = this.packageJson();

    const deps = pkg?.dependencies ?? {};

    const devDeps = pkg?.devDependencies ?? {};

    const all = {
      ...deps,

      ...devDeps,
    };

    const names = Object.keys(all);

    const expoPackages = names.filter(
      (x) => x.startsWith("expo") || x.startsWith("@expo"),
    );

    const nativePackages = names.filter((x) => x.includes("react-native"));

    const riskyPackages = names.filter((x) =>
      [
        "react-native-fs",
        "eval",
        "realm",
        "react-native-webview",
        "crypto",
        "react-native-device-info",
      ].includes(x),
    );

    const duplicateFamilies = [];

    if (
      names.some((x) => x.includes("moment")) &&
      names.some((x) => x.includes("dayjs"))
    ) {
      duplicateFamilies.push("moment + dayjs");
    }

    if (
      names.some((x) => x.includes("axios")) &&
      names.some((x) => x.includes("fetch"))
    ) {
      duplicateFamilies.push("axios + fetch");
    }

    return {
      total: names.length,

      production: Object.keys(deps).length,

      development: Object.keys(devDeps).length,

      dependencies: deps,

      devDependencies: devDeps,

      expoPackages,

      nativePackages,

      packageManager: this.detectPackageManager(),

      firebase: names.some((x) => x.includes("firebase")),

      sentry: names.some((x) => x.includes("sentry")),

      analytics: names.filter(
        (x) =>
          x.includes("analytics") ||
          x.includes("segment") ||
          x.includes("mixpanel"),
      ),

      stateManagement: names.filter((x) =>
        ["redux", "zustand", "mobx", "recoil", "jotai"].some((state) =>
          x.includes(state),
        ),
      ),

      riskyPackages,

      duplicateFamilies,

      categories: {
        ui: names.filter(
          (x) =>
            x.includes("ui") ||
            x.includes("paper") ||
            x.includes("native-base"),
        ).length,

        networking: names.filter(
          (x) => x.includes("axios") || x.includes("query"),
        ).length,

        storage: names.filter(
          (x) => x.includes("storage") || x.includes("async"),
        ).length,

        testing: names.filter(
          (x) => x.includes("jest") || x.includes("testing"),
        ).length,
      },
    };
  }
}

export const dependencyCollector = new DependencyCollector();
