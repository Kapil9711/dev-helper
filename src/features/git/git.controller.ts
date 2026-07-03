import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import { prompt } from "../../shared/helpers/prompt/prompt.ts";
import { exec } from "../../shared/helpers/shell/exec.ts";
import { gitCommandService } from "./git.services.ts";

class GitCommandController {
  async gitInit(options: { json: boolean }) {
    const result = await gitCommandService.gitInit();
    const isPrintJson = options.json;

    // handling options
    if (isPrintJson) {
      return output.json(result);
    }

    if (result.success) {
      output.success({
        title: result.command,
        message: result.stdout,
        duration: result.durationMs,
      });
    } else {
      output.error({
        title: result.command,
        message: result.stderr,
        duration: result.durationMs,
      });
    }
  }

  async gitStatus(options: { json: boolean }) {
    const result = await gitCommandService.gitStatus();

    const isPrintJson = options.json;

    // handling options
    if (isPrintJson) {
      return output.json(result);
    }

    if (result.success) {
      output.success({
        title: result.command,
        message: result.stdout,
        duration: result.durationMs,
      });
    } else {
      output.error({
        title: result.command,
        message: result.stderr,
        duration: result.durationMs,
      });
    }
  }

  async gitAdd(options: { json: boolean }) {
    const result = await gitCommandService.gitAdd();

    const isPrintJson = options.json;

    // handling options
    if (isPrintJson) {
      return output.json(result);
    }

    if (result.success) {
      output.success({
        title: result.command,
        message: result.stdout,
        duration: result.durationMs,
      });
    } else {
      output.error({
        title: result.command,
        message: result.stderr,
        duration: result.durationMs,
      });
    }
  }

  async gitCommit() {
    const isGitRepo = await gitHelper.isRepository();

    if (!isGitRepo) {
      return output.error({
        title: "git add",
        message: "Not a git repository",
      });
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;

    if (!currentBranch) {
      return output.error({
        title: "git add",
        message: "Unable to get current branch",
      });
    }
  }
}

export const gitCommandController = new GitCommandController();
