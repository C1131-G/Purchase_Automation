import "@/config/zod";

import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = join(__dirname, "..");

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      // Skip node_modules or other non-src dirs if they somehow get included
      if (file === "tests") return;
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
    if (relativePath === "server.ts") return;

    it(`Success: import module "${relativePath}"`, async () => {
      try {
        // Convert backslashes to forward slashes for import
        const normalizedPath = `../${relativePath.replace(/\\/g, "/")}`;
        const module = await import(normalizedPath);
        expect(module).toBeDefined();
      } catch (error) {
        console.error(`Failed to import ${relativePath}:`, error);
        throw error;
      }
    });
  });
});
