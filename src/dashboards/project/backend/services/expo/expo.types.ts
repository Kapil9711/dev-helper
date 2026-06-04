export type ExpoConfig = {
  name?: string;

  slug?: string;

  version?: string;

  sdkVersion?: string;

  runtimeVersion?: string;

  orientation?: string;

  scheme?: string;

  owner?: string;

  platforms?: string[];

  icon?: string;

  splash?: unknown;

  plugins?: string[];

  newArchEnabled?: boolean;

  ios?: {
    bundleIdentifier?: string;

    buildNumber?: string;

    infoPlist?: Record<string, unknown>;
  };

  android?: {
    package?: string;

    versionCode?: number;

    permissions?: string[];
  };
};
