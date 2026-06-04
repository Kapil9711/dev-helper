import fs from "fs";

import path from "path";

export type ProjectFile = {
  path: string;

  relativePath: string;

  name: string;

  extension: string;

  sizeKB: number;

  lines: number;

  depth: number;

  imports: string[];

  content: string;
};

class FileCollector {
  private files: ProjectFile[] = [];

  private ignored = [
    "node_modules",

    ".git",

    "dist",

    "build",

    ".expo",

    "ios/build",

    "android/build",

    ".next",

    "coverage",
  ];

  private shouldIgnore(fullPath: string) {
    return this.ignored.some((ignore) => fullPath.includes(ignore));
  }

  private collectDir(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const full = path.join(dir, item);

      if (this.shouldIgnore(full)) {
        continue;
      }

      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        this.collectDir(full);

        continue;
      }

      const valid = /\.(tsx|ts|js|jsx|json)$/i.test(full);

      if (!valid) {
        continue;
      }

      const content = fs.readFileSync(full, "utf8");

      const relative = path.relative(process.cwd(), full);

      const imports = content.match(/from\s+['"`](.*?)['"`]/g) ?? [];

      this.files.push({
        path: full,

        relativePath: relative,

        name: path.basename(full),

        extension: path.extname(full),

        sizeKB: Number((stat.size / 1024).toFixed(2)),

        lines: content.split("\n").length,

        depth: relative.split(path.sep).length,

        imports: imports.map((x) =>
          x.replace(/from\s+['"`]/, "").replace(/['"`]/g, ""),
        ),

        content,
      });
    }
  }

  collect() {
    this.files = [];

    const roots = ["src", "app", "components", "screens", "services", "hooks"];

    for (const root of roots) {
      this.collectDir(path.join(process.cwd(), root));
    }

    return this.files;
  }

  stats() {
    const files = this.collect();

    return {
      totalFiles: files.length,

      totalLines: files.reduce(
        (sum, file) => sum + file.lines,

        0,
      ),

      largestFiles: [...files].sort((a, b) => b.lines - a.lines).slice(0, 10),

      averageLines: Math.round(
        files.reduce(
          (s, x) => s + x.lines,

          0,
        ) / Math.max(files.length, 1),
      ),
    };
  }
}

export const fileCollector = new FileCollector();
