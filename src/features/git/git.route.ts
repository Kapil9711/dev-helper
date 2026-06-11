import { Command } from "commander";

class GitCommandRouter {
  private git!: Command;
  register(program: Command) {
    this.git = program.command("git");
    // acutal commands
    this.gitInit();
    this.gitStatus();
  }
  private gitInit() {
    this.git.command("init").action(() => {});
  }
  private gitStatus() {
    this.git
      .command("status")
      .option("-j", "--json")
      .action((options) => {
        console.log(options);
      });
  }
}

export const gitCommandRouter = new GitCommandRouter();
