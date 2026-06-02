import { exec as cpExec } from "child_process";

export function exec(command: string, capture = false): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    cpExec(
      command,

      (error, stdout, stderr) => {
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
  });
}
