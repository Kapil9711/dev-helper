"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcobCommand = gcobCommand;
const git_service_1 = require("../../services/git/git.service");
function gcobCommand(program) {
    program
        .command("gcob")
        .argument("<branch>", "New branch name")
        .description("Create and switch branch")
        .addHelpText("after", `
Examples:

  vh gcob feature/auth

Workflow:

  1. Create branch
  2. Checkout branch
`)
        .action(async (branch) => {
        await git_service_1.gitService.checkoutBranch(branch);
    });
}
