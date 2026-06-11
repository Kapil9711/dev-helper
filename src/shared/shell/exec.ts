import { exec as nodeExec } from "child_process";

export type ExecOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  throwOnError?: boolean;
  maxBuffer?: number;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  durationMs: number;
  success: boolean;
  command: string;
};

export async function exec(
  command: string,
  options: ExecOptions = {},
): Promise<ExecResult> {
  const startedAt = Date.now();

  const {
    cwd,
    env,
    timeout = 10000,
    throwOnError = true,
    maxBuffer = 10 * 1024 * 1024,
  } = options;

  return new Promise((resolve, reject) => {
    nodeExec(
      command,
      {
        cwd,
        env,
        timeout,
        maxBuffer,
      },
      (error, stdout, stderr) => {
        const result: ExecResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs: Date.now() - startedAt,
          success: !error,
          command,
        };
        if (error && throwOnError) {
          const finalError = new Error(stderr.trim() || error.message);
          return reject(finalError);
        }
        resolve(result);
      },
    );
  });
}
