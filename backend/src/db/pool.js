import pg from "pg";

const { Pool } = pg;

export function createPool(env) {
  if (!env.databaseUrl) {
    if (env.isProduction && !env.allowHealthOnlyStartup) {
      throw new Error("DATABASE_URL is required for the backend server in production.");
    }
    return null;
  }

  return new Pool({
    connectionString: env.databaseUrl,
    ssl: env.isProduction ? { rejectUnauthorized: false } : undefined
  });
}
