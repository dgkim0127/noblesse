import pg from "pg";

const { Pool } = pg;

function requireSupportedMode(env) {
  if (env.dbConnectionMode !== "tcp" && env.dbConnectionMode !== "cloudsql-socket") {
    throw new Error("Invalid DB connection mode.");
  }
}

function parseDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      host: url.hostname,
      password: decodeURIComponent(url.password),
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username)
    };
  } catch {
    throw new Error("Invalid database URL configuration.");
  }
}

function buildSharedPoolOptions(env) {
  return {
    connectionTimeoutMillis: env.dbConnectionTimeoutMs,
    idleTimeoutMillis: env.dbIdleTimeoutMs,
    max: env.dbPoolMax
  };
}

export function buildPoolConfig(env) {
  if (!env.databaseUrl) {
    if (env.isProduction && !env.allowHealthOnlyStartup) {
      throw new Error("DATABASE_URL is required for the backend server in production.");
    }
    return null;
  }

  requireSupportedMode(env);

  if (env.dbConnectionMode === "cloudsql-socket") {
    if (!env.cloudSqlInstanceConnectionName) {
      throw new Error("CLOUD_SQL_INSTANCE_CONNECTION_NAME is required for Cloud SQL socket mode.");
    }
    const parsed = parseDatabaseUrl(env.databaseUrl);
    if (!parsed.database || !parsed.user) {
      throw new Error("Database URL must include database and user for Cloud SQL socket mode.");
    }

    return {
      ...buildSharedPoolOptions(env),
      database: parsed.database,
      host: `/cloudsql/${env.cloudSqlInstanceConnectionName}`,
      password: parsed.password,
      port: parsed.port,
      user: parsed.user
    };
  }

  return {
    ...buildSharedPoolOptions(env),
    connectionString: env.databaseUrl,
    ssl: env.isProduction ? { rejectUnauthorized: false } : undefined
  };
}

export function createPool(env) {
  const poolConfig = buildPoolConfig(env);
  if (!poolConfig) return null;

  return new Pool({
    ...poolConfig
  });
}
