import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15_000,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/modules/purchase-*/**",
        "src/modules/sales-*/**",
        "src/modules/ap-*/**",
        "src/modules/ar-*/**",
        "src/modules/grpo/**",
        "src/modules/*-payment/**",
        "src/core/utils/**",
      ],
    },
  },
});
