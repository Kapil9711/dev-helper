import fs from "fs";

class PackageService {
  getPackages() {
    const pkg = JSON.parse(
      fs.readFileSync(
        "package.json",

        "utf8",
      ),
    );

    return {
      dependencies: Object.keys(pkg.dependencies ?? {}),

      expo: pkg.dependencies?.expo,

      reactNative: pkg.dependencies?.["react-native"],
    };
  }
}

export const packageService = new PackageService();
