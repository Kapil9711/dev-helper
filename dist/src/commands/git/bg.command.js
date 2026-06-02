"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bgCommand = bgCommand;
const git_service_1 = require("../../services/git/git.service");
function bgCommand(program) {
    program
        .command("bg")
        .description("List git branches")
        .addHelpText("after", `
Examples:

  vh bg
`)
        .action(async () => {
        await git_service_1.gitService.branches();
    });
}
