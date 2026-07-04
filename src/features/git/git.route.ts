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

    // auto routes
    this.gitCommitWithAdd();
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

  // auto routes
  private gitCommitWithAdd() {
    this.git
      .command("cwa")
      .description("Auto commit with add")
      .option("-j, --json")
      .argument("[message]", "commit message")
      .action(gitCommandController.gitCommitWithAdd);
  }
}

export const gitCommandRouter = new GitCommandRouter();
