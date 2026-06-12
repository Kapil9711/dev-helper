import { output } from "../../shared/output/index.ts";
import { exec, ExecResult } from "../../shared/shell/exec.ts";

class GitCommandController {
  async gitInit(options: { json: boolean }) {
    const result = await exec("git init");
    const isPrintJson = options.json;

    // handling options
    if (isPrintJson) {
      return output.json(result);
    }

    if (result.success) {
      output.success(result.command, result.stdout, result.durationMs);
    } else {
      output.error(result.command, result.stderr, result.durationMs);
    }
  }

  async gitStatus(options: { json: boolean }) {
    const result = await exec("git status");
    const isPrintJson = options.json;

    // handling options
    if (isPrintJson) {
      return output.json(result);
    }

    if (result.success) {
      output.success(result.command, result.stdout, result.durationMs);
    } else {
      output.error(result.command, result.stderr, result.durationMs);
    }
  }
}

export const gitCommandController = new GitCommandController();
