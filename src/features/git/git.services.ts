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

    output.currentBranch(currentBranch);

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

    if (!currentBranch) {
      result.stderr = "Unable to get current branch";
      return result;
    }

    return await exec(command);
  }

  async gitPush(force?: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = `git push`;

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

    const remotes = await gitHelper.getRemotes();
    const remote = remotes?.[0];

    if (!remote) {
      result.stderr = "Remote url not exist";
      return result;
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;
    output.currentBranch(currentBranch);

    if (!currentBranch) {
      result.stderr = "Unable to get current branch";
      return result;
    }

    if (currentBranch.detached) {
      result.stderr = "Can not push in detached mode";
      return result;
    }

    // if upstream exist then directly push it
    if (currentBranch.upstream) {
      output.info(`Upstream for '${currentBranch.current}' exist`);
      result = await exec("git push");
      if (result.success) {
        output.info(`Pushed ${currentBranch.current} sucessfully`);
      }
      return result;
    }

    let remoteBranchExist = await gitHelper.remoteBranchExists(
      currentBranch.current,
      remote,
    );

    if (remoteBranchExist) {
      const remoteBranch = `${remote}/${currentBranch.current}`;
      output.info(`Upstream for ${currentBranch.current} not exist`);
      output.info(
        `Creating Upstream for ${currentBranch.current} to ${remoteBranch}`,
      );
      const upstreamResult = await exec(
        `git branch --set-upstream-to="${remoteBranch}"`,
      );
      if (!upstreamResult.success) {
        output.info(`Upstream for ${currentBranch.current} failed`);
        return upstreamResult;
      }
      output.info(`Upstream created`);
      output.info("Pushing to remote...");
      return await exec("git push");
    }

    output.info(`Remote branch for ${currentBranch.current} not exit`);
    output.info(`Creating remote branch and setting upstream`);

    result = await exec(
      `git push --set-upstream ${remote} ${currentBranch.current}`,
    );

    if (result.success) {
      output.info(`done...`);
    }
    return result;
  }
}

export const gitCommandService = new GitCommandServices();
