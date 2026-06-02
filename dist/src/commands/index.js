"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const commander_1 = require("commander");
const git_1 = require("./git");
const network_1 = require("./network");
function registerCommands() {
    const program = new commander_1.Command();
    program.name("vh");
    (0, git_1.registerGitCommands)(program);
    (0, network_1.registerNetworkCommands)(program);
    program.parse();
}
