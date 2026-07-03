import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import { prompt } from "../../shared/helpers/prompt/prompt.ts";
import { exec, ExecResult } from "../../shared/helpers/shell/exec.ts";

class GitCommandServices {
  async gitInit() {
    return await exec("git init");
  }

  async gitStatus() {
    return await exec("git status");
  }

  async gitAdd(): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git add",
    };

    if (!isGitRepo) {
      result.stdout = "Not a git repository";
      return result;
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;

    if (!currentBranch) {
      result.stdout = "Unable to get current branch";
      return result;
    }

    const stageableFiles = gitHelper.getStageableFiles(status.files);

    if (stageableFiles.length === 0) {
      result.stdout = "Working tree is clean.";
      return result;
    }

    const files = await prompt.multiselect({
      message: "Select file to stage",
      options: gitHelper.getFileSelectOptions(stageableFiles),
      initialValues: ["."],
    });

    if (files?.length == 0) {
      result.stdout = "Please select valid option";
      return result;
    }

    const selectAll = files?.includes(".");

    const confirmed = await prompt.confirm({
      message: selectAll
        ? "Stage all changes?"
        : `Stage "${files.join(", ")}"?`,
    });

    if (!confirmed) {
      result.stdout = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git add ${files.join(" ")}`);
    const target = selectAll ? "all changes" : files?.join(", ");

    if (result.success) {
    }

    if (result.success) {
      result.stdout = `${target} staged successfully.`;
      return result;
    }
    return result;
  }
}

export const gitCommandService = new GitCommandServices();
