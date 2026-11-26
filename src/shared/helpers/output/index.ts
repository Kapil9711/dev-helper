import chalk from "chalk";
import { ExecResult } from "../shell/exec.ts";
import { CommandOptions } from "../../../features/git/git.controller.ts";
import { GitCurrentBranch } from "../gitParsers/parser.types.ts";
import { writer } from "../../ui/writer/index.ts";
import Table from "cli-table3";

type OutputProps = {
  title: string;
  message: string;
  duration?: number;
  isRaw?: boolean;
};

class Output {
  async autoPrint(result: ExecResult, options?: CommandOptions) {
    const isPrintJson = options?.json;
    if (isPrintJson) {
      return output.json(result);
    }
    if (result.success) {
      await output.success({
        title: result.command,
        message: result.stdout,
        duration: result.durationMs,
      });
    } else {
      const errMsg = result.stderr || result.stdout || "Command failed";
      await output.error({
        title: result.command,
        message: errMsg,
        duration: result.durationMs,
      });
    }
  }

  async success({ title, message, duration, isRaw = false }: OutputProps) {
    await writer.writeln("");
    await writer.writeln(chalk.green(`${title} Started`));
    if (message) {
      await writer.writeln(message);
    }
    if (duration !== undefined) {
      const msg = ` Duration ${duration} ms `;
      await writer.writeln(chalk.yellow(msg));
    }
    await writer.writeln(
      chalk.bgCyanBright(chalk.blackBright(` ${title} SUCCESS `)),
    );
  }

  async error({ title, message, duration, isRaw = false }: OutputProps) {
    await writer.writeln("");
    await writer.writeln(chalk.red(`${title} Failed`));
    if (message) {
      await writer.writeln(chalk.red(message));
    }

    if (duration !== undefined) {
      const msg = `Duration ${duration} ms`;
      await writer.writeln(chalk.yellow(msg));
    }

    await writer.writeln(
      chalk.bgRedBright(chalk.whiteBright(` ${title} ❌ ERROR `)),
    );
  }

  async info(message: string, delay?: number) {
    await writer.writeln("");
    await writer.write(chalk.cyan(message), delay);
  }

  json(content: any) {
    console.dir(content);
  }

  async currentBranch(branch: GitCurrentBranch) {
    if (!branch) return;

    const table = new Table({
      head: ["Property", "Value"],
      colWidths: [18, 35],
    });

    const branchName = branch.detached
      ? "(detached HEAD)"
      : branch.current || "None";

    table.push(
      ["Branch", branchName],
      ["Upstream", branch.upstream ?? "None"],
      ["Ahead", branch.ahead ?? 0],
      ["Behind", branch.behind ?? 0],
    );
    await writer.writeln("");
    await writer.writeln(chalk.cyan("Current Branch Details"));
    await output.info(chalk.cyan(table.toString()), 0);
  }
}

export const output = new Output();
