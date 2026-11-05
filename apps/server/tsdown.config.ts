import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@univault\/.*/u],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
