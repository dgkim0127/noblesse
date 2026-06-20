export function parseAllowedOrigins(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedDbConnectionModes = new Set(["tcp", "cloudsql-socket"]);

function parseDbConnectionMode(value) {
  const mode = value || "tcp";
  if (!allowedDbConnectionModes.has(mode)) {
    throw new Error("Invalid DB_CONNECTION_MODE. Use tcp or cloudsql-socket.");
  }
  return mode;
}

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}. Use a positive integer.`);
  }
  return parsed;
}

export function getEnv(source = process.env) {
  const nodeEnv = source.NODE_ENV || "development";

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: Number(source.PORT || 8080),
    databaseUrl: source.DATABASE_URL || "",
    dbConnectionMode: parseDbConnectionMode(source.DB_CONNECTION_MODE),
    cloudSqlInstanceConnectionName: source.CLOUD_SQL_INSTANCE_CONNECTION_NAME || "",
    dbPoolMax: parsePositiveInteger(source.DB_POOL_MAX, 5, "DB_POOL_MAX"),
    dbConnectionTimeoutMs: parsePositiveInteger(
      source.DB_CONNECTION_TIMEOUT_MS,
      5000,
      "DB_CONNECTION_TIMEOUT_MS"
    ),
    dbIdleTimeoutMs: parsePositiveInteger(
      source.DB_IDLE_TIMEOUT_MS,
      30000,
      "DB_IDLE_TIMEOUT_MS"
    ),
    firebaseProjectId: source.FIREBASE_PROJECT_ID || "",
    firebaseClientEmail: source.FIREBASE_CLIENT_EMAIL || "",
    firebasePrivateKey: source.FIREBASE_PRIVATE_KEY || "",
    allowHealthOnlyStartup: source.ALLOW_HEALTH_ONLY_STARTUP === "true",
    allowedOrigins: parseAllowedOrigins(source.ALLOWED_ORIGINS),
    logLevel: source.LOG_LEVEL || "info"
  };
}

export function assertProductionConfig(env) {
  if (!env.isProduction) return;
  if (env.allowHealthOnlyStartup) return;

  const missing = [];
  if (!env.databaseUrl) missing.push("DATABASE_URL");
  if (env.dbConnectionMode === "cloudsql-socket" && !env.cloudSqlInstanceConnectionName) {
    missing.push("CLOUD_SQL_INSTANCE_CONNECTION_NAME");
  }
  if (!env.firebaseProjectId) missing.push("FIREBASE_PROJECT_ID");
  const hasExplicitFirebaseCredentials = env.firebaseClientEmail && env.firebasePrivateKey;
  const hasApplicationDefaultCredentials = env.firebaseProjectId;
  if (!hasExplicitFirebaseCredentials && !hasApplicationDefaultCredentials) {
    missing.push("FIREBASE_CLIENT_EMAIL or Cloud Run ADC");
    missing.push("FIREBASE_PRIVATE_KEY or Cloud Run ADC");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required server configuration: ${missing.join(", ")}`);
  }
}
