import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "example",
  plugins: [react()],
  server: { port: 5175, open: true },
  resolve: {
    alias: {
      "oklch-palette": new URL("../src/index.ts", import.meta.url).pathname,
      "oklch-palette/tailwind": new URL("../src/tw/preset.ts", import.meta.url)
        .pathname,
    },
  },
  build: {
    outDir: "dist-example",
  },
});
