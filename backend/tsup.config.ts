import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
  // By default, tsup excludes node_modules from the bundle, which is what we want for a backend app.
  // We only bundle our own source code.
  splitting: false,
  dts: false, // We don't need type definitions for the runtime
  treeshake: true,
});
