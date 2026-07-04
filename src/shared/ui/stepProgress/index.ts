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
