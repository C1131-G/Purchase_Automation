require("esbuild")
  .buildSync({
    entryPoints: ["index.js"],
    bundle: true,
    minify: true,
    platform: "node",
    external: ["./node_modules/@mapbox/*", "./node_modules/@sap/*"],
    loader: { ".png": "file" },
    outfile: "build_node/index.js",
  })
  .then(() => console.log("Done"))
  .catch(() => process.exit(1));
