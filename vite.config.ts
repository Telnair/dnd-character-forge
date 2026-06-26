import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    fs: {
      // The `dnd-2024` dependency is a github dep, but in local dev it's
      // `bun link`-ed so node_modules/dnd-2024 symlinks to the sibling
      // `../dnd2024` checkout. Vite resolves the symlink's real path, which
      // lives outside the project root, so allow reading the parent dir.
    },
    port: 5173,
    open: false,
  },
});
