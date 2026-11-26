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

export function quoteShell(arg: string): string {
  if (!arg) return "''";
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export async function exec(
  command: string,
  options: ExecOptions = {},
): Promise<ExecResult> {
  const startedAt = Date.now();

  const {
    cwd,
    env,
    timeout = 10000,
    throwOnError = false,
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
        const trimmedStdout = stdout.trim();
        const trimmedStderr = stderr.trim();
        const result: ExecResult = {
          stdout: trimmedStdout,
          stderr: trimmedStderr || (error && !trimmedStderr ? error.message : ""),
          durationMs: Date.now() - startedAt,
          success: !error,
          command,
        };
        if (error && throwOnError) {
          const finalError = new Error(result.stderr || result.stdout || error.message);
          return reject(finalError);
        }
        resolve(result);
      },
    );
  });
}
