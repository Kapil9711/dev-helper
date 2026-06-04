import fs from "fs";
import path from "path";
import { fileCollector } from "./file.scanner";

export type ReactNativeData = {
  score: number;

  safeAreaCoverage: number;

  keyboardAvoidingCoverage: number;

  gestureHandlerConfigured: boolean;

  reanimatedConfigured: boolean;

  flashListUsage: number;

  flatListUsage: number;

  modalCount: number;

  navigationDepth: number;

  screenCount: number;

  expoModules: number;

  hooksUsage: {
    useMemo: number;

    useCallback: number;

    useFocusEffect: number;
  };

  findings: {
    severity: "LOW" | "MEDIUM" | "HIGH";

    title: string;

    description: string;

    file?: string;
  }[];
};

class ReactNativeScanner {
  scan(): ReactNativeData {
    const files = fileCollector.collect();

    const findings: any = [];

    let safeArea = 0;

    let keyboardAvoiding = 0;

    let screens = 0;

    let modalCount = 0;

    let flatList = 0;

    let flashList = 0;

    let navigationDepth = 0;

    let useMemo = 0;

    let useCallback = 0;

    let useFocusEffect = 0;

    const appJsonPath = path.join(process.cwd(), "app.json");

    let gestureConfigured = false;

    let reanimatedConfigured = false;

    /*
     * config checks
     */

    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

      const plugins = appJson.plugins ?? [];

      reanimatedConfigured = JSON.stringify(plugins).includes(
        "react-native-reanimated",
      );
    }

    const babel = path.join(process.cwd(), "babel.config.js");

    if (fs.existsSync(babel)) {
      const babelContent = fs.readFileSync(babel, "utf8");

      reanimatedConfigured =
        reanimatedConfigured ||
        babelContent.includes("react-native-reanimated/plugin");
    }

    const packageJson = path.join(process.cwd(), "package.json");

    if (fs.existsSync(packageJson)) {
      const pkg = fs.readFileSync(packageJson, "utf8");

      gestureConfigured = pkg.includes("react-native-gesture-handler");
    }

    for (const file of files) {
      const content = file.content;

      const isScreen =
        file.relativePath.includes("screen") ||
        file.relativePath.includes("/app/");

      if (isScreen) {
        screens++;
      }

      if (content.includes("SafeAreaView")) {
        safeArea++;
      }

      if (content.includes("KeyboardAvoidingView")) {
        keyboardAvoiding++;
      }

      modalCount += (content.match(/<Modal/g) ?? []).length;

      flatList += (content.match(/FlatList/g) ?? []).length;

      flashList += (content.match(/FlashList/g) ?? []).length;

      useMemo += (content.match(/useMemo/g) ?? []).length;

      useCallback += (content.match(/useCallback/g) ?? []).length;

      useFocusEffect += (content.match(/useFocusEffect/g) ?? []).length;

      const depth = (file.relativePath.match(/\//g) ?? []).length;

      navigationDepth = Math.max(navigationDepth, depth);
    }

    const safeCoverage = Math.round((safeArea / Math.max(screens, 1)) * 100);

    const keyboardCoverage = Math.round(
      (keyboardAvoiding / Math.max(screens, 1)) * 100,
    );

    /*
     * findings
     */

    if (safeCoverage < 40) {
      findings.push({
        severity: "MEDIUM",

        title: "Low SafeArea coverage",

        description: `${safeCoverage}% screens use SafeAreaView`,
      });
    }

    if (keyboardCoverage < 20) {
      findings.push({
        severity: "LOW",

        title: "Low keyboard handling coverage",

        description: `${keyboardCoverage}% screens use KeyboardAvoidingView`,
      });
    }

    if (!gestureConfigured) {
      findings.push({
        severity: "HIGH",

        title: "Gesture handler missing",

        description: "react-native-gesture-handler not detected",
      });
    }

    if (!reanimatedConfigured) {
      findings.push({
        severity: "MEDIUM",

        title: "Reanimated not configured",

        description: "Animations may be limited",
      });
    }

    const penalties =
      (100 - safeCoverage) * 0.2 +
      (100 - keyboardCoverage) * 0.1 +
      (!gestureConfigured ? 15 : 0) +
      (!reanimatedConfigured ? 10 : 0);

    const score = Math.max(0, Math.round(100 - penalties));

    return {
      score,

      safeAreaCoverage: safeCoverage,

      keyboardAvoidingCoverage: keyboardCoverage,

      gestureHandlerConfigured: gestureConfigured,

      reanimatedConfigured,

      flashListUsage: flashList,

      flatListUsage: flatList,

      modalCount,

      navigationDepth,

      screenCount: screens,

      expoModules: files.filter((x) => x.content.includes("expo-")).length,

      hooksUsage: {
        useMemo,

        useCallback,

        useFocusEffect,
      },

      findings,
    };
  }
}

export const reactNativeScanner = new ReactNativeScanner();
