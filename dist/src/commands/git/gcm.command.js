"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcmCommand = gcmCommand;
const git_service_1 = require("../../services/git/git.service");
function gcmCommand(program) {
    program
        .command("gcm")
        .argument("<message>", "Commit message")
        .description("Create git commit")
        .addHelpText("after", `
Examples:

  vh gcm "fix login issue"

Workflow:

  1. Create commit
  2. Use provided message
`)
        .action(async (message) => {
        await git_service_1.gitService.commit(message);
    });
}
