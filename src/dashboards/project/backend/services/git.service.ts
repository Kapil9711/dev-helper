import { exec } from "../../../../core/shell/exec";

class GitDashboardService {
  async getInfo() {
    const branch = (await exec("git branch --show-current", true)).trim();

    const changes = (await exec("git status --short", true))

      .split("\n")

      .filter(Boolean);

    return {
      branch,

      changesCount: changes.length,

      changes,
    };
  }
}

export const gitDashboardService = new GitDashboardService();
