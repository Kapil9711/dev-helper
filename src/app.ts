import { Command } from "commander";
import { gitCommandRouter } from "./features/git/git.route.ts";

export class App {
  private program: Command;

  constructor() {
    this.program = new Command();
  }

  initialiazeCommandar() {
    this.program.name("vh").description("VH Helper Cli").version("0.0.1");
    this.registerAllCommands();
    this.program.parse();
  }

  registerAllCommands() {
    gitCommandRouter.register(this.program);
  }
}

export default new App();
