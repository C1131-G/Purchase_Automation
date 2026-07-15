import "@/config/zod";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const srcDir = join(__dirname, "..", "..", "src");

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      // Skip node_modules or other non-src dirs if they somehow get included
      if (file === "tests") {
        return;
      }
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      // Only check .ts files, exclude type definitions and tests themselves
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

    // Skip entry points or files with massive side effects if necessary
    // server.ts starts the HTTP listener, we don't want that in a test
    if (relativePath === "server.ts") {
      return;
    }

    it(`Success: import module "${relativePath}"`, { timeout: 30_000 }, async () => {
      // Convert backslashes to forward slashes for import
      const normalizedPath = `@/${relativePath.replaceAll("\\", "/")}`;
      const module = await import(normalizedPath);
      expect(module).toBeDefined();
    });
  });
});
