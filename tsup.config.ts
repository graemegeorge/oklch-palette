import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    splitting: false,
    sourcemap: true,
    dts: true,
    clean: true,
    target: "es2022",
    outDir: "dist",
  },
  {
    entry: ["src/tw/preset.ts"],
    format: ["esm"],
    splitting: false,
    sourcemap: true,
    dts: true,
    clean: false,
    target: "es2022",
    outDir: "dist/tw",
  },
]);
