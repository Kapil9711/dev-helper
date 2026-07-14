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
}

export const gitCommandRouter = new GitCommandRouter();
