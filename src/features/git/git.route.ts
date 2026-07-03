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
}

export const gitCommandRouter = new GitCommandRouter();
