// src/core/helper/safe-command.helper.ts

import { UserCancelledError } from "./prompts.helper";

export async function safeCommand(callback: () => Promise<void>) {
  try {
    await callback();
  } catch (error) {
    if (error instanceof UserCancelledError) {
      console.log("\n❌ Operation cancelled");

      return;
    }

    console.error("\n❌ Error:", error);

    process.exit(1);
  }
}
