import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "browser/index": "src/browser/index.ts",
    "node/index": "src/node/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "es2022",
});
