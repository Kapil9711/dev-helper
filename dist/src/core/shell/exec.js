"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = exec;
const child_process_1 = require("child_process");
function exec(command, capture = false) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
                return;
            }
            if (!capture) {
                process.stdout.write(stdout);
            }
            resolve(stdout);
        });
    });
}
