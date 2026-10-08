import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: { input: { index: resolve(__dirname, "index.html"), admin: resolve(__dirname, "admin.html") } }
  },
  server: { proxy: { "/api": "http://localhost:3100", "/uploads": "http://localhost:3100" } }
});
