import os from "os";

class SystemService {
  private previous = os.cpus();

  getCpuUsage() {
    const current = os.cpus();

    let idleDiff = 0;

    let totalDiff = 0;

    current.forEach(
      (
        cpu,

        index,
      ) => {
        const prev = this.previous[index];

        const prevTotal = Object.values(prev.times).reduce(
          (
            a,

            b,
          ) => a + b,

          0,
        );

        const currTotal = Object.values(cpu.times).reduce(
          (
            a,

            b,
          ) => a + b,

          0,
        );

        idleDiff += cpu.times.idle - prev.times.idle;

        totalDiff += currTotal - prevTotal;
      },
    );

    this.previous = current;

    const usage = 100 - (idleDiff / totalDiff) * 100;

    return Number(usage.toFixed(1));
  }

  getMemory() {
    const total = os.totalmem();

    const free = os.freemem();

    const result = {
      usedMB: Math.round((total - free) / 1024 / 1024),

      totalMB: Math.round(total / 1024 / 1024),
    };

    return result;
  }

  getMachine() {
    return {
      arch: os.arch(),

      cpu: os.cpus()[0]?.model,

      platform: os.platform(),
    };
  }
}

export const systemService = new SystemService();
