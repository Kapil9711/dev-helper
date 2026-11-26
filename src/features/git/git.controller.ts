import chalk from "chalk";
import { output } from "../../shared/helpers/output/index.ts";
import { gitCommandService } from "./git.service.ts";

export type CommandOptions = {
  json?: boolean;
  force?: boolean;
  forceUnsafe?: boolean;
  newBranch?: boolean | string;
  staged?: boolean;
  limit?: number;
  hard?: boolean;
  soft?: boolean;
  head?: boolean;
  abort?: boolean;
  all?: boolean;
};

class GitCommandController {
  constructor() {
    this.gitInit = this.gitInit.bind(this);
    this.gitStatus = this.gitStatus.bind(this);
    this.gitAdd = this.gitAdd.bind(this);
    this.gitCommit = this.gitCommit.bind(this);
    this.gitPush = this.gitPush.bind(this);
    this.gitPull = this.gitPull.bind(this);
    this.gitCommitWithAdd = this.gitCommitWithAdd.bind(this);
    this.gitPushWithCommitAndAdd = this.gitPushWithCommitAndAdd.bind(this);
    this.gitPullWithCommitAndAdd = this.gitPullWithCommitAndAdd.bind(this);
    this.gitPushWithPullAndCommit = this.gitPushWithPullAndCommit.bind(this);
    this.gitCheckout = this.gitCheckout.bind(this);
    this.gitCheckoutWithCommitAndAdd =
      this.gitCheckoutWithCommitAndAdd.bind(this);
    this.gitBranch = this.gitBranch.bind(this);
    this.gitStash = this.gitStash.bind(this);
    this.gitMerge = this.gitMerge.bind(this);
    this.gitDiff = this.gitDiff.bind(this);
    this.gitLog = this.gitLog.bind(this);
    this.gitReset = this.gitReset.bind(this);
    this.gitTag = this.gitTag.bind(this);
    this.gitRebase = this.gitRebase.bind(this);
    this.gitRemote = this.gitRemote.bind(this);
    this.gitCherryPick = this.gitCherryPick.bind(this);
    this.gitClean = this.gitClean.bind(this);
    this.gitRestore = this.gitRestore.bind(this);
    this.gitShow = this.gitShow.bind(this);
    this.gitFetch = this.gitFetch.bind(this);
    this.gitDashboard = this.gitDashboard.bind(this);
  }

  async gitDashboard(options: { port?: string; open?: boolean }) {
    const { startGitDashboardServer } = await import(
      "./git.dashboard.server.ts"
    );
    const port = options.port ? Number(options.port) : 4318;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("Port must be an integer from 1 to 65535");
    }
    await startGitDashboardServer({
      port,
      open: options.open !== false,
    });
  }

  async gitInit(options: CommandOptions) {
    const result = await gitCommandService.gitInit();
    await output.autoPrint(result, options);
  }

  async gitStatus(options: CommandOptions) {
    const result = await gitCommandService.gitStatus();
    await output.autoPrint(result, options);
  }

  async gitAdd(files: string[] | undefined, options: CommandOptions) {
    // When called by Commander: argument [files...] is passed first, then options
    const filesArray = Array.isArray(files) && files.length > 0 ? files : undefined;
    const result = await gitCommandService.gitAdd(false, filesArray);
    await output.autoPrint(result, options);
  }

  async gitCommit(
    message: string,
    options: CommandOptions,
    isFetch: boolean = false,
  ) {
    if (!message) {
      message = "auto commit";
    }
    const result = await gitCommandService.gitCommit(message, isFetch);
    await output.autoPrint(result, options);
  }

  async gitPush(options: CommandOptions) {
    const force = options.force
      ? "safe"
      : options.forceUnsafe
        ? "unSafe"
        : undefined;
    const result = await gitCommandService.gitPush(force);
    await output.autoPrint(result, options);
  }

  async gitPull(branch: string | undefined, options: CommandOptions) {
    const result = await gitCommandService.gitPull(branch);
    await output.autoPrint(result, options);
  }

  async gitCheckout(branch: string | undefined, options: CommandOptions) {
    const result = await gitCommandService.gitCheckout(
      branch,
      Boolean(options.newBranch),
    );
    await output.autoPrint(result, options);
  }

  async gitBranch(branchName: string | undefined, options: CommandOptions) {
    const targetBranch =
      typeof options.newBranch === "string"
        ? options.newBranch
        : branchName;
    const result = await gitCommandService.gitBranch(targetBranch);
    await output.autoPrint(result, options);
  }

  async gitStash(options: CommandOptions) {
    const result = await gitCommandService.gitStash();
    await output.autoPrint(result, options);
  }

  async gitMerge(branch: string, options: CommandOptions) {
    const result = await gitCommandService.gitMerge(branch, !!options.abort);
    await output.autoPrint(result, options);
  }

  async gitDiff(options: CommandOptions) {
    const result = await gitCommandService.gitDiff(!!options.staged);
    if (result.success) {
      await output.info(result.stdout, 0);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitLog(options: CommandOptions) {
    const result = await gitCommandService.gitLog(options.limit ?? 10);
    if (result.success) {
      await output.info(result.stdout, 0);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitReset(options: CommandOptions) {
    const result = await gitCommandService.gitReset(
      !!options.hard,
      !!options.soft,
      !!options.head,
    );
    await output.autoPrint(result, options);
  }

  async gitTag(options: CommandOptions) {
    const result = await gitCommandService.gitTag();
    if (result.success) {
      await output.info(result.stdout, 0);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitRebase(branch: string, options: CommandOptions) {
    const result = await gitCommandService.gitRebase(branch, !!options.abort);
    await output.autoPrint(result, options);
  }

  async gitRemote(options: CommandOptions) {
    const result = await gitCommandService.gitRemote();
    if (result.success) {
      await output.info(result.stdout, 0);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitCherryPick(commit: string, options: CommandOptions) {
    const result = await gitCommandService.gitCherryPick(commit);
    await output.autoPrint(result, options);
  }

  async gitClean(options: CommandOptions) {
    const result = await gitCommandService.gitClean();
    await output.autoPrint(result, options);
  }

  async gitRestore(file: string, options: CommandOptions) {
    const result = await gitCommandService.gitRestore(file);
    await output.autoPrint(result, options);
  }

  async gitShow(commit: string, options: CommandOptions) {
    const result = await gitCommandService.gitShow(commit);
    if (result.success) {
      await output.info(result.stdout, 0);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitFetch(options: CommandOptions) {
    const result = await gitCommandService.gitFetch(!!options.all);
    await output.autoPrint(result, options);
  }

  // ─── Combined Controllers ───────────────────────────────────────────────────

  async gitCommitWithAdd(message: string, options: CommandOptions) {
    const addResult = await gitCommandService.gitAdd(true);
    await output.autoPrint(addResult, options);
    if (!addResult.success) return;

    await this.gitCommit(message, options, false);
  }

  async gitPushWithCommitAndAdd(message: string, options: CommandOptions) {
    const addResult = await gitCommandService.gitAdd(true);
    await output.autoPrint(addResult, options);
    if (!addResult.success) return;

    const commitMsg = message || "auto commit";
    const commitResult = await gitCommandService.gitCommit(commitMsg, false);
    await output.autoPrint(commitResult, options);
    if (!commitResult.success) return;

    return this.gitPush(options);
  }

  async gitPullWithCommitAndAdd(
    arg1: string | undefined,
    arg2: string | undefined,
    options: CommandOptions,
  ) {
    const addResult = await gitCommandService.gitAdd(true);
    await output.autoPrint(addResult, options);
    if (!addResult.success) return;

    let branch: string | undefined;
    let message = "auto commit";

    if (arg1 && arg2) {
      if (arg1.includes(" ") || (!arg2.includes(" ") && arg2)) {
        message = arg1;
        branch = arg2;
      } else {
        branch = arg1;
        message = arg2;
      }
    } else if (arg1) {
      if (arg1.includes(" ")) {
        message = arg1;
      } else {
        branch = arg1;
      }
    }

    const commitResult = await gitCommandService.gitCommit(message, false);
    await output.autoPrint(commitResult, options);
    if (!commitResult.success) return;

    return this.gitPull(branch, options);
  }

  async gitPushWithPullAndCommit(
    arg1: string | undefined,
    arg2: string | undefined,
    options: CommandOptions,
  ) {
    let message = "auto commit";
    let inputBranch: string | undefined;

    if (arg1 && arg2) {
      if (arg1.includes(" ")) {
        message = arg1;
        inputBranch = arg2;
      } else {
        inputBranch = arg1;
        message = arg2;
      }
    } else if (arg1) {
      if (arg1.includes(" ")) {
        message = arg1;
      } else {
        inputBranch = arg1;
      }
    }

    await output.info(chalk.blueBright("4 Steps Process"), 0);

    await output.info(chalk.blueBright("1/4 Step (staging files...)"), 0);
    const addResult = await gitCommandService.gitAdd(true);
    await output.autoPrint(addResult, options);
    if (!addResult.success) return;

    await output.info(chalk.blueBright("2/4 Step (committing staged files)"), 0);
    const commitResult = await gitCommandService.gitCommit(message, false);
    await output.autoPrint(commitResult, options);
    if (!commitResult.success) return;

    await output.info(
      chalk.blueBright("3/4 Step (pulling from remote branch)"),
      0,
    );
    const pullResult = await gitCommandService.gitPull(inputBranch);
    await output.autoPrint(pullResult, options);
    if (!pullResult.success) return;

    await output.info(chalk.blueBright("4/4 Step (pushing to remote branch)"), 0);
    return this.gitPush(options);
  }

  async gitCheckoutWithCommitAndAdd(
    arg1: string | undefined,
    arg2: string | undefined,
    options: CommandOptions,
  ) {
    const addResult = await gitCommandService.gitAdd(true);
    await output.autoPrint(addResult, options);
    if (!addResult.success) return;

    let branch = "";
    let message = "auto commit";

    if (arg1 && arg2) {
      if (arg1.includes(" ") && !arg2.includes(" ")) {
        message = arg1;
        branch = arg2;
      } else {
        branch = arg1;
        message = arg2;
      }
    } else if (arg1) {
      branch = arg1;
    }

    const commitResult = await gitCommandService.gitCommit(message, false);
    await output.autoPrint(commitResult, options);
    if (!commitResult.success) return;

    return this.gitCheckout(branch, options);
  }
}

export const gitCommandController = new GitCommandController();
