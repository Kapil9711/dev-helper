const path = require("path");
const postcss = require("postcss");
const tn = require("@tailwindcss/node");
const oxide = require("@tailwindcss/oxide");

module.exports = function tailwindV4Plugin() {
  console.log(">>> TAILWIND V4 PLUGIN INITIALIZED <<<");
  return {
    postcssPlugin: "tailwindcss-v4-local",
    async Once(root, { result }) {
      const filePath = result.opts.from;
      if (!filePath || !filePath.endsWith("globals.css")) {
        return;
      }

      const inputCss = root.toString();
      const compiled = await tn.compile(inputCss, {
        base: path.dirname(filePath),
        onDependency: (dep) => {
          result.messages.push({
            type: "dependency",
            plugin: "tailwindcss-v4-local",
            file: dep,
            parent: filePath,
          });
        },
      });

      const scanner = new oxide.Scanner({
        sources: [
          {
            base: path.resolve(__dirname),
            pattern: "**/*.{tsx,ts,jsx,js,html}",
            negated: false,
          },
        ],
      });

      const candidates = scanner.scan();
      const builtCss = compiled.build(candidates);

      const parsed = postcss.parse(builtCss, { from: filePath });
      root.removeAll();
      root.append(parsed.nodes);
    },
  };
};

module.exports.postcss = true;
