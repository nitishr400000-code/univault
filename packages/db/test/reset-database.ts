import type { Pool } from "pg";

export const resetDatabase = async (pool: Pool) => {
  const { rows } = await pool.query<{ database_name: string }>(
    "SELECT current_database() AS database_name"
  );
  const databaseName = rows[0]?.database_name;
  if (!databaseName?.endsWith("_test")) {
    throw new Error(
      `Refusing to reset non-test database: ${databaseName ?? "unknown"}`
    );
  }

  const { rows: tables } = await pool.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
  );
  if (tables.length === 0) {
    return;
  }

  const tableNames = tables
    .map(({ tablename }) => `public."${tablename.replaceAll('"', '""')}"`)
    .join(", ");
  await pool.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
};
