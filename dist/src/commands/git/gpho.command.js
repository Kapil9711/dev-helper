"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gphoCommand = gphoCommand;
const git_service_1 = require("../../services/git/git.service");
function gphoCommand(program) {
    program
        .command("gpho")
        .argument("[branch]", "Branch name")
        .description("Push directly to origin")
        .addHelpText("after", `
Examples:

  vh gpho

  vh gpho main
`)
        .action(async (branch) => {
        await git_service_1.gitService.pushOrigin(branch);
    });
}
