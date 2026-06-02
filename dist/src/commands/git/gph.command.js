"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gphCommand = gphCommand;
const git_service_1 = require("../../services/git/git.service");
function gphCommand(program) {
    program
        .command("gph")
        .description("Pull latest changes and push current branch to remote")
        .argument("[branch]", "Branch to pull before pushing (default: current branch)")
        .addHelpText("after", `
Examples:

  vh gph
    Pull current branch then push it

  vh gph main
    Pull from main then push current branch

Workflow:

  1. Detect current branch
  2. Pull latest changes
  3. Create upstream if missing
  4. Push branch to remote
`)
        .action(async (branch) => {
        await git_service_1.gitService.pushWithPull(branch);
    });
}
