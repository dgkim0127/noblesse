export const runtimeRoleName = "noblesse_staging_runtime_role";
export const runtimeDatabaseName = "noblesse_staging";
export const runtimeSchemaName = "public";
export const migrationLedgerTable = "app_schema_migrations";

export const runtimePrivilegeManifest = Object.freeze({
  users: ["SELECT", "INSERT", "UPDATE"],
  buyers: ["SELECT", "INSERT", "UPDATE"],
  buyer_agreements: ["SELECT", "INSERT"],
  terms_versions: ["SELECT"],
  categories: ["SELECT", "INSERT", "UPDATE"],
  products: ["SELECT", "INSERT", "UPDATE"],
  product_prices: ["SELECT", "INSERT", "UPDATE"],
  product_price_policies: ["SELECT", "INSERT", "UPDATE"],
  fx_rate_snapshots: ["SELECT", "INSERT", "UPDATE"],
  fx_auto_price_runs: ["SELECT", "INSERT", "UPDATE"],
  fx_auto_price_events: ["SELECT", "INSERT"],
  collections: [],
  product_collections: [],
  home_showcase_slides: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  inquiries: ["SELECT", "INSERT", "UPDATE"],
  inquiry_items: ["SELECT", "INSERT"],
  admin_quotes: ["SELECT", "INSERT", "UPDATE"],
  admin_quote_items: ["SELECT", "INSERT", "UPDATE"],
  admin_quote_documents: ["SELECT", "INSERT"],
  admin_quote_status_history: ["SELECT", "INSERT"],
  banners: [],
  catalog_files: [],
  audit_logs: ["SELECT", "INSERT"],
  admin_profiles: ["SELECT", "UPDATE"],
  admin_permission_overrides: ["SELECT", "INSERT", "UPDATE", "DELETE"]
});

export const allowedRuntimePrivileges = Object.freeze([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE"
]);

const forbiddenPrivilegePattern =
  /\b(ALL\s+PRIVILEGES|ALL\s+TABLES|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN)\b/i;

const querySourceModules = Object.freeze([
  "catalogQueries.js",
  "buyerQueries.js",
  "buyerRegistrationQueries.js",
  "buyerInquiryQueries.js",
  "buyerQuoteQueries.js",
  "adminAccessQueries.js",
  "adminDashboardQueries.js",
  "adminBuyerQueries.js",
  "adminCategoryQueries.js",
  "adminInquiryQueries.js",
  "adminFxQueries.js",
  "adminPriceQueries.js",
  "adminProductQueries.js",
  "adminQuoteQueries.js",
  "homeShowcaseQueries.js"
]);

export function getRuntimePrivilegeEntries() {
  return Object.entries(runtimePrivilegeManifest).map(([tableName, privileges]) => ({
    tableName,
    privileges: [...privileges]
  }));
}

export function validateRuntimePrivilegeManifest(manifest = runtimePrivilegeManifest) {
  const failures = [];

  if (Object.hasOwn(manifest, migrationLedgerTable)) {
    failures.push("manifest includes migration ledger");
  }

  for (const [tableName, privileges] of Object.entries(manifest)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
      failures.push(`unsafe table identifier: ${tableName}`);
    }
    for (const privilege of privileges) {
      if (!allowedRuntimePrivileges.includes(privilege)) {
        failures.push(`unsupported privilege: ${tableName}.${privilege}`);
      }
      if (forbiddenPrivilegePattern.test(privilege)) {
        failures.push(`forbidden privilege: ${tableName}.${privilege}`);
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures
  };
}

export function extractReferencedTablesFromQuerySource(sourceText) {
  const tables = new Set();
  const pattern =
    /\b(?:from|join|into|update|delete\s+from)\s+(?:public\.)?([a-z_][a-z0-9_]*)\b/gi;
  let match = pattern.exec(sourceText);
  while (match) {
    const nextToken = sourceText.slice(pattern.lastIndex).trimStart();
    const isTableFunction = nextToken.startsWith("(");
    if (!isTableFunction && match[1] !== "set" && match[1] !== "lateral" && match[1] !== "of") {
      tables.add(match[1]);
    }
    match = pattern.exec(sourceText);
  }
  return [...tables].sort();
}

export function detectDeleteTablesFromQuerySource(sourceText) {
  const tables = new Set();
  const pattern = /\bdelete\s+from\s+(?:public\.)?([a-z_][a-z0-9_]*)\b/gi;
  let match = pattern.exec(sourceText);
  while (match) {
    tables.add(match[1]);
    match = pattern.exec(sourceText);
  }
  return [...tables].sort();
}

export function getRuntimeQuerySourceModules() {
  return [...querySourceModules];
}
