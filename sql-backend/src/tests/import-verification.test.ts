import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const srcDir = join(__dirname, "..", "..");

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = join(dirPath, file);

    if (statSync(fullPath).isDirectory()) {
      if (file === "node_modules" || file === "tests" || file === "migrations" || file === "meta") {
        return;
      }
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (
        file.endsWith(".ts") &&
        !file.endsWith(".d.ts") &&
        !file.includes(".test.") &&
        !file.includes(".spec.")
      ) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

describe("Project Import Integrity", () => {
  const files = getAllFiles(srcDir);

  files.forEach((file) => {
    const relativePath = relative(srcDir, file);

    if (
      relativePath === "server.ts" ||
      relativePath === "db/seed.ts" ||
      relativePath === "db/migrate.ts"
    ) {
      return;
    }

    it(`import module "${relativePath}"`, { timeout: 30_000 }, async () => {
      const normalizedPath = `../${relativePath.replaceAll("\\", "/")}`;
      const module = await import(normalizedPath);
      expect(module).toBeDefined();
    });
  });
});
