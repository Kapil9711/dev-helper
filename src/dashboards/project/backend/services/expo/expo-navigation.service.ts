import fs from "fs";
import path from "path";

class NavigationService {
  private files: string[] = [];

  private collect(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const full = path.join(dir, item);

      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        this.collect(full);

        continue;
      }

      const valid = full.endsWith(".tsx") || full.endsWith(".ts");

      if (valid) {
        this.files.push(full);
      }
    }
  }

  scan() {
    this.files = [];

    this.collect(path.join(process.cwd(), "src"));

    this.collect(path.join(process.cwd(), "app"));

    const findings: any[] = [];

    let goBack = 0;
    let routerBack = 0;
    let replace = 0;
    let reset = 0;
    let hiddenHeaders = 0;
    let stackScreens = 0;
    let tabScreens = 0;
    let authRedirects = 0;
    let deepLinks = 0;
    let routeGroups = 0;

    for (const file of this.files) {
      const content = fs.readFileSync(file, "utf8");

      const relative = path.relative(process.cwd(), file);

      const hasGoBack =
        content.includes("goBack(") || content.includes("navigation.goBack");

      const hasRouterBack = content.includes("router.back(");

      const hasReplace = content.includes(".replace(");

      const hasReset = content.includes(".reset(");

      const hiddenHeader =
        content.includes("headerShown:false") ||
        content.includes("headerShown: false") ||
        content.includes("header: () => null");

      if (hasGoBack) {
        goBack++;
      }

      if (hasRouterBack) {
        routerBack++;
      }

      if (hasReplace) {
        replace++;
      }

      if (hasReset) {
        reset++;
      }

      if (hiddenHeader) {
        hiddenHeaders++;
      }

      if (content.includes("Stack.Screen")) {
        stackScreens++;
      }

      if (content.includes("Tabs.Screen")) {
        tabScreens++;
      }

      if (
        content.includes("router.replace") ||
        content.includes("navigate('Login'")
      ) {
        authRedirects++;
      }

      if (content.includes("scheme:") || content.includes("linking:")) {
        deepLinks++;
      }

      if (file.includes("(auth)") || file.includes("(tabs)")) {
        routeGroups++;
      }

      /*
       * Findings
       */

      if (hiddenHeader && !hasGoBack && !hasRouterBack) {
        findings.push({
          severity: "HIGH",

          title: "Potential missing back navigation",

          file: relative,

          why: "Header hidden without detected back action",

          recommendation: "Enable header or add explicit back button",
        });
      }

      if (hasReplace && !hasGoBack && !hasRouterBack) {
        findings.push({
          severity: "MEDIUM",

          title: "Replace navigation without back path",

          file: relative,

          why: "replace() removes stack history",

          recommendation: "Verify recovery path exists",
        });
      }

      if (hasReset) {
        findings.push({
          severity: "LOW",

          title: "Navigation reset used",

          file: relative,

          why: "reset() may trap reviewers",

          recommendation: "Verify navigation recovery",
        });
      }
    }

    return {
      library: fs.existsSync("app") ? "expo-router" : "react-navigation",

      filesScanned: this.files.length,

      routes: {
        stackScreens,
        tabScreens,
        routeGroups,
      },

      navigationUsage: {
        goBack,
        routerBack,
        replace,
        reset,
        hiddenHeaders,
      },

      auth: {
        redirects: authRedirects,
      },

      deepLinking: {
        configured: deepLinks > 0,

        matches: deepLinks,
      },

      findings,

      risks: {
        hiddenWithoutBack: findings.filter((x) => x.severity === "HIGH").length,

        reviewerTrapRisk: replace > goBack,

        missingBackFlow: goBack === 0 && routerBack === 0,
      },
    };
  }
}

export const navigationService = new NavigationService();
