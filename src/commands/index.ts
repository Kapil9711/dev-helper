import { Command } from "commander";

import { registerGitCommands } from "./git";
import { registerNetworkCommands } from "./network";

export function registerCommands() {
  const program = new Command();

  program.name("vh");

  registerGitCommands(program);
  registerNetworkCommands(program);

  program.parse();
}
