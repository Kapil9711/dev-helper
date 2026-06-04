class UpdateService {
  get(config: any) {
    const updates = config?.updates ?? {};

    const runtimeVersion = config?.runtimeVersion;

    const url = updates.url;

    const checkAutomatically = updates.checkAutomatically;

    const fallbackTimeout = updates.fallbackToCacheTimeout;

    const channel = updates.channel;

    const enabled = !!config?.updates;

    const risks = [];

    /*
     * runtime risks
     */

    if (!runtimeVersion) {
      risks.push({
        severity: "HIGH",

        issue: "runtimeVersion missing",

        why: "OTA updates can break across native versions",
      });
    }

    /*
     * update disabled
     */

    if (!enabled) {
      risks.push({
        severity: "MEDIUM",

        issue: "Expo updates disabled",

        why: "Cannot hotfix users quickly",
      });
    }

    /*
     * channel
     */

    if (!channel) {
      risks.push({
        severity: "LOW",

        issue: "Update channel missing",

        why: "Harder rollout management",
      });
    }

    /*
     * timeout
     */

    if (fallbackTimeout === undefined) {
      risks.push({
        severity: "LOW",

        issue: "fallbackToCacheTimeout missing",

        why: "Cold start behavior unclear",
      });
    }

    return {
      enabled,

      runtimeVersion,

      updates,

      configuration: {
        channel,

        url,

        checkAutomatically,

        fallbackTimeout,
      },

      readiness: {
        hasRuntime: !!runtimeVersion,

        hasChannel: !!channel,

        hasUrl: !!url,

        hasFallbackTimeout: fallbackTimeout !== undefined,
      },

      risks,

      strategy: {
        usesOTA: enabled,

        safeRuntime: !!runtimeVersion,

        rolloutReady: !!runtimeVersion && !!channel,
      },

      summary: {
        totalRisks: risks.length,

        highRisks: risks.filter((risk) => risk.severity === "HIGH").length,
      },
    };
  }
}

export const updateService = new UpdateService();
