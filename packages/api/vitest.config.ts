import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    name: "@univault/api",
    setupFiles: ["@univault/db/test/setup"],
  },
});
