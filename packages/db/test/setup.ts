import { afterAll, afterEach } from "vitest";

import { resetDatabase } from "./reset-database";
import { testDatabasePool } from "./test-database";

afterEach(async () => {
  await resetDatabase(testDatabasePool);
});

afterAll(async () => {
  await testDatabasePool.end();
});
