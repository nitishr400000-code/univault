import "varlock/auto-load";

export default {
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema/*.ts",
  schemaFilter: ["public"],
};
