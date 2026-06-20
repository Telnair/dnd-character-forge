import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The 2024 PHB dataset + zod schemas live in the sibling `dnd2024`
      // project; we import its JSON and inferred types directly (no copy).
      "@2024": path.resolve(__dirname, "../dnd2024"),
    },
  },
  server: {
    port: 5173,
    open: false,
    fs: {
      // Allow the dev server to read the sibling `dnd2024` project.
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
