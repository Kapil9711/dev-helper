import { search, confirm } from "@inquirer/prompts";

import { exec } from "../shell/exec";

export class UserCancelledError extends Error {
  constructor() {
    super("Selection cancelled");

    this.name = "UserCancelledError";
  }
}

export async function pickFile(ref: string) {
  const files = (
    await exec(
      `
git ls-tree \
-r \
${ref} \
--name-only
`,
      true,
    )
  )

    .split("\n")

    .filter(Boolean);

  const file = await search({
    message: "Search file",

    source: async (input = "") => {
      const query = input.toLowerCase();

      return files

        .filter((file) => file.toLowerCase().includes(query))

        .slice(
          0,

          50,
        )

        .map((file) => ({
          name: file,

          value: file,
        }));
    },
  });

  const accepted = await confirm({
    message: `Use "${file}" ?`,

    default: true,
  });

  if (!accepted) {
    throw new UserCancelledError();
  }

  return file;
}

export async function pickFolder(ref: string) {
  const folders = [
    ...new Set(
      (
        await exec(
          `
git ls-tree \
-r \
${ref} \
--name-only
`,
          true,
        )
      )

        .split("\n")

        .filter(Boolean)

        .map((file) =>
          file
            .split("/")
            .slice(
              0,

              -1,
            )
            .join("/"),
        )

        .filter(Boolean),
    ),
  ];

  const folder = await search({
    message: "Search folder",

    source: async (input = "") => {
      const query = input.toLowerCase();

      return folders

        .filter((folder) => folder.toLowerCase().includes(query))

        .slice(
          0,

          50,
        )

        .map((folder) => ({
          name: folder,

          value: folder,
        }));
    },
  });

  const accepted = await confirm({
    message: `Use "${folder}" ?`,

    default: true,
  });

  if (!accepted) {
    throw new UserCancelledError();
  }

  return folder;
}
