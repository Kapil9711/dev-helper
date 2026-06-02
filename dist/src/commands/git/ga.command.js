"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaCommand = gaCommand;
const git_service_1 = require("../../services/git/git.service");
function gaCommand(program) {
    program
        .command("ga")
        .description("Stage all modified files")
        .addHelpText("after", `
Examples:

  vh ga

Workflow:

  1. Run git add .
  2. Stage all changes
`)
        .action(async () => {
        await git_service_1.gitService.addAll();
    });
}
