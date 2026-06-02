"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitService = void 0;
const exec_1 = require("../../core/shell/exec");
class GitService {
    async addAll() {
        console.log("📦 Staging all files...");
        await (0, exec_1.exec)("git add .");
        console.log("✅ Files staged");
    }
    async commit(message) {
        console.log(`📝 Creating commit: "${message}"`);
        await (0, exec_1.exec)(`git commit -m "${message}"`);
        console.log("✅ Commit created");
    }
    async status() {
        console.log("📊 Repository status\n");
        await (0, exec_1.exec)("git status");
    }
    async checkout(branch) {
        console.log(`🔄 Switching to ${branch}`);
        await (0, exec_1.exec)(`git checkout ${branch}`);
        console.log(`✅ Now on ${branch}`);
    }
    async checkoutBranch(branch) {
        console.log(`🌱 Creating ${branch}`);
        await (0, exec_1.exec)(`git checkout -b ${branch}`);
        console.log(`✅ Switched to ${branch}`);
    }
    async branches() {
        console.log("🌿 Branches\n");
        await (0, exec_1.exec)("git branch");
    }
    async restore(file) {
        if (file) {
            console.log(`↩️ Restoring ${file}`);
            await (0, exec_1.exec)(`git restore ${file}`);
        }
        else {
            console.log("↩️ Restoring all changes");
            await (0, exec_1.exec)("git restore .");
        }
        console.log("✅ Restore complete");
    }
    async pushUpstream() {
        const current = (await (0, exec_1.exec)("git branch --show-current", true)).trim();
        console.log(`📤 Pushing ${current}`);
        await (0, exec_1.exec)(`git push --set-upstream origin ${current}`);
        console.log("✅ Push complete");
    }
    async pushOrigin(branch) {
        const target = branch || (await (0, exec_1.exec)("git branch --show-current", true)).trim();
        console.log(`📤 Push origin ${target}`);
        await (0, exec_1.exec)(`git push origin ${target}`);
        console.log("✅ Push complete");
    }
    async pullOrigin(branch) {
        const target = branch || (await (0, exec_1.exec)("git branch --show-current", true)).trim();
        console.log(`📥 Pull origin ${target}`);
        await (0, exec_1.exec)(`git pull origin ${target}`);
        console.log("✅ Pull complete");
    }
    async pushWithPull(branch) {
        const currentBranch = (await (0, exec_1.exec)("git branch --show-current", true)).trim();
        const pullBranch = branch || currentBranch;
        console.log(`🚀 Starting push workflow`);
        console.log(`📍 Current branch: ${currentBranch}`);
        console.log(`📥 Pull branch: ${pullBranch}`);
        try {
            console.log(`\n🔄 Syncing with ${pullBranch}...`);
            await this.pull(pullBranch);
            console.log(`\n📤 Pushing ${currentBranch}...`);
            try {
                await (0, exec_1.exec)(`git push origin ${currentBranch}`);
                console.log(`✅ Successfully pushed ${currentBranch}`);
            }
            catch {
                console.log("⚠️ Upstream not found");
                console.log("🔗 Creating upstream...");
                await (0, exec_1.exec)(`git push --set-upstream origin ${currentBranch}`);
                console.log(`✅ Upstream created for ${currentBranch}`);
                console.log(`✅ Successfully pushed ${currentBranch}`);
            }
            console.log("\n🎉 Workflow completed successfully");
        }
        catch {
            console.log("\n❌ Pull failed. Aborting push.");
            process.exit(1);
        }
    }
    async pull(branch) {
        const targetBranch = branch || (await (0, exec_1.exec)("git branch --show-current", true)).trim();
        console.log(`📥 Pulling from branch: ${targetBranch}`);
        try {
            await (0, exec_1.exec)(`git pull origin ${targetBranch}`);
            console.log(`✅ Pulled successfully from ${targetBranch}`);
        }
        catch {
            console.log("⚠️ Upstream missing");
            await (0, exec_1.exec)(`git branch --set-upstream-to=origin/${targetBranch} ${targetBranch}`);
            console.log("🔄 Trying again...");
            await (0, exec_1.exec)(`git pull origin ${targetBranch}`);
            console.log(`✅ Pulled successfully from ${targetBranch}`);
        }
    }
}
exports.gitService = new GitService();
