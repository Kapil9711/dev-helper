import { ChildProcess, spawn } from "child_process";

import { websocketServer } from "../server/websocket.server";

class ProcessWrapper {
  private child?: ChildProcess;

  async start({
    command,

    args,
  }: {
    command: string;

    args: string[];
  }) {
    this.child = spawn(
      command,

      args,

      {
        shell: true,

        stdio: "pipe",

        env: {
          ...process.env,

          VH_ENABLED: "true",
        },
      },
    );

    websocketServer.emit(
      "process",

      {
        pid: this.child.pid,

        command,

        args,
      },
    );

    this.child.stdout?.on(
      "data",

      (data) => {
        websocketServer.emit(
          "stdout",

          {
            message: data.toString(),

            timestamp: Date.now(),
          },
        );
      },
    );

    this.child.stderr?.on(
      "data",

      (data) => {
        websocketServer.emit(
          "stderr",

          {
            message: data.toString(),

            timestamp: Date.now(),
          },
        );
      },
    );

    this.child.on(
      "close",

      (code) => {
        websocketServer.emit(
          "process_exit",

          {
            code,
          },
        );
      },
    );

    this.child.on(
      "error",

      (error) => {
        websocketServer.emit(
          "process_error",

          {
            error: error.message,
          },
        );
      },
    );
  }

  getPid() {
    return this.child?.pid;
  }

  getProcess() {
    return this.child;
  }

  stop() {
    this.child?.kill("SIGTERM");
  }
}

export const processWrapper = new ProcessWrapper();
