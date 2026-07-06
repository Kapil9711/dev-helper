import { Option } from "@clack/prompts";
import { exec, ExecResult } from "../shell/exec.ts";
import { GitDisplay, GitParser, GitStatusHelper } from "./parser.services.ts";
import {
  GitBranch,
  GitChangedFile,
  GitCurrentBranch,
  GitFileKind,
  GitStatus,
} from "./parser.types.ts";

export class GitParserController {
  async isRepository(): Promise<boolean> {
    const result = await exec("git rev-parse --is-inside-work-tree");

    return result.success && result.stdout === "true";
  }

  async getRepositoryRoot(): Promise<string> {
    const result = await exec("git rev-parse --show-toplevel", {
      throwOnError: true,
    });

    return result.stdout;
  }

  async getCurrentBranch(): Promise<string> {
    const result = await exec("git branch --show-current", {
      throwOnError: true,
    });

    return result.stdout;
  }

  async getCurrentCommit(): Promise<string> {
    const result = await exec("git rev-parse HEAD", {
      throwOnError: true,
    });

    return result.stdout;
  }

  async getRemotes(): Promise<string[]> {
    const result = await exec("git remote", {
      throwOnError: true,
    });

    return result.stdout
      .split("\n")
      .map((remote) => remote.trim())
      .filter(Boolean);
  }
  async remoteBranchExists(
    branch: string,
    remote = "origin",
  ): Promise<boolean> {
    const result = await exec(
      `git ls-remote --heads ${remote} refs/heads/${branch}`,
      {
        throwOnError: true,
      },
    );

    return result.stdout.trim() !== "";
  }
  async ensureUpstream(branch: string, remote = "origin"): Promise<ExecResult> {
    const successResult: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: true,
      command: "",
    };

    const status = await this.getStatus();

    // Already configured
    if (status.currentBranch.upstream) {
      return successResult;
    }

    const remoteBranch = `${remote}/${branch}`;

    const remoteBranchExists = await this.remoteBranchExists(branch, remote);

    if (!remoteBranchExists) {
      return {
        ...successResult,
        success: false,
        stderr: `Remote branch '${remoteBranch}' does not exist.`,
      };
    }

    // Make sure the remote tracking ref exists locally.
    const fetchResult = await exec(`git fetch ${remote}`);

    if (!fetchResult.success) {
      return fetchResult;
    }

    const upstreamResult = await exec(
      `git branch --set-upstream-to=${remoteBranch}`,
    );

    if (!upstreamResult.success) {
      return upstreamResult;
    }

    return successResult;
  }

  async getRemoteUrl(remote = "origin"): Promise<string> {
    const result = await exec(`git remote get-url ${remote}`, {
      throwOnError: true,
    });

    return result.stdout;
  }

  async getBranches(
    type: "all" | "local" | "remote" | "current" = "all",
  ): Promise<GitBranch[]> {
    const result = await exec(
      `git for-each-ref --format="%(HEAD)|%(refname:short)|%(refname)" refs/heads refs/remotes`,
      {
        throwOnError: true,
      },
    );

    const branches = result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [head, shortName, fullRef] = line.split("|");

        return {
          name: shortName,
          current: head === "*",
          remote: fullRef.startsWith("refs/remotes"),
        };
      });

    switch (type) {
      case "current":
        return branches.filter((branch) => branch.current);

      case "local":
        return branches.filter((branch) => !branch.remote);

      case "remote":
        return branches.filter((branch) => branch.remote);

      default:
        return branches;
    }
  }

  async getStatus(): Promise<GitStatus> {
    const result = await exec("git status --porcelain=v2 --branch -z", {
      throwOnError: true,
    });

    return GitParser.parseStatus(result.stdout);
  }

  getFileIcon(file: GitChangedFile): string {
    return GitDisplay.getFileIcon(file);
  }

  getFileStatus(file: GitChangedFile): string {
    return GitDisplay.getFileStatus(file);
  }

  getFileLabel(file: GitChangedFile): string {
    return GitDisplay.getFileLabel(file);
  }

  getFileHint(file: GitChangedFile): string {
    return GitDisplay.getFileHint(file);
  }

  getBranchLabel(branch: GitCurrentBranch): string {
    return GitDisplay.getBranchLabel(branch);
  }

  getBranchHint(branch: GitCurrentBranch): string {
    return GitDisplay.getBranchHint(branch);
  }
  getFileSelectOptions(files: GitChangedFile[]): Option<string>[] {
    return GitDisplay.getFileSelectOptions(files);
  }

  getStageableFiles(files: GitChangedFile[]): GitChangedFile[] {
    return GitStatusHelper.getStageableFiles(files);
  }
}

export const gitHelper = new GitParserController();
