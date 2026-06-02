import { exec } from "../../core/shell/exec";

class GitService {
  async addAll() {
    console.log("📦 Staging all files...");

    await exec("git add .");

    console.log("✅ Files staged");
  }

  async commit(message: string) {
    console.log(`📝 Creating commit: "${message}"`);

    await exec(`git commit -m "${message}"`);

    console.log("✅ Commit created");
  }

  async status() {
    console.log("📊 Repository status\n");

    await exec("git status");
  }

  async checkout(branch: string) {
    console.log(`🔄 Switching to ${branch}`);

    await exec(`git checkout ${branch}`);

    console.log(`✅ Now on ${branch}`);
  }

  async checkoutBranch(branch: string) {
    console.log(`🌱 Creating ${branch}`);

    await exec(`git checkout -b ${branch}`);

    console.log(`✅ Switched to ${branch}`);
  }

  async branches() {
    console.log("🌿 Branches\n");

    await exec("git branch");
  }

  async restore(file?: string) {
    if (file) {
      console.log(`↩️ Restoring ${file}`);

      await exec(`git restore ${file}`);
    } else {
      console.log("↩️ Restoring all changes");

      await exec("git restore .");
    }

    console.log("✅ Restore complete");
  }

  async pushUpstream() {
    const current = (await exec("git branch --show-current", true)).trim();

    console.log(`📤 Pushing ${current}`);

    await exec(`git push --set-upstream origin ${current}`);

    console.log("✅ Push complete");
  }

  async pushOrigin(branch?: string) {
    const target =
      branch || (await exec("git branch --show-current", true)).trim();

    console.log(`📤 Push origin ${target}`);

    await exec(`git push origin ${target}`);

    console.log("✅ Push complete");
  }

  async pullOrigin(branch?: string) {
    const target =
      branch || (await exec("git branch --show-current", true)).trim();

    console.log(`📥 Pull origin ${target}`);

    await exec(`git pull origin ${target}`);

    console.log("✅ Pull complete");
  }

  async pushWithPull(branch?: string) {
    const currentBranch = (
      await exec("git branch --show-current", true)
    ).trim();

    const pullBranch = branch || currentBranch;

    console.log(`🚀 Starting push workflow`);

    console.log(`📍 Current branch: ${currentBranch}`);

    console.log(`📥 Pull branch: ${pullBranch}`);

    try {
      console.log(`\n🔄 Syncing with ${pullBranch}...`);

      await this.pull(pullBranch);

      console.log(`\n📤 Pushing ${currentBranch}...`);

      try {
        await exec(`git push origin ${currentBranch}`);

        console.log(`✅ Successfully pushed ${currentBranch}`);
      } catch {
        console.log("⚠️ Upstream not found");

        console.log("🔗 Creating upstream...");

        await exec(`git push --set-upstream origin ${currentBranch}`);

        console.log(`✅ Upstream created for ${currentBranch}`);

        console.log(`✅ Successfully pushed ${currentBranch}`);
      }

      console.log("\n🎉 Workflow completed successfully");
    } catch {
      console.log("\n❌ Pull failed. Aborting push.");

      process.exit(1);
    }
  }

  async pull(branch?: string) {
    const targetBranch =
      branch || (await exec("git branch --show-current", true)).trim();

    console.log(`📥 Pulling from branch: ${targetBranch}`);

    try {
      await exec(`git pull origin ${targetBranch}`);

      console.log(`✅ Pulled successfully from ${targetBranch}`);
    } catch {
      console.log("⚠️ Upstream missing");

      await exec(
        `git branch --set-upstream-to=origin/${targetBranch} ${targetBranch}`,
      );

      console.log("🔄 Trying again...");

      await exec(`git pull origin ${targetBranch}`);

      console.log(`✅ Pulled successfully from ${targetBranch}`);
    }
  }
}

export const gitService = new GitService();
