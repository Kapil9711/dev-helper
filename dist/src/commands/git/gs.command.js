"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gsCommand = gsCommand;
const git_service_1 = require("../../services/git/git.service");
function gsCommand(program) {
    program
        .command("gs")
        .description("Show repository status")
        .addHelpText("after", `
Examples:

  vh gs

Shows:

  modified files
  staged files
  branch status
`)
        .action(async () => {
        await git_service_1.gitService.status();
    });
}
