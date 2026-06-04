import fs from "fs";
import path from "path";

import { RiskFinding } from "../expo-risk.service";

class NavigationScanner {
  private files: string[] = [];

  private collectFiles(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const full = path.join(dir, item);

      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        this.collectFiles(full);

        continue;
      }

      if (full.endsWith(".tsx") || full.endsWith(".ts")) {
        this.files.push(full);
      }
    }
  }

  private relative(file: string) {
    return path.relative(process.cwd(), file);
  }

  scan(): RiskFinding[] {
    this.files = [];

    const findings: RiskFinding[] = [];

    this.collectFiles(path.join(process.cwd(), "src"));

    this.collectFiles(path.join(process.cwd(), "app"));

    for (const file of this.files) {
      const content = fs.readFileSync(file, "utf8");

      const relative = this.relative(file);

      /*
       * navigator containers
       */

      const isNavigator =
        content.includes("createNativeStackNavigator") ||
        content.includes("createBottomTabNavigator") ||
        content.includes("createDrawerNavigator") ||
        content.includes("<Stack.Navigator") ||
        content.includes("<Tabs.Navigator") ||
        relative.includes("/navigation/");

      /*
       * navigation methods only
       */

      const hasBack =
        /navigation\.goBack\s*\(/.test(content) ||
        /router\.back\s*\(/.test(content) ||
        /\.goBack\s*\(/.test(content) ||
        /canGoBack\s*\(/.test(content) ||
        /<Back/.test(content);

      const hiddenHeader = /headerShown\s*:\s*false/.test(content);

      /*
       * detect navigation replace only
       */

      const navigationReplace =
        /navigation\.replace\s*\(/.test(content) ||
        /router\.replace\s*\(/.test(content) ||
        /\.dispatch\s*\(\s*StackActions\.replace/.test(content);

      /*
       * detect reset only
       */

      const navigationReset =
        /navigation\.reset\s*\(/.test(content) ||
        /\.dispatch\s*\(\s*CommonActions\.reset/.test(content);

      /*
       * skip navigators
       */

      if (hiddenHeader && !hasBack && !isNavigator) {
        findings.push({
          id: "missing_back_navigation",

          severity: "HIGH",

          category: "navigation",

          title: "Potential missing back navigation",

          description: "Header hidden but no back navigation detected",

          whyItMatters: "Users or reviewers may get trapped",

          recommendation: "Add explicit back button or enable header",

          confidence: 80,

          weight: 20,

          files: [relative],
        });
      }

      if (navigationReplace && !hasBack) {
        findings.push({
          id: "replace_navigation",

          severity: "MEDIUM",

          category: "navigation",

          title: "Navigation replace detected",

          description:
            "Navigation stack replaced without visible recovery path",

          whyItMatters: "Users may not navigate backwards",

          recommendation: "Verify alternative return flow",

          confidence: 70,

          weight: 10,

          files: [relative],
        });
      }

      if (navigationReset) {
        findings.push({
          id: "navigation_reset",

          severity: "LOW",

          category: "navigation",

          title: "Navigation reset detected",

          description: "Navigation reset flow used",

          whyItMatters: "Reviewers may lose navigation context",

          recommendation: "Verify recovery path exists",

          confidence: 55,

          weight: 5,

          files: [relative],
        });
      }
    }

    return findings;
  }
}

export const navigationScanner = new NavigationScanner();
