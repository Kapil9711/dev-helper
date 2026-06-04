import fs from "fs";

import path from "path";

type AssetMeta = {
  exists: boolean;

  absolutePath?: string;

  relativePath?: string;

  sizeKB?: number;
};

class AssetService {
  private resolveAsset(assetPath?: string): AssetMeta {
    if (!assetPath) {
      return {
        exists: false,
      };
    }

    const full = path.join(
      process.cwd(),

      assetPath,
    );

    if (!fs.existsSync(full)) {
      return {
        exists: false,

        relativePath: assetPath,
      };
    }

    const stat = fs.statSync(full);

    return {
      exists: true,

      absolutePath: full,

      relativePath: assetPath,

      sizeKB: Number((stat.size / 1024).toFixed(1)),
    };
  }

  validate(config: any) {
    const icon = this.resolveAsset(config?.icon);

    const splash = this.resolveAsset(config?.splash?.image);

    const adaptive = this.resolveAsset(
      config?.android?.adaptiveIcon?.foregroundImage,
    );

    const favicon = this.resolveAsset(config?.web?.favicon);

    const notification = this.resolveAsset(config?.notification?.icon);

    return {
      icon,

      splash,

      adaptiveIcon: adaptive,

      favicon,

      notification,

      summary: {
        total: [icon, splash, adaptive, favicon, notification].filter(
          (x) => x.exists,
        ).length,

        missing: [icon, splash, adaptive, favicon, notification].filter(
          (x) => !x.exists,
        ).length,
      },
    };
  }
}

export const assetService = new AssetService();
