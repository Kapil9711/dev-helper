"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcoCommand = gcoCommand;
const git_service_1 = require("../../services/git/git.service");
function gcoCommand(program) {
    program
        .command("gco")
        .argument("<branch>", "Branch name")
        .description("Checkout existing branch")
        .addHelpText("after", `
Examples:

  vh gco main

  vh gco develop
`)
        .action(async (branch) => {
        await git_service_1.gitService.checkout(branch);
    });
}
