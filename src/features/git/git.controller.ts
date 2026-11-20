import chalk from "chalk";
import { output } from "../../shared/helpers/output/index.ts";
import { gitCommandService } from "./git.service.ts";

export type CommandOptions = {
  json?: boolean;
  force?: boolean;
  forceUnsafe: boolean;
  newBranch: boolean;
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
  }

  async gitInit(options: CommandOptions) {
    const result = await gitCommandService.gitInit();
    await output.autoPrint(result, options);
  }

  async gitStatus(options: CommandOptions) {
    const result = await gitCommandService.gitStatus();

    await output.autoPrint(result, options);
  }

  async gitAdd(options: CommandOptions) {
    const result = await gitCommandService.gitAdd();
    await output.autoPrint(result, options);
  }

  async gitCommit(
    message: string,
    options: CommandOptions,
    isFetch: boolean = false,
  ) {
    // validate message before commiting
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

  async gitPull(branch: string, options: CommandOptions) {
    const result = await gitCommandService.gitPull(branch);
    await output.autoPrint(result, options);
  }

  async gitCheckout(branch: string, options: CommandOptions) {
    const result = await gitCommandService.gitCheckout(
      branch,
      options.newBranch,
    );
    await output.autoPrint(result, options);
  }

  async gitBranch(options: CommandOptions) {
    const result = await gitCommandService.gitBranch();
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
      await output.info(result.stdout);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitLog(options: CommandOptions) {
    const result = await gitCommandService.gitLog(options.limit ?? 10);
    if (result.success) {
      await output.info(result.stdout);
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
      await output.info(result.stdout);
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
      await output.info(result.stdout);
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
      await output.info(result.stdout);
    } else {
      await output.autoPrint(result, options);
    }
  }

  async gitFetch(options: CommandOptions) {
    const result = await gitCommandService.gitFetch(!!options.all);
    await output.autoPrint(result, options);
  }

  // combined controllers

  async gitCommitWithAdd(message: string, options: CommandOptions) {
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    await this.gitCommit(message, options, false);
  }

  async gitPushWithCommitAndAdd(message: string, options: CommandOptions) {
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    if (!message) {
      message = "auto commit";
    }
    result = await gitCommandService.gitCommit(message, true);
    await output.autoPrint(result, options);
    //if commit fail return early
    if (!result.success) return;

    return this.gitPush(options);
  }

  async gitPullWithCommitAndAdd(
    message: string,
    inputBranch: string,
    options: CommandOptions,
  ) {
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    if (!message) {
      message = "auto commit";
    }
    result = await gitCommandService.gitCommit(message, false);
    await output.autoPrint(result, options);
    //if commit fail return early
    if (!result.success) return;

    return this.gitPull(inputBranch, options);
  }

  async gitPushWithPullAndCommit(
    message: string,
    inputBranch: string,
    options: CommandOptions,
  ) {
    await output.info(chalk.blueBright("4 Steps Process"));
    console.log();

    await output.info(chalk.blueBright("1/4 Step (stagging files...)"));
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    if (!message) {
      message = "auto commit";
    }
    await output.info(chalk.blueBright("2/4 Step (commiting staged files)"));
    result = await gitCommandService.gitCommit(message, true);
    await output.autoPrint(result, options);
    //if commit fail return early
    if (!result.success) return;
    await output.info(
      chalk.blueBright("3/4 Step (pulling from remote branch)"),
    );
    result = await gitCommandService.gitPull(inputBranch);
    await output.autoPrint(result, options);
    //if pull fail return early
    if (!result.success) return;
    await output.info(chalk.blueBright("4/4 Step (pushing to remote branch)"));
    return this.gitPush(options);
  }

  async gitCheckoutWithCommitAndAdd(
    message: string,
    branch: string,
    options: CommandOptions,
  ) {
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    if (!message) {
      message = "auto commit";
    }
    result = await gitCommandService.gitCommit(message);
    await output.autoPrint(result, options);
    //if commit fail return early
    if (!result.success) return;

    return this.gitCheckout(branch, options);
  }
}

export const gitCommandController = new GitCommandController();
