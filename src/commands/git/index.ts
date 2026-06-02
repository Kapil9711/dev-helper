import { Command } from "commander";

import { gplCommand } from "./gpl.command";
import { gphCommand } from "./gph.command";
import { gaCommand } from "./ga.command";
import { gcmCommand } from "./gcm.command";
import { gsCommand } from "./gs.command";
import { gcoCommand } from "./gco.command";
import { gcobCommand } from "./gcob.command";
import { bgCommand } from "./bg.command";
import { grCommand } from "./gr.command";
import { gpuCommand } from "./gpu.command";
import { gphoCommand } from "./gpho.command";
import { gploCommand } from "./gplo.command";

export function registerGitCommands(program: Command) {
  const git = program.command("git").description("Git utilities");
  gplCommand(git);
  gphCommand(git);
  gaCommand(git);
  gcmCommand(git);
  gsCommand(git);
  gcoCommand(git);
  gcobCommand(git);
  bgCommand(git);
  grCommand(git);
  gpuCommand(git);
  gphoCommand(git);
  gploCommand(git);
}
