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
      await output.error({
        title: result.command,
        message: result.stderr,
        duration: result.durationMs,
      });
    }
  }

  async success({ title, message, duration, isRaw = false }: OutputProps) {
    await writer.writeln("");
    await writer.writeln(chalk.green(`${title} Started`));
    await writer.writeln(message);
    if (duration) {
      const msg = `Duration ${duration} ms`;
      // await writer.writeln(chalk.yellow(msg));
      await writer.writeln(chalk.bgGray(chalk.yellow(msg)));
    }
    await writer.writeln(chalk.green(`${title} SUCCESS`));
  }

  async error({ title, message, duration, isRaw = false }: OutputProps) {
    await writer.writeln("");
    await writer.writeln(chalk.green(`${title} Started`));
    await writer.writeln(message);
    if (duration) {
      const msg = `Duration ${duration} ms`;
      await writer.writeln(chalk.bgGray(chalk.yellow(msg)));
    }
    await writer.writeln(chalk.red(`${title} ✖ ERROR`));

    // console.log(chalk.red(`${title} ✖ ERROR`));
  }

  async info(message: string, delay: number = 0) {
    await writer.writeln(message, delay);
    // console.log(chalk.cyan(message));
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

    table.push(
      ["Branch", branch.current],
      ["Upstream", branch.upstream ?? "None"],
      ["Ahead", branch.ahead],
      ["Behind", branch.behind],
    );
    await writer.writeln("");
    await writer.writeln(chalk.cyan("Current Branch Details"));
    await output.info(chalk.cyan(table.toString()));
  }
}

export const output = new Output();
