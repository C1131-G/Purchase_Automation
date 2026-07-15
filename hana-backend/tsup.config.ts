import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/core/observability/register.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
  // By default, tsup excludes node_modules from the bundle, which is what we want for a backend app.
  // We only bundle our own source code. Keep OTel + pretty out of the bundle for dynamic requires.
  external: ["pino-pretty", /^@opentelemetry\//],
  splitting: false,
  dts: false, // We don't need type definitions for the runtime
  treeshake: true,
});
