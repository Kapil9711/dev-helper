import { exec as cpExec, spawn } from "child_process";

export function exec(
  command: string,

  capture = false,

  interactive = false,
): Promise<string> {
  return new Promise(
    (
      resolve,

      reject,
    ) => {
      /*
       * interactive commands
       */

      if (interactive) {
        const child = spawn(
          command,

          {
            shell: true,

            stdio: "inherit",
          },
        );

        child.on(
          "close",

          (code) => {
            if (code !== 0) {
              reject(`Command failed: ${code}`);

              return;
            }

            resolve("");
          },
        );

        return;
      }

      /*
       * normal commands
       */

      cpExec(
        command,

        (
          error,

          stdout,

          stderr,
        ) => {
          if (error) {
            reject(stderr);

            return;
          }

          if (!capture) {
            process.stdout.write(stdout);
          }

          resolve(stdout);
        },
      );
    },
  );
}
