import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
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

    this.gitCommitWithAdd = this.gitCommitWithAdd.bind(this);
    this.gitPushWithCommitAndAdd = this.gitPushWithCommitAndAdd.bind(this);
  }

  async gitInit(options: CommandOptions) {
    const result = await gitCommandService.gitInit();
    output.autoPrint(result, options);
  }

  async gitStatus(options: CommandOptions) {
    const result = await gitCommandService.gitStatus();

    output.autoPrint(result, options);
  }

  async gitAdd(options: CommandOptions) {
    const result = await gitCommandService.gitAdd();
    output.autoPrint(result, options);
  }

  async gitCommit(message: string, options: CommandOptions) {
    // validate message before commiting
    if (!message) {
      message = "auto commit";
    }
    const result = await gitCommandService.gitCommit(message);
    output.autoPrint(result, options);
  }

  async gitPush(options: CommandOptions) {
    const force = options.force
      ? "safe"
      : options.forceUnsafe
        ? "unSafe"
        : undefined;
    const result = await gitCommandService.gitPush(force);
    output.autoPrint(result, options);
  }

  // combined controllers

  async gitCommitWithAdd(message: string, options: CommandOptions) {
    let result = await gitCommandService.gitAdd(true);
    output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;

    await this.gitCommit(message, options);
  }

  async gitPushWithCommitAndAdd(message: string, options: CommandOptions) {
    let result = await gitCommandService.gitAdd(true);
    output.autoPrint(result, options);
    // if add fail return early
    if (!result.success) return;
    result = await gitCommandService.gitCommit(message);
    output.autoPrint(result, options);
    //if commit fail return early
    if (!result.success) return;

    return this.gitPush(options);
  }
}

export const gitCommandController = new GitCommandController();
