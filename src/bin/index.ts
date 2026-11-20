#!/usr/bin/env node

const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 20) {
  console.error(
    `\x1b[31mError: VH DevTools requires Node.js 20 or higher. You are currently running Node.js ${process.version}.\x1b[0m\n`
  );
  process.exit(1);
}

import app from "../app.tsx";
app.initialiazeCommandar();
