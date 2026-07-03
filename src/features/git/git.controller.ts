import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import { prompt } from "../../shared/helpers/prompt/prompt.ts";
import { exec } from "../../shared/helpers/shell/exec.ts";

class GitCommandController {
  async gitInit(options: { json: boolean }) {
    const result = await exec("git init");
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
    const result = await exec("git status");

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

    const stageableFiles = gitHelper.getStageableFiles(status.files);

    if (stageableFiles.length === 0) {
      return output.success({
        title: "git add",
        message: "Working tree is clean.",
      });
    }

    const files = await prompt.multiselect({
      message: "Select file to stage",
      options: gitHelper.getFileSelectOptions(stageableFiles),
      initialValues: ["."],
    });

    if (files?.length == 0) {
      return output.error({
        title: "git add",
        message: "Please select valid option",
      });
    }

    const selectAll = files?.includes(".");

    const confirmed = await prompt.confirm({
      message: selectAll
        ? "Stage all changes?"
        : `Stage "${files.join(", ")}"?`,
    });

    if (!confirmed) {
      return output.error({
        title: "git add",
        message: "Operation is canceled, exit...",
      });
    }

    let result = await exec(`git add ${files.join(" ")}`);

    const isPrintJson = options.json;

    // handling options
    if (isPrintJson) {
      return output.json(result);
    }

    const target = selectAll ? "all changes" : files?.join(", ");

    if (result.success) {
      output.success({
        title: "git add",
        message: `${target} staged successfully.`,
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
}

export const gitCommandController = new GitCommandController();
