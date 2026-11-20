import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import { prompt } from "../../shared/helpers/prompt/prompt.ts";
import { exec, ExecResult } from "../../shared/helpers/shell/exec.ts";
import Enquirer from "enquirer";

const enquirer = new Enquirer();

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

  async gitCommit(
    message: string,
    isFetch: boolean = false,
  ): Promise<ExecResult> {
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

    const status = await gitHelper.getStatus(isFetch);
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
      const trimmed = cmd.trim();
      const middle = trimmed ? ` ${trimmed} ` : " ";
      if (force == "safe") {
        return `git push${middle}'--force-with-lease'`;
      } else if (force == "unSafe") {
        return `git push${middle}'--force'`;
      } else {
        return `git push${trimmed ? ` ${trimmed}` : ""}`;
      }
    };

    let result = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: command(""),
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
      return await exec(command(""), { timeout: 60000 });
    }
    const remoteBranch = `${remote}/${currentBranch.current}`;
    output.info(`Upstream for ${currentBranch.current} not exist`);
    output.info(
      `Creating Upstream for ${currentBranch.current} to ${remoteBranch} `,
    );
    output.info("Pushing to remote...");
    return await exec(
      `git push --set-upstream '${remote}' '${currentBranch.current}'`,
      { timeout: 60000 },
    );
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

    const status = await gitHelper.getStatus(true);
    const currentBranch = status.currentBranch;

    await output.currentBranch(currentBranch);

    if (status.summary.hasStagedChanges || status.summary.hasUnstagedChanges) {
      result.stderr = "Please commit or stash local changes before pulling";
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
      await output.info(`Pulling from ${inputBranch} remote...`);
      return await exec(`${command} '${remote}' '${inputBranch}'`, {
        timeout: 60000,
      });
    }

    // if upstream exist then directly pull it
    if (currentBranch.upstream) {
      await output.info(`Upstream for '${currentBranch.current}' exist`);
      return await exec(command, { timeout: 60000 });
    }

    result = await gitHelper.ensureUpstream(
      currentBranch.current,
      remote,
      60000,
    );

    if (!result.success) {
      return result;
    }

    return await exec("git pull", { timeout: 60000 });
  }

  async gitCheckout(
    inputBranch: string,
    newBranch: boolean,
  ): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = "git checkout";

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

    // if checkout with create new branch return early
    if (newBranch) {
      return await exec(`${command} -b '${inputBranch}'`);
    }
    // if checkout to existing branch return early
    if (inputBranch) {
      return await exec(`${command} '${inputBranch}'`);
    }

    const status = await gitHelper.getStatus();

    if (!status.summary.isClean) {
      result.stderr = `
      Local changes are present
      commit local changes to continue
      abort checkout
       `;
      return result;
    }

    const branchList = await gitHelper.getBranches("all");
    const localBranchNames = branchList
      .filter((branch) => !branch.remote)
      .map((branch) => branch.name);
    const branchNames = branchList.map((branch) => branch.name);

    const { branch }: any = await enquirer.prompt({
      type: "autocomplete",
      name: "branch",
      message: "Select branch",
      choices: ["create-new-branch", ...branchNames],
    });

    if (!branch) {
      result.stderr = "select a valid branch";
      return result;
    }

    const selectedBranch = branch;

    const confirmed = await prompt.confirm({
      message: `confirm selection ${selectedBranch}`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    const remotes = await gitHelper.getRemotes();
    const remote = remotes?.[0];

    // if remote branch selected
    if (selectedBranch !== "create-new-branch" && selectedBranch?.includes(remote + "/")) {
      const localBranch = selectedBranch.replace(`${remote}/`, "");
      if (localBranchNames?.includes(localBranch)) {
        await output.info("local branch exist checkout");
        return await exec(`${command} '${localBranch}'`);
      }
      await output.info("local branch  not exist");
      await output.info("creating local branch and start tracking");
      return await exec(`git checkout --track ${branch}`);
    }
    // if local branch selected direclty checkout
    if (selectedBranch != "create-new-branch") {
      return exec(`${command} '${selectedBranch}'`);
    }

    // if create new branch selected

    const userInput = await this.promptForNewBranch();

    if (userInput.toLowerCase() == "exit") {
      result.stdout = "Operation is canceled, exit...";
      result.success = true;
      return result;
    }

    return await exec(`${command} -b '${userInput}'`);
  }

  async gitBranch(): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = "git branch";

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

    const branchList = await gitHelper.getBranches("all");
    const branchNames = branchList.map((branch) => branch.name);

    for (let name of branchNames) {
      const isCurrent = status.currentBranch.current == name;
      await output.info(`${name} ${isCurrent ? " *" : ""}`, 8);
    }

    result.success = true;
    result.stdout = "Branch listed successfully";

    return result;
  }

  // ─── New Commands ───────────────────────────────────────────────────────────

  async gitStash(): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git stash",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const action = await prompt.select({
      message: "Stash action",
      options: [
        { value: "push", label: "push" },
        { value: "list", label: "list" },
        { value: "pop", label: "pop" },
        { value: "apply", label: "apply" },
        { value: "drop", label: "drop" },
      ],
    });

    if (!action) {
      result.stderr = "No action selected";
      return result;
    }

    if (action === "push") {
      const message = await prompt.input({
        message: "Stash message (optional, press enter to skip)",
        placeholder: "WIP: my changes",
      });
      const cmd = message?.trim()
        ? `git stash push -m '${message.trim()}'`
        : "git stash push";
      result = await exec(cmd, { timeout: 30000 });
      return result;
    }

    if (action === "list") {
      result = await exec("git stash list", { timeout: 30000 });
      return result;
    }

    // pop / apply / drop — need to pick a stash
    const listResult = await exec("git stash list", { timeout: 30000 });
    if (!listResult.success) return listResult;

    const stashLines = listResult.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (stashLines.length === 0) {
      result.stdout = "No stashes found.";
      result.success = true;
      return result;
    }

    const stashChoices = stashLines.map((line) => {
      // e.g. "stash@{0}: WIP on main: abc1234 message"
      const ref = line.split(":")[0].trim();
      return { name: line, value: ref };
    });

    const { stash }: any = await enquirer.prompt({
      type: "autocomplete",
      name: "stash",
      message: `Select stash to ${action}`,
      choices: stashChoices.map((s) => s.name),
    });

    if (!stash) {
      result.stderr = "No stash selected";
      return result;
    }

    // Resolve the ref from the displayed name
    const matched = stashChoices.find((s) => s.name === stash);
    const ref = matched ? matched.value : stash.split(":")[0].trim();

    const cmd = `git stash ${action} '${ref}'`;
    result = await exec(cmd, { timeout: 30000 });
    return result;
  }

  async gitMerge(inputBranch: string, abort: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git merge",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    if (abort) {
      result = await exec("git merge --abort", { timeout: 30000 });
      return result;
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;
    await output.currentBranch(currentBranch);

    let targetBranch = inputBranch;

    if (!targetBranch) {
      const branchList = await gitHelper.getBranches("local");
      const otherBranches = branchList
        .filter((b) => b.name !== currentBranch.current)
        .map((b) => b.name);

      if (otherBranches.length === 0) {
        result.stderr = "No other local branches available to merge";
        return result;
      }

      const { branch }: any = await enquirer.prompt({
        type: "autocomplete",
        name: "branch",
        message: "Select branch to merge into current",
        choices: otherBranches,
      });

      if (!branch) {
        result.stderr = "No branch selected";
        return result;
      }

      targetBranch = branch;
    }

    const confirmed = await prompt.confirm({
      message: `Merge '${targetBranch}' into '${currentBranch.current}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git merge '${targetBranch}'`, { timeout: 60000 });
    return result;
  }

  async gitDiff(staged: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git diff",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const cmd = staged ? "git diff --staged" : "git diff";
    result = await exec(cmd, { timeout: 30000 });
    return result;
  }

  async gitLog(limit: number): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git log",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const n = limit && limit > 0 ? limit : 10;
    const cmd = `git log --oneline --graph --decorate -n ${n}`;
    result = await exec(cmd, { timeout: 30000 });
    return result;
  }

  async gitReset(hard: boolean, soft: boolean, head: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git reset",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    // --head: discard all unstaged changes
    if (head) {
      result = await exec("git checkout -- .", { timeout: 30000 });
      return result;
    }

    let mode: "soft" | "hard";

    if (hard) {
      mode = "hard";
    } else if (soft) {
      mode = "soft";
    } else {
      // prompt to choose
      const chosen = await prompt.select({
        message: "Reset mode",
        options: [
          { value: "soft", label: "soft — keep changes staged" },
          { value: "hard", label: "hard — discard all changes" },
        ],
      });
      mode = chosen as "soft" | "hard";
    }

    if (mode === "hard") {
      const confirmed = await prompt.confirm({
        message:
          "⚠️  Hard reset will permanently discard all uncommitted changes. Continue?",
      });
      if (!confirmed) {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }
    }

    const cmd = mode === "hard"
      ? "git reset --hard HEAD~1"
      : "git reset --soft HEAD~1";
    result = await exec(cmd, { timeout: 30000 });
    return result;
  }

  async gitTag(): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git tag",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const action = await prompt.select({
      message: "Tag action",
      options: [
        { value: "list", label: "list" },
        { value: "create", label: "create" },
        { value: "delete", label: "delete" },
      ],
    });

    if (!action) {
      result.stderr = "No action selected";
      return result;
    }

    if (action === "list") {
      result = await exec("git tag -l", { timeout: 30000 });
      return result;
    }

    if (action === "create") {
      const tagName = await prompt.input({
        message: "Tag name",
        placeholder: "v1.0.0",
        validate(value) {
          if (!value?.trim()) return "Tag name is required.";
          return undefined;
        },
      });

      const tagMessage = await prompt.input({
        message: "Tag message (optional, press enter to skip)",
        placeholder: "Release v1.0.0",
      });

      let cmd: string;
      if (tagMessage?.trim()) {
        cmd = `git tag -a '${tagName.trim()}' -m '${tagMessage.trim()}'`;
      } else {
        cmd = `git tag '${tagName.trim()}'`;
      }

      result = await exec(cmd, { timeout: 30000 });
      return result;
    }

    // delete
    const listResult = await exec("git tag -l", { timeout: 30000 });
    if (!listResult.success) return listResult;

    const tags = listResult.stdout
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tags.length === 0) {
      result.stdout = "No tags found.";
      result.success = true;
      return result;
    }

    const { tag }: any = await enquirer.prompt({
      type: "autocomplete",
      name: "tag",
      message: "Select tag to delete",
      choices: tags,
    });

    if (!tag) {
      result.stderr = "No tag selected";
      return result;
    }

    const confirmed = await prompt.confirm({
      message: `Delete tag '${tag}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git tag -d '${tag}'`, { timeout: 30000 });
    return result;
  }

  async gitRebase(inputBranch: string, abort: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git rebase",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    if (abort) {
      result = await exec("git rebase --abort", { timeout: 30000 });
      return result;
    }

    const status = await gitHelper.getStatus();
    const currentBranch = status.currentBranch;
    await output.currentBranch(currentBranch);

    let targetBranch = inputBranch;

    if (!targetBranch) {
      const branchList = await gitHelper.getBranches("local");
      const otherBranches = branchList
        .filter((b) => b.name !== currentBranch.current)
        .map((b) => b.name);

      if (otherBranches.length === 0) {
        result.stderr = "No other local branches available to rebase onto";
        return result;
      }

      const { branch }: any = await enquirer.prompt({
        type: "autocomplete",
        name: "branch",
        message: "Select branch to rebase onto",
        choices: otherBranches,
      });

      if (!branch) {
        result.stderr = "No branch selected";
        return result;
      }

      targetBranch = branch;
    }

    const confirmed = await prompt.confirm({
      message: `Rebase '${currentBranch.current}' onto '${targetBranch}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git rebase '${targetBranch}'`, { timeout: 60000 });
    return result;
  }

  async gitRemote(): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git remote",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const action = await prompt.select({
      message: "Remote action",
      options: [
        { value: "list", label: "list" },
        { value: "add", label: "add" },
        { value: "remove", label: "remove" },
      ],
    });

    if (!action) {
      result.stderr = "No action selected";
      return result;
    }

    if (action === "list") {
      result = await exec("git remote -v", { timeout: 30000 });
      return result;
    }

    if (action === "add") {
      const remoteName = await prompt.input({
        message: "Remote name",
        placeholder: "origin",
        validate(value) {
          if (!value?.trim()) return "Remote name is required.";
          return undefined;
        },
      });

      const remoteUrl = await prompt.input({
        message: "Remote URL",
        placeholder: "https://github.com/user/repo.git",
        validate(value) {
          if (!value?.trim()) return "Remote URL is required.";
          return undefined;
        },
      });

      result = await exec(
        `git remote add '${remoteName.trim()}' '${remoteUrl.trim()}'`,
        { timeout: 30000 },
      );
      return result;
    }

    // remove
    const remotes = await gitHelper.getRemotes();

    if (remotes.length === 0) {
      result.stdout = "No remotes configured.";
      result.success = true;
      return result;
    }

    const { remote }: any = await enquirer.prompt({
      type: "autocomplete",
      name: "remote",
      message: "Select remote to remove",
      choices: remotes,
    });

    if (!remote) {
      result.stderr = "No remote selected";
      return result;
    }

    const confirmed = await prompt.confirm({
      message: `Remove remote '${remote}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git remote remove '${remote}'`, { timeout: 30000 });
    return result;
  }

  // ─── 5 Additional Commands ───────────────────────────────────────────────────

  async gitCherryPick(inputCommit: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git cherry-pick",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    let commit = inputCommit?.trim();

    if (!commit) {
      // Show recent commits across all branches for the user to pick from
      const logResult = await exec(
        "git log --all --oneline --decorate -n 50",
        { timeout: 30000 },
      );

      if (!logResult.success || !logResult.stdout) {
        result.stderr = "Could not retrieve commit history";
        return result;
      }

      const commits = logResult.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const { selected }: any = await enquirer.prompt({
        type: "autocomplete",
        name: "selected",
        message: "Select commit to cherry-pick",
        choices: commits,
      });

      if (!selected) {
        result.stderr = "No commit selected";
        return result;
      }

      // Extract the short hash — first word
      commit = selected.split(" ")[0];
    }

    const confirmed = await prompt.confirm({
      message: `Cherry-pick commit '${commit}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git cherry-pick '${commit}'`, { timeout: 60000 });
    return result;
  }

  async gitClean(): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git clean",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    // Show what would be removed first (dry-run)
    const dryRun = await exec("git clean -nfd", { timeout: 30000 });

    if (!dryRun.success) {
      return dryRun;
    }

    if (!dryRun.stdout) {
      result.stdout = "Nothing to clean — working tree already clean.";
      result.success = true;
      return result;
    }

    await output.info("The following files/directories would be removed:\n" + dryRun.stdout);

    const mode = await prompt.select({
      message: "Clean mode",
      options: [
        { value: "files", label: "Remove untracked files only (git clean -fd)" },
        { value: "all", label: "Remove untracked files + ignored files (git clean -fdx)" },
      ],
    });

    const confirmed = await prompt.confirm({
      message: "⚠️  This permanently deletes untracked files. Continue?",
      initialValue: false,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    const cmd = mode === "all" ? "git clean -fdx" : "git clean -fd";
    result = await exec(cmd, { timeout: 30000 });
    return result;
  }

  async gitRestore(inputFile: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git restore",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const status = await gitHelper.getStatus();

    // Collect files that have unstaged changes or are staged
    const restorableFiles = status.files.filter(
      (f) => f.workTreeStatus !== null || f.indexStatus !== null,
    );

    if (restorableFiles.length === 0) {
      result.stdout = "Nothing to restore — working tree is clean.";
      result.success = true;
      return result;
    }

    let targetFile = inputFile?.trim();

    if (!targetFile) {
      const fileOptions = [
        { label: "🌍 Restore all changes (.)", value: ".", hint: "git restore ." },
        ...restorableFiles.map((f) => ({
          label: gitHelper.getFileLabel(f),
          value: f.path,
          hint: gitHelper.getFileHint(f),
        })),
      ];

      const files = await prompt.multiselect({
        message: "Select files to restore (discard changes)",
        options: fileOptions,
        required: true,
      });

      if (!files || files.length === 0) {
        result.stderr = "No files selected";
        return result;
      }

      targetFile = files.includes(".") ? "." : files.map((f) => `'${f}'`).join(" ");
    } else {
      targetFile = `'${targetFile}'`;
    }

    const confirmed = await prompt.confirm({
      message: `⚠️  Discard changes in ${targetFile}? This cannot be undone.`,
      initialValue: false,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    result = await exec(`git restore ${targetFile}`, { timeout: 30000 });
    if (result.success) {
      result.stdout = `Changes in ${targetFile} discarded successfully.`;
    }
    return result;
  }

  async gitShow(inputCommit: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git show",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    let commit = inputCommit?.trim();

    if (!commit) {
      // Let user pick from recent log
      const logResult = await exec(
        "git log --oneline --decorate -n 50",
        { timeout: 30000 },
      );

      if (!logResult.success || !logResult.stdout) {
        result.stderr = "Could not retrieve commit history";
        return result;
      }

      const commits = logResult.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const { selected }: any = await enquirer.prompt({
        type: "autocomplete",
        name: "selected",
        message: "Select commit to inspect",
        choices: commits,
      });

      if (!selected) {
        result.stderr = "No commit selected";
        return result;
      }

      commit = selected.split(" ")[0];
    }

    result = await exec(`git show '${commit}'`, { timeout: 30000 });
    return result;
  }

  async gitFetch(all: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git fetch",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const remotes = await gitHelper.getRemotes();

    if (remotes.length === 0) {
      result.stderr = "No remotes configured";
      return result;
    }

    const cmd = all ? "git fetch --all --prune" : `git fetch '${remotes[0]}' --prune`;
    result = await exec(cmd, { timeout: 60000 });

    if (result.success && !result.stdout) {
      result.stdout = all
        ? "Fetched from all remotes successfully."
        : `Fetched from '${remotes[0]}' successfully.`;
    }
    return result;
  }

  // small helpers

  private async promptForNewBranch(): Promise<string> {
    return prompt.input({
      message: "Branch name",
      placeholder: "feature/login (Enter exit for cancel)",
      validate(value) {
        if (!value?.trim()) {
          return "Branch name is required.";
        }

        return undefined;
      },
    });
  }
}

export const gitCommandService = new GitCommandServices();
