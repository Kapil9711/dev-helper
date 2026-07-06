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

  async gitAdd(auto: boolean = false): Promise<ExecResult> {
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
      result.stdout = "Working tree is clean.";
      result.success = true;
      return result;
    }

    let files: string[] = [];

    // if not auto ask for selection
    if (!auto) {
      files = await prompt.multiselect({
        message: "Select file to stage",
        options: gitHelper.getFileSelectOptions(stageableFiles),
        initialValues: ["."],
      });
      if (files?.length == 0) {
        result.stderr = "Please select valid option";
        return result;
      }
    } else {
      files = ["."];
    }

    const selectAll = files?.includes(".");

    // if not auto ask for confirmation
    if (!auto) {
      const confirmed = await prompt.confirm({
        message: selectAll
          ? "Stage all changes?"
          : `Stage "${files.join(", ")}"?`,
      });

      if (!confirmed) {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }
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

    await output.currentBranch(currentBranch);

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

    result = await exec(command);

    return result;
  }

  async gitPush(force: "safe" | "unSafe" | undefined): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = (cmd: string) => {
      if (force == "safe") {
        return `git push ${cmd} '--force-with-lease'`;
      } else if (force == "unSafe") {
        return `git push ${cmd} '--force'`;
      } else {
        return `git push ${cmd}`;
      }
    };

    let result = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: command(" "),
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
      await output.info(`Upstream for '${currentBranch.current}' exist`);
      return await exec(command(" "));
    }

    let remoteBranchExist = await gitHelper.remoteBranchExists(
      currentBranch.current,
      remote,
    );

    if (remoteBranchExist) {
      const remoteBranch = `${remote}/${currentBranch.current}`;
      await output.info(`Upstream for ${currentBranch.current} not exist`);
      await output.info(
        `Creating Upstream for ${currentBranch.current} to ${remoteBranch}`,
      );
      const upstreamResult = await exec(
        `git branch --set-upstream-to="${remoteBranch}"`,
      );
      if (!upstreamResult.success) {
        await output.info(`Upstream for ${currentBranch.current} failed`);
        return upstreamResult;
      }
      await output.info(`Upstream created`);
      await output.info("Pushing to remote...");
      return await exec(command(" "));
    }

    await output.info(`Remote branch for ${currentBranch.current} not exit`);
    await output.info(`Creating remote branch and setting upstream`);

    result = await exec(
      `git push --set-upstream ${remote} ${currentBranch.current}`,
    );

    if (result.success) {
      await output.info(`done...`);
    }
    return result;
  }

  async gitPull(inputBranch: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = "git pull";

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

    await output.currentBranch(currentBranch);

    if (!status.summary.isClean) {
      result.stderr = "Please commit local chages before pull";
      return result;
    }

    if (!currentBranch) {
      result.stderr = "Unable to get current branch";
      return result;
    }

    if (currentBranch.detached) {
      result.stderr = "Can not pull in detached mode";
      return result;
    }

    // if input branch is available then use it and return
    if (inputBranch) {
      await output.info("Pulling from remote...");
      return await exec(`${command} '${inputBranch}'`);
    }

    // if upstream exist then directly pull it
    if (currentBranch.upstream) {
      await output.info(`Upstream for '${currentBranch.current}' exist`);
      return await exec(command);
    }

    let remoteBranchExist = await gitHelper.remoteBranchExists(
      currentBranch.current,
      remote,
    );

    if (!remoteBranchExist) {
      await output.info(`Remote branch for ${currentBranch.current} not exit`);
      result.stderr = "unable to pull remote branch do not exist";
      return result;
    }

    const remoteBranch = `${remote}/${currentBranch.current}`;
    await output.info(`Upstream for ${currentBranch.current} not exist`);
    await output.info(
      `Creating Upstream for ${currentBranch.current} to ${remoteBranch}`,
    );
    const upstreamResult = await exec(
      `git branch --set-upstream-to="${remoteBranch}"`,
    );
    if (!upstreamResult.success) {
      await output.info(`Upstream for ${currentBranch.current} failed`);
      return upstreamResult;
    }
    await output.info(`Upstream created`);
    await output.info("Pulling from remote...");
    return await exec(command);
  }

  // small services
}

export const gitCommandService = new GitCommandServices();
