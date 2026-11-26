import { gitHelper } from "../../shared/helpers/gitParsers/parser.controller.ts";
import { output } from "../../shared/helpers/output/index.ts";
import { prompt } from "../../shared/helpers/prompt/prompt.ts";
import { exec, ExecResult, quoteShell } from "../../shared/helpers/shell/exec.ts";
import Enquirer from "enquirer";

const enquirer = new Enquirer();

class GitCommandServices {
  async gitInit(): Promise<ExecResult> {
    return await exec("git init");
  }

  async gitStatus(): Promise<ExecResult> {
    return await exec("git status");
  }

  async gitAdd(
    auto: boolean = false,
    filesInput?: string[],
  ): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
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

    // Direct files specified on CLI
    if (filesInput && filesInput.length > 0) {
      const targets = filesInput
        .map((f) => (f === "." ? "." : quoteShell(f)))
        .join(" ");
      result = await exec(`git add ${targets}`);
      if (result.success) {
        result.stdout = `${filesInput.join(", ")} staged successfully.`;
      }
      return result;
    }

    if (auto) {
      result = await exec("git add -A");
      if (result.success) {
        result.stdout = "all changes staged successfully.";
      }
      return result;
    }

    const status = await gitHelper.getStatus(false);
    const stageableFiles = gitHelper.getStageableFiles(status.files);

    if (stageableFiles.length === 0) {
      result.stdout = "Working tree is clean.";
      result.success = true;
      return result;
    }

    const files = await prompt.multiselect({
      message: "Select file to stage",
      options: gitHelper.getFileSelectOptions(stageableFiles),
      initialValues: ["."],
    });

    if (!files || files.length === 0) {
      result.stderr = "Please select a valid option";
      return result;
    }

    const selectAll = files.includes(".");
    const targets = selectAll
      ? "."
      : files.map((f) => quoteShell(f)).join(" ");

    result = await exec(`git add ${targets}`);
    if (result.success) {
      result.stdout = selectAll
        ? "all changes staged successfully."
        : `${files.join(", ")} staged successfully.`;
    }
    return result;
  }

  async gitCommit(
    message: string,
    isFetch: boolean = false,
  ): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const commitMsg = message?.trim() || "auto commit";
    const command = `git commit -m ${quoteShell(commitMsg)}`;

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command,
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    // Commits do not need to fetch from remote
    const status = await gitHelper.getStatus(isFetch);
    const currentBranch = status.currentBranch;
    const stageableFiles = gitHelper.getStageableFiles(status.files);

    await output.currentBranch(currentBranch);

    if (status.summary.staged === 0) {
      if (stageableFiles.length > 0) {
        result.stderr = `No changes staged for commit.\nStage files first with 'vh git add' or use 'vh git cwa' (commit with add).\nUnstaged files:\n${stageableFiles.map((item) => item.path).join(", ")}`;
        result.success = false;
        return result;
      }
      result.stdout = "Working tree clean, nothing to commit.";
      result.success = true;
      return result;
    }

    result = await exec(command);
    return result;
  }

  async gitPush(force: "safe" | "unSafe" | undefined): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const forceFlag =
      force === "safe"
        ? " --force-with-lease"
        : force === "unSafe"
          ? " --force"
          : "";

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: `git push${forceFlag}`,
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const remotes = await gitHelper.getRemotes();
    const remote = remotes?.[0];

    if (!remote) {
      result.stderr = "No remote repository configured";
      return result;
    }

    const status = await gitHelper.getStatus(false);
    const currentBranch = status.currentBranch;

    if (!currentBranch || !currentBranch.current) {
      if (currentBranch?.detached) {
        result.stderr = "Cannot push in detached HEAD mode";
      } else {
        result.stderr = "Unable to determine current branch";
      }
      return result;
    }

    // If upstream exists, push directly
    if (currentBranch.upstream) {
      await output.info(`Pushing '${currentBranch.current}' to upstream...`);
      return await exec(`git push${forceFlag}`, { timeout: 60000 });
    }

    // Upstream does not exist, set upstream and push with any force flags preserved
    const remoteBranch = `${remote}/${currentBranch.current}`;
    await output.info(
      `Upstream for '${currentBranch.current}' not set. Setting upstream to '${remoteBranch}' and pushing...`,
    );
    return await exec(
      `git push --set-upstream ${quoteShell(remote)} ${quoteShell(currentBranch.current)}${forceFlag}`,
      { timeout: 60000 },
    );
  }

  async gitPull(inputBranch?: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git pull",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const remotes = await gitHelper.getRemotes();
    const remote = remotes?.[0];

    if (!remote) {
      result.stderr = "No remote repository configured";
      return result;
    }

    // Pull already performs a fetch, do not do redundant fetch here
    const status = await gitHelper.getStatus(false);
    const currentBranch = status.currentBranch;

    await output.currentBranch(currentBranch);

    if (status.summary.hasStagedChanges || status.summary.hasUnstagedChanges) {
      result.stderr =
        "Please commit or stash local changes before pulling.";
      return result;
    }

    if (!currentBranch || !currentBranch.current) {
      if (currentBranch?.detached) {
        result.stderr = "Cannot pull in detached HEAD mode";
      } else {
        result.stderr = "Unable to determine current branch";
      }
      return result;
    }

    // If input branch is specified, pull from it
    if (inputBranch) {
      await output.info(`Pulling from ${remote} ${inputBranch}...`);
      return await exec(
        `git pull ${quoteShell(remote)} ${quoteShell(inputBranch)}`,
        { timeout: 60000 },
      );
    }

    // If upstream exists, pull directly
    if (currentBranch.upstream) {
      await output.info(`Pulling from upstream for '${currentBranch.current}'...`);
      return await exec("git pull", { timeout: 60000 });
    }

    // Try setting upstream if possible
    result = await gitHelper.ensureUpstream(
      currentBranch.current,
      remote,
      30000,
    );

    if (!result.success) {
      return result;
    }

    return await exec("git pull", { timeout: 60000 });
  }

  async gitCheckout(
    inputBranch?: string,
    newBranch?: boolean,
  ): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    const command = "git checkout";

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command,
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    // Checkout with new branch (-b)
    if (newBranch) {
      let targetBranch = inputBranch?.trim();
      if (!targetBranch) {
        targetBranch = await this.promptForNewBranch();
      }
      if (!targetBranch || targetBranch.toLowerCase() === "exit") {
        result.stdout = "Operation is canceled, exit...";
        result.success = true;
        return result;
      }
      return await exec(`${command} -b ${quoteShell(targetBranch)}`);
    }

    // Checkout to existing branch specified directly
    if (inputBranch?.trim()) {
      return await exec(`${command} ${quoteShell(inputBranch.trim())}`);
    }

    // Interactive branch picker
    const status = await gitHelper.getStatus(false);

    if (status.summary.hasStagedChanges || status.summary.hasUnstagedChanges) {
      result.stderr =
        "Local changes are present. Commit or stash local changes before checkout.";
      return result;
    }

    const branchList = await gitHelper.getBranches("all");
    const localBranchNames = branchList
      .filter((b) => !b.remote)
      .map((b) => b.name);
    const branchNames = branchList.map((b) => b.name);

    let branch = "";
    try {
      const answer: any = await enquirer.prompt({
        type: "autocomplete",
        name: "branch",
        message: "Select branch",
        choices: ["create-new-branch", ...branchNames],
      });
      branch = answer.branch;
    } catch {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    if (!branch) {
      result.stderr = "Select a valid branch";
      return result;
    }

    const confirmed = await prompt.confirm({
      message: `Confirm checkout to '${branch}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    const remotes = await gitHelper.getRemotes();
    const remote = remotes?.[0] || "origin";

    // If remote branch selected
    if (branch !== "create-new-branch" && branch.startsWith(`${remote}/`)) {
      const localBranch = branch.slice(remote.length + 1);
      if (localBranchNames.includes(localBranch)) {
        await output.info(`Local branch '${localBranch}' exists, checking out...`);
        return await exec(`${command} ${quoteShell(localBranch)}`);
      }
      await output.info(
        `Creating local branch '${localBranch}' tracking '${branch}'...`,
      );
      return await exec(`git checkout --track ${quoteShell(branch)}`);
    }

    // Existing local branch
    if (branch !== "create-new-branch") {
      return await exec(`${command} ${quoteShell(branch)}`);
    }

    // Create new branch selected interactively
    const userInput = await this.promptForNewBranch();
    if (!userInput || userInput.toLowerCase() === "exit") {
      result.stdout = "Operation is canceled, exit...";
      result.success = true;
      return result;
    }

    return await exec(`${command} -b ${quoteShell(userInput)}`);
  }

  async gitBranch(newBranchName?: string): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: "git branch",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    // Create branch if name provided
    if (newBranchName?.trim()) {
      return await exec(`git branch ${quoteShell(newBranchName.trim())}`);
    }

    const status = await gitHelper.getStatus(false);
    const branchList = await gitHelper.getBranches("all");
    const branchNames = branchList.map((branch) => branch.name);

    for (const name of branchNames) {
      const isCurrent = status.currentBranch.current === name;
      await output.info(`${name} ${isCurrent ? "*" : ""}`, 0);
    }

    result.success = true;
    result.stdout = "Branches listed successfully";
    return result;
  }

  // ─── Extended Commands ───────────────────────────────────────────────────────

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
        ? `git stash push -m ${quoteShell(message.trim())}`
        : "git stash push";
      return await exec(cmd, { timeout: 30000 });
    }

    if (action === "list") {
      return await exec("git stash list", { timeout: 30000 });
    }

    // pop / apply / drop — pick a stash
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
      const ref = line.split(":")[0].trim();
      return { name: line, value: ref };
    });

    let stash = "";
    try {
      const answer: any = await enquirer.prompt({
        type: "autocomplete",
        name: "stash",
        message: `Select stash to ${action}`,
        choices: stashChoices.map((s) => s.name),
      });
      stash = answer.stash;
    } catch {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    if (!stash) {
      result.stderr = "No stash selected";
      return result;
    }

    const matched = stashChoices.find((s) => s.name === stash);
    const ref = matched ? matched.value : stash.split(":")[0].trim();

    return await exec(`git stash ${action} ${quoteShell(ref)}`, {
      timeout: 30000,
    });
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
      return await exec("git merge --abort", { timeout: 30000 });
    }

    const status = await gitHelper.getStatus(false);
    const currentBranch = status.currentBranch;
    await output.currentBranch(currentBranch);

    let targetBranch = inputBranch?.trim();

    if (!targetBranch) {
      const branchList = await gitHelper.getBranches("local");
      const otherBranches = branchList
        .filter((b) => b.name !== currentBranch.current)
        .map((b) => b.name);

      if (otherBranches.length === 0) {
        result.stderr = "No other local branches available to merge";
        return result;
      }

      try {
        const answer: any = await enquirer.prompt({
          type: "autocomplete",
          name: "branch",
          message: "Select branch to merge into current",
          choices: otherBranches,
        });
        targetBranch = answer.branch;
      } catch {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }

      if (!targetBranch) {
        result.stderr = "No branch selected";
        return result;
      }
    }

    const confirmed = await prompt.confirm({
      message: `Merge '${targetBranch}' into '${currentBranch.current}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    return await exec(`git merge ${quoteShell(targetBranch)}`, {
      timeout: 60000,
    });
  }

  async gitDiff(staged: boolean): Promise<ExecResult> {
    const isGitRepo = await gitHelper.isRepository();

    let result: ExecResult = {
      stdout: "",
      stderr: "",
      durationMs: 0,
      success: false,
      command: staged ? "git diff --staged" : "git diff",
    };

    if (!isGitRepo) {
      result.stderr = "Not a git repository";
      return result;
    }

    const cmd = staged ? "git diff --staged" : "git diff";
    return await exec(cmd, { timeout: 30000 });
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
    return await exec(cmd, { timeout: 30000 });
  }

  async gitReset(
    hard: boolean,
    soft: boolean,
    head: boolean,
  ): Promise<ExecResult> {
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

    // Discard all unstaged changes
    if (head) {
      return await exec("git checkout -- .", { timeout: 30000 });
    }

    let mode: "soft" | "hard";

    if (hard) {
      mode = "hard";
    } else if (soft) {
      mode = "soft";
    } else {
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
          "⚠️  Hard reset will permanently discard uncommitted changes. Continue?",
        initialValue: false,
      });
      if (!confirmed) {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }
    }

    // Verify HEAD~1 exists before attempting reset
    const checkCommit = await exec("git rev-parse --verify HEAD~1");
    if (!checkCommit.success) {
      result.stderr =
        "Cannot reset: repository has only one commit (no previous commit to reset to).";
      return result;
    }

    const cmd =
      mode === "hard"
        ? "git reset --hard HEAD~1"
        : "git reset --soft HEAD~1";
    return await exec(cmd, { timeout: 30000 });
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
      return await exec("git tag -l", { timeout: 30000 });
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
        cmd = `git tag -a ${quoteShell(tagName.trim())} -m ${quoteShell(tagMessage.trim())}`;
      } else {
        cmd = `git tag ${quoteShell(tagName.trim())}`;
      }

      return await exec(cmd, { timeout: 30000 });
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

    let tag = "";
    try {
      const answer: any = await enquirer.prompt({
        type: "autocomplete",
        name: "tag",
        message: "Select tag to delete",
        choices: tags,
      });
      tag = answer.tag;
    } catch {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

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

    return await exec(`git tag -d ${quoteShell(tag)}`, { timeout: 30000 });
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
      return await exec("git rebase --abort", { timeout: 30000 });
    }

    const status = await gitHelper.getStatus(false);
    const currentBranch = status.currentBranch;
    await output.currentBranch(currentBranch);

    let targetBranch = inputBranch?.trim();

    if (!targetBranch) {
      const branchList = await gitHelper.getBranches("local");
      const otherBranches = branchList
        .filter((b) => b.name !== currentBranch.current)
        .map((b) => b.name);

      if (otherBranches.length === 0) {
        result.stderr = "No other local branches available to rebase onto";
        return result;
      }

      try {
        const answer: any = await enquirer.prompt({
          type: "autocomplete",
          name: "branch",
          message: "Select branch to rebase onto",
          choices: otherBranches,
        });
        targetBranch = answer.branch;
      } catch {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }

      if (!targetBranch) {
        result.stderr = "No branch selected";
        return result;
      }
    }

    const confirmed = await prompt.confirm({
      message: `Rebase '${currentBranch.current}' onto '${targetBranch}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    return await exec(`git rebase ${quoteShell(targetBranch)}`, {
      timeout: 60000,
    });
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
      return await exec("git remote -v", { timeout: 30000 });
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

      return await exec(
        `git remote add ${quoteShell(remoteName.trim())} ${quoteShell(remoteUrl.trim())}`,
        { timeout: 30000 },
      );
    }

    // remove
    const remotes = await gitHelper.getRemotes();

    if (remotes.length === 0) {
      result.stdout = "No remotes configured.";
      result.success = true;
      return result;
    }

    let remote = "";
    try {
      const answer: any = await enquirer.prompt({
        type: "autocomplete",
        name: "remote",
        message: "Select remote to remove",
        choices: remotes,
      });
      remote = answer.remote;
    } catch {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

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

    return await exec(`git remote remove ${quoteShell(remote)}`, {
      timeout: 30000,
    });
  }

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
      const logResult = await exec("git log --all --oneline --decorate -n 50", {
        timeout: 30000,
      });

      if (!logResult.success || !logResult.stdout) {
        result.stderr = "No commits found to cherry-pick";
        return result;
      }

      const commits = logResult.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      try {
        const answer: any = await enquirer.prompt({
          type: "autocomplete",
          name: "selected",
          message: "Select commit to cherry-pick",
          choices: commits,
        });
        commit = answer.selected?.split(" ")[0];
      } catch {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }

      if (!commit) {
        result.stderr = "No commit selected";
        return result;
      }
    }

    const confirmed = await prompt.confirm({
      message: `Cherry-pick commit '${commit}'?`,
    });

    if (!confirmed) {
      result.stderr = "Operation is canceled, exit...";
      return result;
    }

    return await exec(`git cherry-pick ${quoteShell(commit)}`, {
      timeout: 60000,
    });
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

    // Show preview (dry-run)
    const dryRun = await exec("git clean -nfd", { timeout: 30000 });
    if (!dryRun.success) {
      return dryRun;
    }

    if (!dryRun.stdout) {
      result.stdout = "Nothing to clean — working tree already clean.";
      result.success = true;
      return result;
    }

    await output.info(
      "The following files/directories would be removed:\n" + dryRun.stdout,
      0,
    );

    const mode = await prompt.select({
      message: "Clean mode",
      options: [
        { value: "files", label: "Remove untracked files only (git clean -fd)" },
        {
          value: "all",
          label: "Remove untracked files + ignored files (git clean -fdx)",
        },
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
    return await exec(cmd, { timeout: 30000 });
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

    const status = await gitHelper.getStatus(false);
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
        {
          label: "🌍 Restore all changes (.)",
          value: ".",
          hint: "git restore .",
        },
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

      targetFile = files.includes(".")
        ? "."
        : files.map((f) => quoteShell(f)).join(" ");
    } else {
      targetFile = quoteShell(targetFile);
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
      const logResult = await exec("git log --oneline --decorate -n 50", {
        timeout: 30000,
      });

      if (!logResult.success || !logResult.stdout) {
        result.stderr = "Could not retrieve commit history";
        return result;
      }

      const commits = logResult.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      try {
        const answer: any = await enquirer.prompt({
          type: "autocomplete",
          name: "selected",
          message: "Select commit to inspect",
          choices: commits,
        });
        commit = answer.selected?.split(" ")[0];
      } catch {
        result.stderr = "Operation is canceled, exit...";
        return result;
      }

      if (!commit) {
        result.stderr = "No commit selected";
        return result;
      }
    }

    return await exec(`git show ${quoteShell(commit)}`, { timeout: 30000 });
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

    const cmd = all
      ? "git fetch --all --prune"
      : `git fetch ${quoteShell(remotes[0])} --prune`;
    result = await exec(cmd, { timeout: 60000 });

    if (result.success && !result.stdout) {
      result.stdout = all
        ? "Fetched from all remotes successfully."
        : `Fetched from '${remotes[0]}' successfully.`;
    }
    return result;
  }

  // Helper
  private async promptForNewBranch(): Promise<string> {
    return prompt.input({
      message: "Branch name",
      placeholder: "feature/login (Enter exit to cancel)",
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
