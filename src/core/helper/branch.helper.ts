import { search, confirm } from "@inquirer/prompts";

import { exec } from "../shell/exec";

import { UserCancelledError } from "./prompts.helper";

export async function pickBranch() {
  const branches = (await exec("git branch --format='%(refname:short)'", true))

    .split("\n")

    .filter(Boolean)

    .filter((value, index, arr) => arr.indexOf(value) === index)

    .sort();

  const branch = await search({
    message: "Search branch",

    source: async (input = "") => {
      const query = input.toLowerCase();

      return branches

        .filter((branch) => branch.toLowerCase().includes(query))

        .slice(
          0,

          30,
        )

        .map((branch) => ({
          name: branch,

          value: branch,
        }));
    },
  });

  const accepted = await confirm({
    message: `Use "${branch}" ?`,

    default: true,
  });

  if (!accepted) {
    throw new UserCancelledError();
  }

  return branch;
}
