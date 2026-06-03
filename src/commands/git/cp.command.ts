import { Command } from "commander";

import { gitService } from "../../services/git/git.service";

import { pickFile, pickFolder } from "../../core/helper/prompts.helper";

import { safeCommand } from "../../core/helper/command.helper";

export function cpCommand(program: Command) {
  const cp = program

    .command("cp")

    .description("Smart cherry pick");

  /*
   * commit
   */

  cp.command("commit")

    .argument("<ref>")

    .action((ref) =>
      safeCommand(async () => {
        await gitService.cherryPickCommit(ref);
      }),
    );

  /*
   * file
   */

  cp.command("file")

    .argument("<ref>")

    .argument("[file]")

    .action(
      (
        ref,

        file,
      ) =>
        safeCommand(async () => {
          if (!file) {
            file = await pickFile(ref);
          }

          await gitService.cherryPickFile(
            ref,

            file,
          );
        }),
    );

  /*
   * folder
   */

  cp.command("folder")

    .argument("<ref>")

    .argument("[folder]")

    .action(
      (
        ref,

        folder,
      ) =>
        safeCommand(async () => {
          if (!folder) {
            folder = await pickFolder(ref);
          }

          await gitService.cherryPickFolder(
            ref,

            folder,
          );
        }),
    );

  /*
   * line
   */

  cp.command("line")

    .argument("<ref>")

    .argument("[file]")

    .argument("[range]")

    .action(
      (
        ref,

        file,

        range,
      ) =>
        safeCommand(async () => {
          if (!file) {
            file = await pickFile(ref);
          }

          await gitService.cherryPickLines(
            ref,

            file,

            range,
          );
        }),
    );

  /*
   * interactive
   */

  cp.command("interactive")

    .argument("<ref>")

    .argument("[file]")

    .action(
      (
        ref,

        file,
      ) =>
        safeCommand(async () => {
          if (!file) {
            file = await pickFile(ref);
          }

          await gitService.cherryPickInteractive(
            ref,

            file,
          );
        }),
    );
}
