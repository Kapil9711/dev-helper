"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gploCommand = gploCommand;
const git_service_1 = require("../../services/git/git.service");
function gploCommand(program) {
    program
        .command("gplo")
        .argument("[branch]", "Branch name")
        .description("Pull directly from origin")
        .addHelpText("after", `
Examples:

  vh gplo

  vh gplo main
`)
        .action(async (branch) => {
        await git_service_1.gitService.pullOrigin(branch);
    });
}
