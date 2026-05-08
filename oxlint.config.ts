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
});
