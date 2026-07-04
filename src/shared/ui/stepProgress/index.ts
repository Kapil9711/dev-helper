enum StepStatus {
  Pending,
  Running,
  Success,
  Failed,
}

interface Step {
  title: string;
  status: StepStatus;
}

export class StepProgress {
  private readonly steps: Step[];

  private current = -1;

  constructor(stepTitles: string[]) {
    this.steps = stepTitles.map((title) => ({
      title,
      status: StepStatus.Pending,
    }));
  }

  start() {
    if (this.steps.length === 0) {
      return;
    }

    this.current = 0;
    this.steps[0].status = StepStatus.Running;

    this.render();
  }

  complete(index: number) {
    if (index < 0 || index >= this.steps.length) {
      return;
    }

    this.steps[index].status = StepStatus.Success;

    if (index + 1 < this.steps.length) {
      this.current = index + 1;
      this.steps[index + 1].status = StepStatus.Running;
    }

    this.render();
  }

  fail(index: number) {
    if (index < 0 || index >= this.steps.length) {
      return;
    }

    this.steps[index].status = StepStatus.Failed;

    this.render();
  }

  finish() {
    this.current = -1;

    this.render();
  }

  private render() {
    console.clear();

    console.log("Git Progress\n");

    for (const step of this.steps) {
      let icon = "○";

      switch (step.status) {
        case StepStatus.Running:
          icon = "▶";
          break;

        case StepStatus.Success:
          icon = "✔";
          break;

        case StepStatus.Failed:
          icon = "✖";
          break;
      }

      console.log(`${icon} ${step.title}`);
    }
  }
}

export class ProgressBar {
  private readonly total: number;

  private completed = 0;

  constructor(private readonly steps: string[]) {
    this.total = steps.length;
  }

  start() {
    this.render();
  }

  complete(count: number) {
    this.completed = Math.min(count, this.total);

    this.render();

    if (this.completed === this.total) {
      console.log("\n✔ Completed");
    }
  }

  private render() {
    const width = 30;

    const progress = this.completed / this.total;

    const filled = Math.round(progress * width);

    const empty = width - filled;

    const percent = Math.round(progress * 100);

    process.stdout.write("\r");

    process.stdout.write(
      `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent}% (${this.completed}/${this.total})`,
    );
  }
}
