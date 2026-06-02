import { Command } from "commander";
import { dashboardBootstrap } from "../../dashboards/project/backend/server/dashboard.bootstrap";

export function projectDashboardCommand(program: Command) {
  program

    .command("project")

    .description("Project monitoring dashboard")

    .argument("<command>", "command to run")

    .argument("[args...]", "command arguments")

    .action(
      async (
        command: string,

        args: string[],
      ) => {
        await dashboardBootstrap({
          command,

          args,
        });
      },
    );
}
