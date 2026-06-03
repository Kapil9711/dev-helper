import fs from "fs";

class ProjectService {
  getInfo() {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

    return {
      name: pkg.name,
      version: pkg.version,
      scripts: pkg.scripts,
      cwd: process.cwd(),
    };
  }
}

export const projectService = new ProjectService();
