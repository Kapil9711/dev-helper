import chalk from "chalk";
import { ExecResult } from "../shell/exec.ts";
import { CommandOptions } from "../../../features/git/git.controller.ts";
import { GitCurrentBranch } from "../gitParsers/parser.types.ts";

type OutputProps = {
  title: string;
  message: string;
  duration?: number;
  isRaw?: boolean;
};

class Output {
  autoPrint(result: ExecResult, options?: CommandOptions) {
    const isPrintJson = options?.json;
    if (isPrintJson) {
      return output.json(result);
    }
    if (result.success) {
      output.success({
        title: result.command,
        message: result.stdout,
        duration: result.durationMs,
      });
    } else {
      output.error({
        title: result.command,
        message: result.stderr,
        duration: result.durationMs,
      });
    }
  }

  success({ title, message, duration, isRaw = false }: OutputProps) {
    console.log();
    console.log(chalk.green(`✓ ${title} Started`));
    console.log();
    if (isRaw) {
      console.log(
        "********************* Raw Output Start **********************",
      );
      console.log();
    }

    console.log(message);

    if (isRaw) {
      console.log();
      console.log(
        "********************* Raw Output End **********************",
      );
    }

    console.log();
    if (duration) {
      console.log("Duration ", duration, "ms");
    }
    console.log(chalk.green(`${title} ★ SUCCESS`));
  }

  error({ title, message, duration, isRaw = false }: OutputProps) {
    console.log();
    console.log(chalk.green(`✓ ${title} Started`));
    console.log();

    if (isRaw) {
      console.log(
        "********************* Raw Output Start **********************",
      );
      console.log();
    }

    console.log(message);

    if (isRaw) {
      console.log();
      console.log(
        "********************* Raw Output End **********************",
      );
    }
    console.log();

    if (duration) {
      console.log("Duration ", duration, "ms");
    }
    console.log(chalk.red(`${title} ✖ ERROR`));
  }

  info(message: string) {
    console.log(chalk.cyan(message));
  }

  json(content: any) {
    console.dir(content);
  }

  currentBranch(branch: GitCurrentBranch) {
    if (!branch) return;
    const message = `
Current Branch Details 
   
Branch    : ${branch.current}
Upstream  : ${branch.upstream ?? "None"}
Ahead     : ${branch.ahead}
Behind    : ${branch.behind}

`;

    output.info(message);
  }
}

export const output = new Output();
