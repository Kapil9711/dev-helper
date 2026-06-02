import { Command } from "commander";

import { dashboardBootstrap } from "../../dashboards/project/backend/server/dashboard.bootstrap";

export function registerDashboardCommands(program: Command) {
  program
    .command("dashboard")

    .description("Dashboard utilities")

    .allowUnknownOption(true)

    .allowExcessArguments(true)

    .option("--project", "Start project dashboard")

    .argument("[command...]", "command to wrap")

    .addHelpText(
      "after",

      `
Examples:

  vh dashboard --project yarn dev

  vh dashboard --project npm run dev

  vh dashboard --project expo start
`,
    )

    .action(
      async (
        command: string[],

        options,
        cmd,
      ) => {
        if (!options.project) {
          console.log("Use --project flag");

          return;
        }

        const args = cmd.args.filter((arg: string) => arg !== "--project");

        if (!args.length) {
          console.log("Provide command");

          return;
        }

        const [executable, ...commandArgs] = args;

        await dashboardBootstrap({
          command: executable,

          args: commandArgs,
        });
      },
    );
}
