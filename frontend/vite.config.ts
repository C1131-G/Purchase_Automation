import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure PWA PNG icons are in public/icons
const copyPwaIcons = () => {
  const sourcePath =
    "C:/Users/Administrator/.gemini/antigravity/brain/7fca5bc5-da8c-472e-8d44-3423dea37e72/vendor_portal_pwa_icon_1782100287329.png";
  const targetDir = path.join(__dirname, "public", "icons");

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, path.join(targetDir, "icon-512.png"));
      fs.copyFileSync(sourcePath, path.join(targetDir, "icon-192.png"));
    }
  } catch (error) {
    console.error("Failed to copy PWA icons:", error);
  }
};

copyPwaIcons();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
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
      "goey-toast",
      "clsx",
      "dayjs",
      "tailwind-merge",
    ],
  },
});
