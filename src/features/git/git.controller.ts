import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import { gitCommandService } from "./git.services.ts";

export type CommandOptions = {
  json?: boolean;
  force?: boolean;
};

class GitCommandController {
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
    const result = await gitCommandService.gitPush(options.force);
    output.autoPrint(result, options);
  }
}

export const gitCommandController = new GitCommandController();
