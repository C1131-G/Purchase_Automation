import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure PWA PNG icons directory exists in public/icons
const ensurePwaIconsDir = () => {
  const targetDir = path.join(__dirname, "public", "icons");
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create PWA icons directory:", error);
  }
};

ensurePwaIconsDir();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
      codeSplittingOptions: {
        // Keep protected route loaders and their query dependencies out of the
        // public login entry bundle. They load only when their route is visited.
        defaultBehavior: [
          ["loader"],
          ["component"],
          ["pendingComponent"],
          ["errorComponent"],
          ["notFoundComponent"],
        ],
      },
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePattern: "^_require-active-session\\.ts$",
      routesDirectory: "./src/routes",
    }),
    react(),
    babel({
      include: /src\/.*\.[jt]sx?$/,
      exclude: [/node_modules/, /routeTree\.gen\.ts$/],
      presets: [reactCompilerPreset({ target: "19" })],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/routeTree.gen.ts"],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "zustand",
      "lucide-react",
      "recharts",
      "motion",
      "clsx",
      "dayjs",
      "tailwind-merge",
    ],
  },
});
