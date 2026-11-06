import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    fileParallelism: false,
    include: ["test/**/*.test.ts"],
    name: "@univault/auth",
    setupFiles: ["@univault/db/test/setup"],
  },
});
