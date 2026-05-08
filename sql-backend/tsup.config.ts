import { defineConfig } from "tsup";

export default defineConfig({
  dts: false,
  entry: ["src/server.ts"],
  esbuildOptions: (options) => {
    options.platform = "node";
    options.external = ["bcrypt"];
  },
  external: ["bcrypt"],
  format: ["esm"],
  outDir: "dist",
  sourcemap: true,
  splitting: false,
  target: "node20",
});
