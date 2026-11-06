import { Pool } from "pg";

export const testDatabasePool = new Pool({
  connectionString:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});
