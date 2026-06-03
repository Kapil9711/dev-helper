import { input } from "@inquirer/prompts";
import { exec } from "../../core/shell/exec";

class GitService {
  async deleteBranch(
    branch: string,

    remote = false,
  ) {
    console.log(`🗑️ Removing ${branch}`);

    try {
      await exec(`git branch -d ${branch}`);

      console.log("✅ Local branch removed");
    } catch {
      console.log(
        `
⚠️ Normal delete failed

Branch may contain unmerged commits
`,
      );

      const answer = await input({
        message: "Press F to force delete or Enter to cancel",
      });

      if (answer.toLowerCase() !== "f") {
        console.log("❌ Cancelled");

        return;
      }

      try {
        await exec(
          `
git branch \
-D \
${branch}
`,
        );

        console.log("✅ Force deleted");
      } catch {
        console.log("❌ Force delete failed");

        return;
      }
    }

    if (remote) {
      try {
        await exec(
          `
git push origin \
--delete \
${branch}
`,
        );

        console.log("✅ Remote deleted");
      } catch {
        console.log("⚠️ Remote delete failed");
      }
    }
  }
  async cherryPickLines(
    ref: string,

    file: string,

    range?: string,
  ) {
    const commit = await this.resolveRef(ref);

    console.log(
      `
🍒 Interactive patch mode

Ref: ${ref}

File: ${file}

Range: ${range || "interactive"}
`,
    );

    await exec(
      `
git checkout \
-p \
${commit} \
-- \
${file}
`,
      false,

      true,
    );
  }

  async cherryPickInteractive(
    ref: string,

    file: string,
  ) {
    const commit = await this.resolveRef(ref);

    console.log("🎯 Patch selection mode");

    await exec(
      `
git checkout \
-p \
${commit} \
-- \
${file}
`,
      false,

      true,
    );
  }
  async cherryPickCommit(ref: string) {
    const commit = await this.resolveRef(ref);

    console.log(`🍒 Cherry-picking ${commit}`);

    await exec(
      `
git cherry-pick \
${commit}
`,
    );

    console.log("✅ Complete");
  }

  async cherryPickFile(
    ref: string,

    file: string,
  ) {
    const commit = await this.resolveRef(ref);

    console.log(`🍒 Picking ${file}`);

    console.log(`Using ${commit}`);

    await exec(
      `
git checkout \
${commit} \
-- \
${file}
`,
    );

    console.log("✅ File restored");
  }

  async cherryPickFolder(
    ref: string,

    folder: string,
  ) {
    const commit = await this.resolveRef(ref);

    console.log(`🍒 Picking folder ${folder}`);

    await exec(
      `
git checkout \
${commit} \
-- \
${folder}
`,
    );

    console.log("✅ Folder restored");
  }
  async init() {
    console.log("🚀 Initializing repository");

    await exec("git init");

    console.log("✅ Repository initialized");
  }

  async fetch() {
    console.log("📥 Fetching remotes");

    await exec("git fetch --all --prune");

    console.log("✅ Fetch complete");
  }

  async merge(branch: string) {
    console.log(`🔀 Merging ${branch}`);

    await exec(`git merge ${branch}`);

    console.log("✅ Merge complete");
  }

  async sync() {
    console.log("🔄 Syncing repository");

    await exec("git fetch --all --prune");

    await exec("git pull");

    console.log("✅ Repository synced");
  }

  async cleanup() {
    console.log("🧹 Cleaning repository");

    await exec("git remote prune origin");

    try {
      await exec(
        `
git branch --merged \
| grep -v "*" \
| xargs git branch -d
`,
      );
    } catch {}

    console.log("✅ Cleanup complete");
  }

  async graph() {
    await exec(
      `
git log \
--graph \
--oneline \
--decorate \
--all
`,
    );
  }

  async undo({
    hard = false,

    mixed = false,

    commit,

    index = 1,
  }: {
    hard?: boolean;

    mixed?: boolean;

    commit?: string;

    index?: number;
  }) {
    let mode = "--soft";

    if (hard) {
      mode = "--hard";
    }

    if (mixed) {
      mode = "--mixed";
    }

    const target = commit || `HEAD~${index}`;

    console.log(`↩️ Resetting ${target}`);

    console.log(`Mode: ${mode}`);

    await exec(`git reset ${mode} ${target}`);

    console.log("✅ Reset complete");
  }
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
  async resolveRef(ref: string) {
    try {
      const commit = (await exec(`git rev-parse ${ref}`, true)).trim();

      return commit;
    } catch {
      throw new Error(`Invalid ref: ${ref}`);
    }
  }
  async final(message = "final") {
    console.log("🚀 Running final workflow");

    await this.addAll();

    await this.commit(message);

    await this.pushWithPull();

    console.log("\n✅ Final workflow completed");
  }
}

export const gitService = new GitService();
