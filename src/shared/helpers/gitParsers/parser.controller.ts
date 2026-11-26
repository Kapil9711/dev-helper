import { Option } from "@clack/prompts";
import { exec, ExecResult } from "../shell/exec.ts";
import {
  GitDisplay,
  GitParser,
  GitStatusHelper,
  GitSummaryBuilder,
} from "./parser.services.ts";
import {
  GitBranch,
  GitChangedFile,
  GitCurrentBranch,
  GitFileKind,
  GitStatus,
} from "./parser.types.ts";
import { prompt } from "../prompt/prompt.ts";

export class GitParserController {
  private lastFetchAt = 0;
  private readonly FETCH_TTL = 20000;
  async isRepository(): Promise<boolean> {
    const result = await exec("git rev-parse --is-inside-work-tree");

    return result.success && result.stdout === "true";
  }

  async getRepositoryRoot(): Promise<string> {
    const result = await exec("git rev-parse --show-toplevel");

    return result.success ? result.stdout : process.cwd();
  }

  async getCurrentBranch(): Promise<string> {
    const result = await exec("git branch --show-current");

    return result.success ? result.stdout : "";
  }

  async getCurrentCommit(): Promise<string> {
    const result = await exec("git rev-parse HEAD");

    return result.success ? result.stdout : "";
  }

  async getRemotes(): Promise<string[]> {
    const result = await exec("git remote");

    if (!result.success || !result.stdout) return [];

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
        timeout: 15000,
      },
    );

    return result.success && result.stdout.trim() !== "";
  }
  async ensureUpstream(
    branch: string,
    remote = "origin",
    timeoutMs = 15000,
  ): Promise<ExecResult> {
    const successResult: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: true,
      command: "",
    };

    const remoteBranch = `${remote}/${branch}`;

    // Fast-path: try setting upstream directly without network call
    const directUpstream = await exec(
      `git branch --set-upstream-to=${remoteBranch}`,
      { timeout: 5000 },
    );

    if (directUpstream.success) {
      return successResult;
    }

    const remoteBranchExists = await this.remoteBranchExists(branch, remote);

    if (!remoteBranchExists) {
      return {
        ...successResult,
        success: false,
        stderr: `Remote branch '${remoteBranch}' does not exist.`,
      };
    }

    // Make sure the remote tracking ref exists locally.
    const fetchResult = await exec(`git fetch ${remote} ${branch}`, {
      timeout: timeoutMs,
    });

    if (!fetchResult.success) {
      return fetchResult;
    }

    const upstreamResult = await exec(
      `git branch --set-upstream-to=${remoteBranch}`,
      { timeout: timeoutMs },
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

    const branches: GitBranch[] = result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [head, shortName, fullRef] = line.split("|");

        return {
          name: shortName,
          current: head === "*",
          remote: fullRef.startsWith("refs/remotes"),
          fullRef,
        };
      })
      // Ignore refs like origin/HEAD -> origin/main
      .filter((branch) => !branch.fullRef.endsWith("/HEAD"))
      .map(({ fullRef, ...branch }) => branch)
      .sort((a, b) => {
        // Current branch first
        if (a.current) return -1;
        if (b.current) return 1;

        // Local branches before remote branches
        if (a.remote !== b.remote) {
          return a.remote ? 1 : -1;
        }

        // Alphabetical
        return a.name.localeCompare(b.name);
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

  async getStatus(isFetch: boolean = false): Promise<GitStatus> {
    if (isFetch) {
      const now = Date.now();
      if (now - this.lastFetchAt > this.FETCH_TTL) {
        const result = await exec("git fetch", { timeout: 15000 });
        if (result.success) this.lastFetchAt = now;
      }
    }

    const result = await exec("git status --porcelain=v2 --branch -z");

    if (!result.success || !result.stdout) {
      return {
        currentBranch: {
          current: "",
          detached: false,
          ahead: 0,
          behind: 0,
        },
        files: [],
        summary: GitSummaryBuilder.build([]),
      };
    }

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
