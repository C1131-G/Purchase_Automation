import "@/config/zod";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const srcDir = join(__dirname, "..");

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      if (file === "tests") {
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

    if (relativePath === "server.ts") {
      return;
    }

    it(`Success: import module "${relativePath}"`, async () => {
      try {
        const normalizedPath = `../${relativePath.replaceAll("\\", "/")}`;
        const module = await import(normalizedPath);
        expect(module).toBeDefined();
      } catch (error) {
        console.error(`Failed to import ${relativePath}:`, error);
        throw error;
      }
    });
  });
});
