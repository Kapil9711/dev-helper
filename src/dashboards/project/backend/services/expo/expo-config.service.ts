import fs from "fs";

import path from "path";
import { ExpoConfig } from "./expo.types";

class ExpoConfigService {
  private readJson(file: string) {
    if (!fs.existsSync(file)) {
      return null;
    }

    try {
      return JSON.parse(
        fs.readFileSync(
          file,

          "utf8",
        ),
      );
    } catch {
      return null;
    }
  }

  getConfig(): ExpoConfig | null {
    const root = process.cwd();

    const appJson = this.readJson(
      path.join(
        root,

        "app.json",
      ),
    );

    if (appJson?.expo) {
      return {
        name: appJson.expo.name,

        slug: appJson.expo.slug,

        version: appJson.expo.version,

        sdkVersion: appJson.expo.sdkVersion,

        runtimeVersion: appJson.expo.runtimeVersion,

        orientation: appJson.expo.orientation,

        scheme: appJson.expo.scheme,

        owner: appJson.expo.owner,

        platforms: appJson.expo.platforms,

        icon: appJson.expo.icon,

        splash: appJson.expo.splash,

        plugins: appJson.expo.plugins,

        newArchEnabled: appJson.expo.newArchEnabled,

        ios: appJson.expo.ios,

        android: appJson.expo.android,
      };
    }

    return null;
  }
}

export const expoConfigService = new ExpoConfigService();
