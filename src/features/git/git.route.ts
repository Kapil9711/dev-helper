import { Command } from "commander";
import { gitCommandController } from "./git.controller.ts";

class GitCommandRouter {
  private git!: Command;
  register(program: Command) {
    this.git = program.command("git");
    // acutal commands
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
      .description("Add files to stagging area")
      .option("-j, --json")
      .action(gitCommandController.gitAdd);
  }

  private gitCommit() {
    this.git
      .command("commit")
      .description("Create commit")
      .argument("[message]", "commit message")
      .option("-j, --json")
      .action(gitCommandController.gitCommit);
  }

  private gitPush() {
    this.git
      .command("push")
      .description("Push to remote branch")
      .option("-j, --json")
      .option("--force")
      .option("--force-unsafe")
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
      .description("Checkout to new branch")
      .option("-b, --new-branch")
      .argument("[branch]", "Branch Name")
      .action(gitCommandController.gitCheckout);
  }

  private gitBranch() {
    this.git
      .command("branch")
      .description("All Branch List")
      .option("-b, --new-branch")
      .action(gitCommandController.gitBranch);
  }

  // auto routes
  private gitCommitWithAdd() {
    this.git
      .command("cwa")
      .description("Auto commit with add")
      .option("-j, --json")
      .argument("[message]", "commit message")
      .action(gitCommandController.gitCommitWithAdd);
  }

  private gitPushWithCommitAndAdd() {
    this.git
      .command("phcwa")
      .description("Auto push with commit and add")
      .option("-j, --json")
      .argument("[message]", "commit message")
      .action(gitCommandController.gitPushWithCommitAndAdd);
  }

  private gitPullWithCommitAndAdd() {
    this.git
      .command("plcwa")
      .description("Auto pull with commit and add")
      .option("-j, --json")
      .argument("[message]", "Branch Name")
      .argument("[branch]", "commit message")
      .action(gitCommandController.gitPullWithCommitAndAdd);
  }

  private gitPushWithPullAndCommit() {
    this.git
      .command("puplwc")
      .description("Auto pull with commit and add")
      .option("-j, --json")
      .argument("[message]", "commit message")
      .argument("[branch]", "commit message")

      .action(gitCommandController.gitPushWithPullAndCommit);
  }

  private gitCheckoutWithCommitAndAdd() {
    this.git
      .command("cwca")
      .description("Checkout with commit and add")
      .argument("[message]", "Branch Name")
      .option("-b, --new-branch")
      .argument("[branch]", "Branch Name")
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
      .description("Reset the last commit (soft or hard) or discard unstaged changes")
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
      .description("Remove untracked files and directories (with preview + confirmation)")
      .option("-j, --json")
      .action(gitCommandController.gitClean);
  }

  private gitRestore() {
    this.git
      .command("restore")
      .description("Discard changes in working tree for specific files (interactive)")
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
