"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpuCommand = gpuCommand;
const git_service_1 = require("../../services/git/git.service");
function gpuCommand(program) {
    program
        .command("gpu")
        .description("Push current branch and create upstream if needed")
        .addHelpText("after", `
Examples:

  vh gpu

Workflow:

  1. Detect current branch
  2. Create upstream
  3. Push branch
`)
        .action(async () => {
        await git_service_1.gitService.pushUpstream();
    });
}
