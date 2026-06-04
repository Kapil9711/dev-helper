import os from "os";
import { execSync } from "child_process";

class EnvironmentService {
  private cache: any;

  private safe(fn: () => any) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  get() {
    if (this.cache) {
      return this.cache;
    }

    this.cache = {
      node: {
        version: process.version,

        platform: process.platform,

        arch: process.arch,
      },

      tooling: {
        expo: this.safe(() =>
          execSync("npx expo --version 2>/dev/null").toString().trim(),
        ),

        eas: this.safe(() =>
          execSync("eas --version 2>/dev/null").toString().trim(),
        ),

        pnpm: this.safe(() =>
          execSync("pnpm -v 2>/dev/null").toString().trim(),
        ),
      },

      system: {
        cpu: os.cpus().length,
      },
    };

    return this.cache;
  }
}

export const environmentService = new EnvironmentService();
