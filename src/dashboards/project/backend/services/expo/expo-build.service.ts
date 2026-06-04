import fs from "fs";

type ProfileInfo = {
  name: string;

  distribution?: string;

  channel?: string;

  developmentClient?: boolean;

  autoIncrement?: boolean;

  simulator?: boolean;

  node?: string;

  envCount: number;

  hasCredentials: boolean;

  usesInternalDistribution: boolean;

  usesProductionChannel: boolean;

  profileType: "development" | "preview" | "production" | "custom";
};

class BuildService {
  private detectType(profileName: string): ProfileInfo["profileType"] {
    const name = profileName.toLowerCase();

    if (name.includes("prod")) {
      return "production";
    }

    if (name.includes("preview")) {
      return "preview";
    }

    if (name.includes("dev")) {
      return "development";
    }

    return "custom";
  }

  getBuildInfo() {
    if (!fs.existsSync("eas.json")) {
      return {
        exists: false,
      };
    }

    const eas = JSON.parse(
      fs.readFileSync(
        "eas.json",

        "utf8",
      ),
    );

    const buildProfiles = eas.build ?? {};

    const profiles: ProfileInfo[] = Object.entries(buildProfiles).map(
      ([name, profile]: any) => ({
        name,

        distribution: profile.distribution,

        channel: profile.channel,

        developmentClient: profile.developmentClient,

        autoIncrement: profile.autoIncrement,

        simulator: profile.ios?.simulator,

        node: profile.node,

        envCount: Object.keys(profile.env ?? {}).length,

        hasCredentials: !!profile.android || !!profile.ios,

        usesInternalDistribution: profile.distribution === "internal",

        usesProductionChannel: profile.channel === "production",

        profileType: this.detectType(name),
      }),
    );

    const submit = eas.submit ?? {};

    const summary = {
      totalProfiles: profiles.length,

      productionProfiles: profiles.filter((x) => x.profileType === "production")
        .length,

      internalProfiles: profiles.filter((x) => x.usesInternalDistribution)
        .length,

      missingProduction: !profiles.some((x) => x.profileType === "production"),

      missingPreview: !profiles.some((x) => x.profileType === "preview"),
    };

    return {
      exists: true,

      cliVersion: eas.cli,

      profiles,

      submit,

      summary,

      rawProfileNames: profiles.map((x) => x.name),
    };
  }
}

export const buildService = new BuildService();
