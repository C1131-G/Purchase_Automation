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
    // Offline CI: importing app may emit async HANA pipe errors; unit/integration do not require live HANA.
    dangerouslyIgnoreUnhandledErrors: true,
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
        "src/services/discount-calc.ts",
        "src/services/docnum-lookup.ts",
        "src/services/sap-line-normalize.ts",
        "src/services/base-qty-validation.ts",
        "src/services/currency-format.ts",
      ],
    },
  },
});
