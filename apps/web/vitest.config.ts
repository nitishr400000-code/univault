import { fileURLToPath } from "node:url";

import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    name: "web",
  },
});
