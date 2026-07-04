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
      result.stderr = "Not a git repository";
      return result;
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;

    if (!currentBranch) {
      result.stderr = "Unable to get current branch";
      return result;
    }

    const stageableFiles = gitHelper.getStageableFiles(status.files);

    if (stageableFiles.length === 0) {
      result.stderr = "Working tree is clean.";
      return result;
    }

    const files = await prompt.multiselect({
      message: "Select file to stage",
      options: gitHelper.getFileSelectOptions(stageableFiles),
      initialValues: ["."],
    });

    if (files?.length == 0) {
      result.stderr = "Please select valid option";
      return result;
    }

    const selectAll = files?.includes(".");

    const confirmed = await prompt.confirm({
      message: selectAll
        ? "Stage all changes?"
        : `Stage "${files.join(", ")}"?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git add ${files.join(" ")}`);
    const target = selectAll ? "all changes" : files?.join(", ");

    if (result.success) {
      result.stdout = `${target} staged successfully.`;
      return result;
    }
    return result;
  }

  async gitCommit(message: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = `git commit -m '${message}'`;

    let result = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: command,
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;
    const stageableFiles = gitHelper.getStageableFiles(status.files);

    if (status.summary.staged == 0) {
      const msg = stageableFiles?.length
        ? `
      No changes to commit,

      Add files to stagging
      ${stageableFiles?.map((item) => item?.path)?.join(", ")}
      `
        : "no changes to commit";
      result.stdout = msg;
      result.success = true;
      return result;
    }

    output.json(status);

    if (!currentBranch) {
      result.stderr = "Unable to get current branch";
      return result;
    }

    return await exec(command);
  }
}

export const gitCommandService = new GitCommandServices();
