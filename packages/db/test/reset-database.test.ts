import { describe, expect, it } from "vitest";

import { resetDatabase } from "./reset-database";
import { testDatabasePool } from "./test-database";

describe("resetDatabase", () => {
  it("clears rows from application tables while keeping their schema", async () => {
    await testDatabasePool.query(
      "CREATE TABLE IF NOT EXISTS test_reset_probe (id integer PRIMARY KEY, value text NOT NULL)"
    );
    await testDatabasePool.query(
      "INSERT INTO test_reset_probe (id, value) VALUES (1, 'before')"
    );

    await resetDatabase(testDatabasePool);

    const result = await testDatabasePool.query(
      "SELECT * FROM test_reset_probe"
    );
    expect(result.rows).toEqual([]);
  });
});
