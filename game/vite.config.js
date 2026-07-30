import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 8104,
    strictPort: true,
    allowedHosts: ["test5.qif.us"],
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  },
});
