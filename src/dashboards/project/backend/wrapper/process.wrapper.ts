import { spawn, IPty } from "node-pty";

import { websocketServer } from "../server/websocket.server";

class ProcessWrapper {
  private child?: IPty;

  private stdinHandler?: (data: Buffer | string) => void;

  private sigintHandler?: () => void;

  async start({
    command,
    args,
  }: {
    command: string;

    args: string[];
  }) {
    console.log("starting:", command, args.join(" "));

    this.child = spawn(
      "/usr/bin/env",

      [command, ...args],

      {
        name: "xterm-256color",

        cwd: process.cwd(),

        cols: process.stdout.columns || 120,

        rows: process.stdout.rows || 40,

        env: {
          ...process.env,

          TERM: "xterm-256color",

          VH_ENABLED: "true",
        },
      },
    );

    console.log("spawned pid:", this.child.pid);

    websocketServer.emit(
      "process",

      {
        pid: this.child.pid,

        command,

        args,
      },
    );

    /*
     * terminal output
     */

    this.child.onData((data) => {
      process.stdout.write(data);

      websocketServer.emit(
        "stdout",

        {
          message: data,

          timestamp: Date.now(),
        },
      );
    });

    /*
     * interactive input
     */

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.resume();

    process.stdin.setEncoding("utf8");

    this.stdinHandler = (data) => {
      const input = data.toString();

      /*
       * ctrl+c
       */

      if (input === "\u0003") {
        this.stop();

        process.exit(0);

        return;
      }

      /*
       * expo shortcuts
       */

      this.child?.write(input);
    };

    process.stdin.on(
      "data",

      this.stdinHandler,
    );

    /*
     * fallback sigint
     */

    this.sigintHandler = () => {
      this.stop();

      process.exit(0);
    };

    process.once(
      "SIGINT",

      this.sigintHandler,
    );

    /*
     * child exit
     */

    this.child.onExit(({ exitCode }) => {
      this.cleanup();

      websocketServer.emit(
        "process_exit",

        {
          code: exitCode,
        },
      );
    });
  }

  private cleanup() {
    if (this.stdinHandler) {
      process.stdin.off(
        "data",

        this.stdinHandler,
      );
    }

    if (this.sigintHandler) {
      process.removeListener(
        "SIGINT",

        this.sigintHandler,
      );
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    process.stdin.pause();
  }

  getPid() {
    return this.child?.pid;
  }

  getProcess() {
    return this.child;
  }

  stop() {
    this.cleanup();

    this.child?.kill();
  }
}

export const processWrapper = new ProcessWrapper();
