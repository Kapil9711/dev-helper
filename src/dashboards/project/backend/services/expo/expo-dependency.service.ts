import fs from "fs";

class DependencyService {
  getInfo() {
    const pkg = JSON.parse(
      fs.readFileSync(
        "package.json",

        "utf8",
      ),
    );

    const dependencies = pkg.dependencies ?? {};

    const devDependencies = pkg.devDependencies ?? {};

    const allDeps = [
      ...Object.keys(dependencies),

      ...Object.keys(devDependencies),
    ];

    const expoPackages = allDeps.filter((x) => x.startsWith("expo"));

    const nativePackages = allDeps.filter((x) => x.includes("react-native"));

    const riskyPackages = [
      "expo-camera",

      "expo-location",

      "expo-av",

      "react-native-fs",

      "react-native-webview",
    ].filter((pkg) => allDeps.includes(pkg));

    const stateManagement = allDeps.filter((pkg) =>
      [
        "redux",

        "@reduxjs/toolkit",

        "zustand",

        "mobx",

        "recoil",

        "jotai",
      ].includes(pkg),
    );

    return {
      total: Object.keys(dependencies).length,

      devTotal: Object.keys(devDependencies).length,

      expoPackages,

      nativePackages,

      riskyPackages,

      stateManagement,

      usesFirebase: allDeps.some((x) => x.includes("firebase")),

      usesSentry: allDeps.some((x) => x.includes("sentry")),

      usesAnalytics: allDeps.some(
        (x) => x.includes("analytics") || x.includes("segment"),
      ),

      packageManager: pkg.packageManager,
    };
  }
}

export const dependencyService = new DependencyService();
