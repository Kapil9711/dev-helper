import fs from "fs";
import path from "path";

import { RiskFinding } from "../expo-risk.service";

class AuthScanner {
  private files: string[] = [];

  private collect(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);

      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        this.collect(full);

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

  private isRootFile(relative: string) {
    return (
      relative.includes("navigation") ||
      relative.includes("_layout") ||
      relative.includes("App.tsx") ||
      relative.includes("Root") ||
      relative.includes("index.tsx")
    );
  }

  scan(): RiskFinding[] {
    this.files = [];

    const findings: RiskFinding[] = [];

    this.collect(path.join(process.cwd(), "src"));

    this.collect(path.join(process.cwd(), "app"));

    let logoutFound = false;

    let guestFound = false;

    let deleteFound = false;

    let hasAuth = false;

    let reviewBlockers = 0;

    for (const file of this.files) {
      const raw = fs.readFileSync(file, "utf8");

      const content = raw
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

      const relative = this.relative(file);

      const forcedLogin =
        /router\.replace\s*\(\s*['"`].*login/i.test(content) ||
        /navigation\.replace\s*\(\s*['"`].*login/i.test(content) ||
        /navigate\s*\(\s*['"`]Login/i.test(content);

      const immediateLoginWall = forcedLogin && this.isRootFile(relative);

      const authUsage =
        /accessToken/i.test(content) ||
        /refreshToken/i.test(content) ||
        /isLoggedIn/i.test(content) ||
        /ProtectedRoute/i.test(content) ||
        /AuthGuard/i.test(content);

      const guest =
        /continue as guest/i.test(content) ||
        /skip login/i.test(content) ||
        /guest mode/i.test(content);

      const logout =
        /logout\s*\(/i.test(content) ||
        /signOut\s*\(/i.test(content) ||
        /clearSession/i.test(content);

      const deleteAccount =
        /deleteAccount/i.test(content) ||
        /Delete Account/i.test(content) ||
        /removeAccount/i.test(content) ||
        /requestDeletion/i.test(content);

      if (authUsage) {
        hasAuth = true;
      }

      if (guest) {
        guestFound = true;
      }

      if (logout) {
        logoutFound = true;
      }

      if (deleteAccount) {
        deleteFound = true;
      }

      if (immediateLoginWall) {
        reviewBlockers++;

        findings.push({
          id: `review-lock-${relative}`,

          severity: "HIGH",

          category: "store",

          title: "Immediate login wall detected",

          description: "Root navigation redirects directly to login",

          whyItMatters: "Reviewers may be unable to inspect app",

          recommendation: "Provide guest access or reviewer credentials",

          confidence: 90,

          weight: 20,

          files: [relative],
        });
      }
    }

    /*
     * global
     */

    if (reviewBlockers > 0 && !guestFound) {
      findings.push({
        id: "review-access",

        severity: "MEDIUM",

        category: "store",

        title: "Reviewer access risk",

        description: "Login wall found without public flow",

        whyItMatters: "Can slow or block review",

        recommendation: "Provide demo account or guest mode",

        confidence: 80,

        weight: 15,
      });
    }

    if (hasAuth && !logoutFound) {
      findings.push({
        id: "logout-check",

        severity: "LOW",

        category: "security",

        title: "Logout flow not detected",

        description: "Could not find logout implementation",

        whyItMatters: "Authenticated apps generally expose logout",

        recommendation: "Verify logout exists",

        confidence: 40,

        weight: 2,
      });
    }

    if (hasAuth && !deleteFound) {
      findings.push({
        id: "delete-account",

        severity: "CRITICAL",

        category: "store",

        title: "Delete account flow not detected",

        description: "Authenticated app without visible deletion flow",

        whyItMatters: "Common store rejection reason",

        recommendation: "Add delete account entry point",

        confidence: 85,

        weight: 30,
      });
    }

    return findings;
  }
}

export const authScanner = new AuthScanner();
