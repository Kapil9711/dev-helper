import chalk from "chalk";

class Output {
  success(title: string, message: string, duration: number) {
    console.log();
    console.log(chalk.green(`✓ ${title} Started`));
    console.log();
    console.log(
      "********************* Raw Output Start **********************",
    );
    console.log();
    console.log(message);
    console.log();
    console.log("********************* Raw Output End **********************");
    console.log();
    console.log("Duration ", duration, "ms");
    console.log(chalk.green(`${title} ★ SUCCESS`));
  }

  error(title: string, message: string, duration: number) {
    console.log();
    console.log(chalk.green(`✓ ${title} Started`));
    console.log();
    console.log(
      "********************* Raw Output Start **********************",
    );
    console.log();
    console.log(message);
    console.log();
    console.log("********************* Raw Output End **********************");
    console.log();
    console.log("Duration ", duration, "ms");
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
