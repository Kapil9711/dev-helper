"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grCommand = grCommand;
const git_service_1 = require("../../services/git/git.service");
function grCommand(program) {
    program
        .command("gr")
        .argument("[file]", "File path")
        .description("Restore file changes")
        .addHelpText("after", `
Examples:

  vh gr

  vh gr src/index.ts
`)
        .action(async (file) => {
        await git_service_1.gitService.restore(file);
    });
}
