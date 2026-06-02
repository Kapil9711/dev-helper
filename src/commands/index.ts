import { Command } from "commander";

import { registerGitCommands } from "./git";
import { registerNetworkCommands } from "./network";
import { registerDashboardCommands } from "./dashbaord";

export function registerCommands() {
  const program = new Command();

  program.name("vh");

  registerGitCommands(program);
  registerNetworkCommands(program);
  registerDashboardCommands(program);

  program.parse();
}
