import { UserCancelledError } from "./prompts.helper";

export async function safeCommand(callback: () => Promise<void>) {
  try {
    await callback();
  } catch (error: any) {
    /*
     * User cancelled manually
     */

    if (error instanceof UserCancelledError) {
      console.log("\n❌ Operation cancelled");

      return;
    }

    /*
     * Ctrl + C / SIGINT from inquirer
     */

    if (
      error?.name === "ExitPromptError" ||
      error?.message?.includes("SIGINT")
    ) {
      console.log("\n❌ Prompt closed");

      return;
    }

    console.error("\n❌ Error:", error);

    process.exit(1);
  }
}
