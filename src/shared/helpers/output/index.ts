import chalk from "chalk";

type OutputProps = {
  title: string;
  message: string;
  duration?: number;
  isRaw?: boolean;
};

class Output {
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

  info(title: string, message: string) {
    console.log();

    console.log(chalk.cyan(`ℹ ${title}`));

    console.log();

    console.log(message);
  }

  json(content: any) {
    console.dir(content);
  }
}

export const output = new Output();
