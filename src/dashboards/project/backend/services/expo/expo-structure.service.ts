import fs from "fs";

class StructureService {
  private exists(folder: string) {
    return fs.existsSync(folder);
  }

  get() {
    const commonFolders = [
      "src",

      "app",

      "assets",

      "components",

      "hooks",

      "services",

      "store",

      "navigation",

      "screens",

      "constants",

      "utils",

      "context",

      "features",

      "modules",
    ];

    const folders = commonFolders.reduce(
      (
        acc,

        folder,
      ) => {
        acc[folder] = this.exists(folder);

        return acc;
      },

      {} as Record<string, boolean>,
    );

    const architecture = this.exists("app")
      ? "expo-router"
      : this.exists("navigation")
        ? "react-navigation"
        : "unknown";

    return {
      folders,

      architecture,

      hasSrc: this.exists("src"),

      hasAssets: this.exists("assets"),

      featureBased: this.exists("features"),

      modular: this.exists("modules"),

      usesExpoRouter: architecture === "expo-router",

      usesReactNavigation: architecture === "react-navigation",

      folderCount: Object.values(folders).filter(Boolean).length,
    };
  }
}

export const structureService = new StructureService();
