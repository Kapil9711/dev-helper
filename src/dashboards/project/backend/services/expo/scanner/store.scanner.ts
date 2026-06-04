import { RiskFinding } from "../expo-risk.service";

class StoreScanner {
  scan(config: any): RiskFinding[] {
    const findings: RiskFinding[] = [];

    const add = (finding: RiskFinding) => {
      findings.push(finding);
    };

    /*
     * version
     */
    if (!config?.version) {
      add({
        id: "missing_version",

        severity: "HIGH",

        category: "store",

        title: "Version missing",

        description: "App version not configured",

        recommendation: "Set expo.version",

        whyItMatters: "Required for releases",

        confidence: 100,

        weight: 20,

        files: ["app.json"],
      });
    }

    /*
     * runtime version
     */
    if (!config?.runtimeVersion) {
      add({
        id: "runtime_version",

        severity: "MEDIUM",

        category: "store",

        title: "Runtime version missing",

        description: "OTA update compatibility may break",

        recommendation: "Add runtimeVersion",

        whyItMatters: "Safer update rollout",

        confidence: 85,

        weight: 10,

        files: ["app.json"],
      });
    }

    /*
     * ios bundle
     */
    if (!config?.ios?.bundleIdentifier) {
      add({
        id: "bundle_missing",

        severity: "CRITICAL",

        category: "store",

        title: "Bundle identifier missing",

        description: "ios.bundleIdentifier absent",

        recommendation: "Configure bundle id",

        whyItMatters: "Cannot ship iOS app",

        confidence: 100,

        weight: 40,

        files: ["app.json"],
      });
    }

    /*
     * android package
     */
    if (!config?.android?.package) {
      add({
        id: "android_package",

        severity: "CRITICAL",

        category: "store",

        title: "Android package missing",

        description: "android.package missing",

        recommendation: "Set android package",

        whyItMatters: "Cannot publish Android build",

        confidence: 100,

        weight: 40,

        files: ["app.json"],
      });
    }

    /*
     * version code
     */
    if (!config?.android?.versionCode) {
      add({
        id: "version_code",

        severity: "HIGH",

        category: "store",

        title: "Android versionCode missing",

        description: "Play Store upgrades may fail",

        recommendation: "Add versionCode",

        whyItMatters: "Required for updates",

        confidence: 95,

        weight: 20,

        files: ["app.json"],
      });
    }

    /*
     * build number
     */
    if (!config?.ios?.buildNumber) {
      add({
        id: "build_number",

        severity: "HIGH",

        category: "store",

        title: "iOS build number missing",

        description: "Build upgrades may fail",

        recommendation: "Set ios.buildNumber",

        whyItMatters: "Required by App Store",

        confidence: 95,

        weight: 20,

        files: ["app.json"],
      });
    }

    /*
     * icon
     */
    if (!config?.icon) {
      add({
        id: "icon_missing",

        severity: "HIGH",

        category: "store",

        title: "App icon missing",

        description: "No app icon configured",

        recommendation: "Add expo.icon",

        whyItMatters: "Store asset required",

        confidence: 95,

        weight: 15,

        files: ["app.json"],
      });
    }

    /*
     * splash
     */
    if (!config?.splash) {
      add({
        id: "splash_missing",

        severity: "LOW",

        category: "store",

        title: "Splash config missing",

        description: "No splash screen config",

        recommendation: "Configure splash",

        whyItMatters: "Improves polish",

        confidence: 70,

        weight: 5,

        files: ["app.json"],
      });
    }

    /*
     * scheme
     */
    if (!config?.scheme) {
      add({
        id: "scheme_missing",

        severity: "MEDIUM",

        category: "store",

        title: "Deep link scheme missing",

        description: "No app scheme configured",

        recommendation: "Add scheme",

        whyItMatters: "Deep linking support",

        confidence: 80,

        weight: 10,

        files: ["app.json"],
      });
    }

    /*
     * updates
     */
    if (!config?.updates) {
      add({
        id: "updates_missing",

        severity: "LOW",

        category: "store",

        title: "Expo updates config missing",

        description: "OTA strategy absent",

        recommendation: "Configure updates",

        whyItMatters: "Safer releases",

        confidence: 60,

        weight: 5,

        files: ["app.json"],
      });
    }

    return findings;
  }
}

export const storeScanner = new StoreScanner();
