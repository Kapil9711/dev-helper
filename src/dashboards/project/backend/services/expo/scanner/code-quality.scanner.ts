import { fileCollector } from "./file.scanner";

export type CodeQualityData = {
  score: number;

  todos: number;

  fixmes: number;

  anyTypes: number;

  tsIgnores: number;

  eslintDisables: number;

  magicNumbers: number;

  duplicateImports: number;

  longFunctions: number;

  nestedBlocks: number;

  findings: {
    severity: "LOW" | "MEDIUM" | "HIGH";

    title: string;

    description: string;

    file?: string;
  }[];
};

class CodeQualityScanner {
  scan(): CodeQualityData {
    const files = fileCollector.collect();

    const findings: any = [];

    let todos = 0;

    let fixmes = 0;

    let anyTypes = 0;

    let tsIgnores = 0;

    let eslintDisables = 0;

    let magicNumbers = 0;

    let duplicateImports = 0;

    let longFunctions = 0;

    let nestedBlocks = 0;

    for (const file of files) {
      const content = file.content;

      /*
       * TODO / FIXME
       */

      todos += (content.match(/TODO/gi) ?? []).length;

      fixmes += (content.match(/FIXME/gi) ?? []).length;

      /*
       * any
       */

      const anys = content.match(/:\s*any\b/g) ?? [];

      anyTypes += anys.length;

      /*
       * ts ignore
       */

      tsIgnores += (content.match(/@ts-ignore/g) ?? []).length;

      /*
       * eslint disable
       */

      eslintDisables += (content.match(/eslint-disable/g) ?? []).length;

      /*
       * duplicate imports
       */

      const imports = file.imports;

      const unique = new Set(imports);

      if (imports.length !== unique.size) {
        duplicateImports++;
      }

      /*
       * magic numbers
       */

      const numbers = content.match(/\b\d{2,}\b/g) ?? [];

      magicNumbers += numbers.length;

      /*
       * long functions
       */

      const functions =
        content.match(/function\s+\w+\s*\([\s\S]*?\{[\s\S]*?\}/g) ?? [];

      for (const fn of functions) {
        const lines = fn.split("\n").length;

        if (lines > 80) {
          longFunctions++;

          findings.push({
            severity: "MEDIUM",

            title: "Long function",

            description: `${lines} line function detected`,

            file: file.relativePath,
          });
        }
      }

      /*
       * nesting depth
       */

      const depth = (content.match(/\{/g) ?? []).length;

      if (depth > 40) {
        nestedBlocks++;

        findings.push({
          severity: "LOW",

          title: "High nesting",

          description: `Complex nesting detected (${depth})`,

          file: file.relativePath,
        });
      }
    }

    if (anyTypes > 20) {
      findings.push({
        severity: "MEDIUM",

        title: "Too many any types",

        description: `${anyTypes} any usages found`,
      });
    }

    if (tsIgnores > 10) {
      findings.push({
        severity: "HIGH",

        title: "Heavy ts-ignore usage",

        description: `${tsIgnores} suppressions detected`,
      });
    }

    const penalties =
      anyTypes * 0.5 +
      tsIgnores * 2 +
      eslintDisables * 1 +
      longFunctions * 2 +
      nestedBlocks +
      duplicateImports;

    const score = Math.max(0, Math.round(100 - penalties));

    return {
      score,

      todos,

      fixmes,

      anyTypes,

      tsIgnores,

      eslintDisables,

      magicNumbers,

      duplicateImports,

      longFunctions,

      nestedBlocks,

      findings,
    };
  }
}

export const codeQualityScanner = new CodeQualityScanner();
