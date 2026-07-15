import { defineConfig } from "oxlint";

export default defineConfig({
  ignorePatterns: [
    "node_modules/**",
    ".pnpm-store/**",
    "frontend/dist/**",
    "hana-backend/dist/**",
    "sql-backend/dist/**",
    "frontend/src/routeTree.gen.ts",
  ],
  overrides: [
    {
      // Descriptive identifiers in API backends (AGENTS.md).
      // min 3 chars; allow loop/coord/unused and ubiquitous id/db only.
      files: ["hana-backend/src/**/*.ts", "sql-backend/src/**/*.ts"],
      rules: {
        "id-length": [
          "error",
          {
            min: 3,
            exceptions: ["_", "i", "j", "k", "x", "y", "z", "id", "db"],
            checkGeneric: false,
            properties: "never",
          },
        ],
      },
    },
  ],
});
