import fs from "fs";

import path from "path";
import { fileCollector } from "./file.scanner";

export type BundleData = {
  score: number;

  totalAssetMB: number;

  imageMB: number;

  fontMB: number;

  videoMB: number;

  jsonMB: number;

  assetCount: number;

  largeAssets: {
    file: string;

    sizeMB: number;
  }[];

  imageFormats: Record<string, number>;

  estimatedJSMB: number;

  estimatedStartupRisk: "LOW" | "MEDIUM" | "HIGH";

  findings: {
    severity: "LOW" | "MEDIUM" | "HIGH";

    title: string;

    description: string;

    file?: string;
  }[];
};

class BundleScanner {
  private assetFiles: string[] = [];

  private collectAssets(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const full = path.join(dir, item);

      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        this.collectAssets(full);

        continue;
      }

      this.assetFiles.push(full);
    }
  }

  scan(): BundleData {
    const findings: any = [];

    this.assetFiles = [];

    const files = fileCollector.collect();

    const roots = ["assets", "src/assets", "public"];

    for (const root of roots) {
      this.collectAssets(path.join(process.cwd(), root));
    }

    let imageBytes = 0;

    let fontBytes = 0;

    let videoBytes = 0;

    let jsonBytes = 0;

    const formats: Record<string, number> = {};

    const largeAssets = [];

    for (const asset of this.assetFiles) {
      const stat = fs.statSync(asset);

      const ext = path.extname(asset);

      const sizeMB = Number((stat.size / 1024 / 1024).toFixed(2));

      formats[ext] = (formats[ext] ?? 0) + 1;

      if (sizeMB > 2) {
        largeAssets.push({
          file: path.relative(process.cwd(), asset),

          sizeMB,
        });
      }

      if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
        imageBytes += stat.size;
      }

      if ([".ttf", ".otf"].includes(ext)) {
        fontBytes += stat.size;
      }

      if ([".mp4", ".mov", ".webm"].includes(ext)) {
        videoBytes += stat.size;
      }

      if (ext === ".json") {
        jsonBytes += stat.size;
      }
    }

    /*
     * js estimate
     */

    const jsBytes = files.reduce(
      (sum, file) => sum + Buffer.byteLength(file.content),

      0,
    );

    const estimatedJS = Number((jsBytes / 1024 / 1024).toFixed(2));

    /*
     * findings
     */

    if (imageBytes / 1024 / 1024 > 50) {
      findings.push({
        severity: "HIGH",

        title: "Large image assets",

        description: "Images exceed 50MB",
      });
    }

    if (estimatedJS > 5) {
      findings.push({
        severity: "MEDIUM",

        title: "Large JS bundle",

        description: `${estimatedJS} MB estimated`,
      });
    }

    if (largeAssets.length > 10) {
      findings.push({
        severity: "LOW",

        title: "Many large assets",

        description: `${largeAssets.length} files exceed 2MB`,
      });
    }

    const penalties =
      largeAssets.length * 1.5 +
      estimatedJS * 3 +
      (imageBytes / 1024 / 1024) * 0.2;

    const score = Math.max(0, Math.round(100 - penalties));

    const startupRisk =
      estimatedJS > 8 ? "HIGH" : estimatedJS > 4 ? "MEDIUM" : "LOW";

    return {
      score,

      totalAssetMB: Number(
        (
          (imageBytes + fontBytes + videoBytes + jsonBytes) /
          1024 /
          1024
        ).toFixed(2),
      ),

      imageMB: Number((imageBytes / 1024 / 1024).toFixed(2)),

      fontMB: Number((fontBytes / 1024 / 1024).toFixed(2)),

      videoMB: Number((videoBytes / 1024 / 1024).toFixed(2)),

      jsonMB: Number((jsonBytes / 1024 / 1024).toFixed(2)),

      assetCount: this.assetFiles.length,

      largeAssets,

      imageFormats: formats,

      estimatedJSMB: estimatedJS,

      estimatedStartupRisk: startupRisk,

      findings,
    };
  }
}

export const bundleScanner = new BundleScanner();
