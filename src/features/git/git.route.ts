import { Command } from "commander";
import { gitCommandController } from "./git.controller.ts";

class GitCommandRouter {
  private git!: Command;
  register(program: Command) {
    this.git = program.command("git");
    // dashboard command
    this.gitDashboard();
    // actual commands
    this.gitInit();
    this.gitStatus();
    this.gitAdd();
    this.gitCommit();
    this.gitPush();
    this.gitPull();

    // auto routes
    this.gitCommitWithAdd();
    this.gitPushWithCommitAndAdd();
    this.gitPullWithCommitAndAdd();
    this.gitPushWithPullAndCommit();
    this.gitCheckout();
    this.gitCheckoutWithCommitAndAdd();
    this.gitBranch();

    // new commands
    this.gitStash();
    this.gitMerge();
    this.gitDiff();
    this.gitLog();
    this.gitReset();
    this.gitTag();
    this.gitRebase();
    this.gitRemote();
    this.gitCherryPick();
    this.gitClean();
    this.gitRestore();
    this.gitShow();
    this.gitFetch();
  }
  private gitDashboard() {
    this.git
      .command("dashboard")
      .alias("serve")
      .description("Start the standalone Git Dashboard server")
      .option("-p, --port <port>", "Port to listen on", "4318")
      .option("--no-open", "Do not open browser automatically")
      .action(gitCommandController.gitDashboard);
  }
  private gitInit() {
    this.git
      .command("init")
      .description("Initialize a git repository")
      .option("-j, --json")
      .action(gitCommandController.gitInit);
  }
  private gitStatus() {
    this.git
      .command("status")
      .description("Check the status of the git repository")
      .option("-j, --json")
      .action(gitCommandController.gitStatus);
  }

  private gitAdd() {
    this.git
      .command("add")
      .description("Add files to staging area")
      .argument("[files...]", "Files to stage (optional, interactive if omitted)")
      .option("-j, --json")
      .action(gitCommandController.gitAdd);
  }

  private gitCommit() {
    this.git
      .command("commit")
      .description("Create commit")
      .argument("[message]", "Commit message")
      .option("-j, --json")
      .action(gitCommandController.gitCommit);
  }

  private gitPush() {
    this.git
      .command("push")
      .description("Push to remote branch")
      .option("-j, --json")
      .option("--force", "Force push with lease")
      .option("--force-unsafe", "Force push without lease")
      .action(gitCommandController.gitPush);
  }

  private gitPull() {
    this.git
      .command("pull")
      .description("Pull from remote branch")
      .option("-j, --json")
      .argument("[branch]", "Branch Name")
      .action(gitCommandController.gitPull);
  }

  private gitCheckout() {
    this.git
      .command("checkout")
      .description("Checkout to branch or create new")
      .option("-b, --new-branch", "Create a new branch")
      .argument("[branch]", "Branch Name")
      .action(gitCommandController.gitCheckout);
  }

  private gitBranch() {
    this.git
      .command("branch")
      .description("List branches or create new branch")
      .argument("[branchName]", "Branch name to create (optional)")
      .option("-b, --new-branch <name>", "Create a new branch")
      .action(gitCommandController.gitBranch);
  }

  // auto routes
  private gitCommitWithAdd() {
    this.git
      .command("cwa")
      .description("Auto commit with add")
      .option("-j, --json")
      .argument("[message]", "Commit message")
      .action(gitCommandController.gitCommitWithAdd);
  }

  private gitPushWithCommitAndAdd() {
    this.git
      .command("phcwa")
      .description("Auto push with commit and add")
      .option("-j, --json")
      .option("--force", "Force push with lease")
      .option("--force-unsafe", "Force push without lease")
      .argument("[message]", "Commit message")
      .action(gitCommandController.gitPushWithCommitAndAdd);
  }

  private gitPullWithCommitAndAdd() {
    this.git
      .command("plcwa")
      .description("Auto pull with commit and add")
      .option("-j, --json")
      .argument("[branch]", "Branch name to pull from (optional)")
      .argument("[message]", "Commit message (optional)")
      .action(gitCommandController.gitPullWithCommitAndAdd);
  }

  private gitPushWithPullAndCommit() {
    this.git
      .command("puplwc")
      .description("Auto push with pull and commit")
      .option("-j, --json")
      .argument("[message]", "Commit message (optional)")
      .argument("[branch]", "Branch name to pull from (optional)")
      .action(gitCommandController.gitPushWithPullAndCommit);
  }

  private gitCheckoutWithCommitAndAdd() {
    this.git
      .command("cwca")
      .description("Checkout with commit and add")
      .argument("[branch]", "Branch name to checkout to")
      .argument("[message]", "Commit message (optional)")
      .option("-b, --new-branch", "Create a new branch")
      .action(gitCommandController.gitCheckoutWithCommitAndAdd);
  }

  // new command routes

  private gitStash() {
    this.git
      .command("stash")
      .description(
        "Interactively stash changes, list stashes, or pop/apply/drop a stash",
      )
      .option("-j, --json")
      .action(gitCommandController.gitStash);
  }

  private gitMerge() {
    this.git
      .command("merge")
      .description("Merge a branch into the current branch")
      .argument("[branch]", "Branch to merge")
      .option("-j, --json")
      .option("--abort", "Abort an in-progress merge")
      .action(gitCommandController.gitMerge);
  }

  private gitDiff() {
    this.git
      .command("diff")
      .description("Show changes between working tree and index")
      .option("-j, --json")
      .option("-s, --staged", "Show staged diff (git diff --staged)")
      .action(gitCommandController.gitDiff);
  }

  private gitLog() {
    this.git
      .command("log")
      .description("Show git commit log (oneline graph)")
      .option("-j, --json")
      .option("-n, --limit <num>", "Number of commits to show", parseInt)
      .action(gitCommandController.gitLog);
  }

  private gitReset() {
    this.git
      .command("reset")
      .description(
        "Reset the last commit (soft or hard) or discard unstaged changes",
      )
      .option("-j, --json")
      .option("--hard", "Hard reset — discard all changes")
      .option("--soft", "Soft reset — keep changes staged")
      .option("--head", "Reset to HEAD (discard all unstaged changes)")
      .action(gitCommandController.gitReset);
  }

  private gitTag() {
    this.git
      .command("tag")
      .description("List, create, or delete git tags")
      .option("-j, --json")
      .action(gitCommandController.gitTag);
  }

  private gitRebase() {
    this.git
      .command("rebase")
      .description("Rebase current branch onto another branch")
      .argument("[branch]", "Branch to rebase onto")
      .option("-j, --json")
      .option("--abort", "Abort an in-progress rebase")
      .action(gitCommandController.gitRebase);
  }

  private gitRemote() {
    this.git
      .command("remote")
      .description("Manage remote repositories (list, add, remove)")
      .option("-j, --json")
      .action(gitCommandController.gitRemote);
  }

  private gitCherryPick() {
    this.git
      .command("cherry-pick")
      .description("Apply a specific commit onto the current branch")
      .argument("[commit]", "Commit hash or ref to cherry-pick")
      .option("-j, --json")
      .action(gitCommandController.gitCherryPick);
  }

  private gitClean() {
    this.git
      .command("clean")
      .description(
        "Remove untracked files and directories (with preview + confirmation)",
      )
      .option("-j, --json")
      .action(gitCommandController.gitClean);
  }

  private gitRestore() {
    this.git
      .command("restore")
      .description(
        "Discard changes in working tree for specific files (interactive)",
      )
      .argument("[file]", "File path to restore (omit for interactive picker)")
      .option("-j, --json")
      .action(gitCommandController.gitRestore);
  }

  private gitShow() {
    this.git
      .command("show")
      .description("Show the full diff and metadata of a commit")
      .argument("[commit]", "Commit hash or ref (omit for interactive picker)")
      .option("-j, --json")
      .action(gitCommandController.gitShow);
  }

  private gitFetch() {
    this.git
      .command("fetch")
      .description("Fetch from remote without merging")
      .option("-j, --json")
      .option("-a, --all", "Fetch from all remotes with --prune")
      .action(gitCommandController.gitFetch);
  }
}

export const gitCommandRouter = new GitCommandRouter();
