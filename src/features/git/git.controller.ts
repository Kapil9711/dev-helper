import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import {
  ProgressBar,
  StepProgress,
} from "../../shared/ui/stepProgress/index.ts";
import { gitCommandService } from "./git.services.ts";

export type CommandOptions = {
  json?: boolean;
  force?: boolean;
  forceUnsafe?: boolean;
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

  async gitCommit(message: string, options: CommandOptions) {
    // validate message before commiting
    if (!message) {
      message = "auto commit";
    }
    const result = await gitCommandService.gitCommit(message);
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

  async gitPull(options: CommandOptions) {
    const result = await gitCommandService.gitPull();
    await output.autoPrint(result, options);
  }

  // combined controllers

  async gitCommitWithAdd(message: string, options: CommandOptions) {
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    await this.gitCommit(message, options);
  }

  async gitPushWithCommitAndAdd(message: string, options: CommandOptions) {
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

    return this.gitPush(options);
  }

  async gitPullWithCommitAndAdd(message: string, options: CommandOptions) {
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

    return this.gitPull(options);
  }

  async gitPushWithPullAndCommit(message: string, options: CommandOptions) {
    await output.info("4 Steps Process");

    await output.info("1/4 Step");
    let result = await gitCommandService.gitAdd(true);
    await output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    if (!message) {
      message = "auto commit";
    }
    await output.info("2/4 Step");
    result = await gitCommandService.gitCommit(message);
    await output.autoPrint(result, options);
    //if commit fail return early
    if (!result.success) return;
    await output.info("3/4 Step");
    result = await gitCommandService.gitPull();
    await output.autoPrint(result, options);
    //if pull fail return early
    if (!result.success) return;
    await output.info("4/4 Step");
    return this.gitPush(options);
  }
}

export const gitCommandController = new GitCommandController();
