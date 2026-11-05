import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ".agents/skills/**",
    ".claude/skills/**",
    "packages/ui/src/components/**",
  ],
});
