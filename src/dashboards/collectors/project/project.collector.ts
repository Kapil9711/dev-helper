import os from "os";

import { execSync } from "child_process";

export async function getProjectInfo() {
  let gitBranch = "unknown";

  let tsVersion = "not found";

  try {
    gitBranch = execSync("git branch --show-current").toString().trim();
  } catch {}

  try {
    tsVersion = execSync("tsc -v").toString().trim();
  } catch {}

  return {
    nodeVersion: process.version,

    tsVersion,

    platform: os.platform(),

    hostname: os.hostname(),

    pid: process.pid,

    cwd: process.cwd(),

    gitBranch,
  };
}
