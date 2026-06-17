export function parseAllowedOrigins(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getEnv(source = process.env) {
  const nodeEnv = source.NODE_ENV || "development";

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: Number(source.PORT || 8080),
    databaseUrl: source.DATABASE_URL || "",
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
  if (!env.firebaseProjectId) missing.push("FIREBASE_PROJECT_ID");
  if (!env.firebaseClientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!env.firebasePrivateKey) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required server configuration: ${missing.join(", ")}`);
  }
}
