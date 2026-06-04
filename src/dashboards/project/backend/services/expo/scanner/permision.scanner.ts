import { RiskFinding } from "../expo-risk.service";

type Rule = {
  ios?: string;

  android?: string[];

  title: string;

  plugin?: string;

  indicators?: string[];
};

class PermissionScanner {
  private rules: Record<string, Rule> = {
    "expo-camera": {
      ios: "NSCameraUsageDescription",

      android: ["CAMERA"],

      title: "Camera",

      indicators: ["launchCameraAsync", "requestCameraPermissionsAsync"],
    },

    "expo-location": {
      ios: "NSLocationWhenInUseUsageDescription",

      android: ["ACCESS_FINE_LOCATION"],

      title: "Location",

      indicators: [
        "requestForegroundPermissionsAsync",
        "getCurrentPositionAsync",
        "watchPositionAsync",
      ],
    },

    "expo-image-picker": {
      ios: "NSPhotoLibraryUsageDescription",

      title: "Photos",

      indicators: ["launchImageLibraryAsync"],
    },

    "expo-av": {
      ios: "NSMicrophoneUsageDescription",

      android: ["RECORD_AUDIO"],

      title: "Microphone",

      indicators: ["Audio.", "Recording"],
    },

    "expo-notifications": {
      ios: "NSUserNotificationsUsageDescription",

      title: "Notifications",

      plugin: "expo-notifications",

      indicators: [
        "getExpoPushTokenAsync",
        "requestPermissionsAsync",
        "scheduleNotificationAsync",
      ],
    },
  };

  private codeUsesFeature(pkg: string, files: string[]) {
    const rule = this.rules[pkg];

    if (!rule?.indicators) {
      return true;
    }

    return files.some((content) =>
      rule.indicators!.some((indicator) => content.includes(indicator)),
    );
  }

  scan(
    config: any,

    packages: string[],

    fileContents: string[] = [],
  ) {
    const findings: RiskFinding[] = [];

    const infoPlist = config?.ios?.infoPlist ?? {};

    const permissions = config?.android?.permissions ?? [];

    const blocked = config?.android?.blockedPermissions ?? [];

    const plugins = config?.plugins ?? [];

    for (const pkg of packages) {
      const rule = this.rules[pkg];

      if (!rule) {
        continue;
      }

      /*
       * skip unused package
       */

      const used = this.codeUsesFeature(pkg, fileContents);

      if (!used) {
        continue;
      }

      /*
       * ios reason
       */

      if (rule.ios && !infoPlist[rule.ios]) {
        findings.push({
          id: `${pkg}-ios`,

          severity: "CRITICAL",

          category: "permission",

          title: `${rule.title} reason missing`,

          description: `${rule.ios} not configured`,

          whyItMatters: "Store rejection risk",

          recommendation: `Add ${rule.ios}`,

          confidence: 98,

          weight: 30,

          files: ["app.json"],
        });
      }

      /*
       * android
       */

      for (const perm of rule.android ?? []) {
        const exists = permissions.some((x: string) => x.includes(perm));

        if (!exists) {
          findings.push({
            id: `${pkg}-${perm}`,

            severity: "HIGH",

            category: "permission",

            title: `${perm} missing`,

            description: "Permission not declared",

            whyItMatters: "Feature may fail",

            recommendation: `Add ${perm}`,

            confidence: 85,

            weight: 20,

            files: ["app.json"],
          });
        }
      }

      /*
       * plugin
       */

      if (rule.plugin) {
        const exists = plugins.some((plugin: any) =>
          JSON.stringify(plugin).includes(rule.plugin!),
        );

        if (!exists) {
          findings.push({
            id: `${pkg}-plugin`,

            severity: "LOW",

            category: "permission",

            title: "Plugin missing",

            description: "Plugin config missing",

            whyItMatters: "Feature may break",

            recommendation: `Configure ${rule.plugin}`,

            confidence: 70,

            weight: 5,

            files: ["app.json"],
          });
        }
      }
    }

    /*
     * blocked permissions
     */

    for (const perm of blocked) {
      findings.push({
        id: `blocked-${perm}`,

        severity: "LOW",

        category: "permission",

        title: "Blocked permission",

        description: `${perm} blocked explicitly`,

        whyItMatters: "Verify feature still works",

        recommendation: "Confirm permission unnecessary",

        confidence: 60,

        weight: 3,

        files: ["app.json"],
      });
    }

    return findings;
  }
}

export const permissionScanner = new PermissionScanner();
