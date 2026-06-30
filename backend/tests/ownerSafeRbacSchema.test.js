import assert from "node:assert/strict";
import test from "node:test";
import {
  createOwnerSafeRbacSchemaQueries,
  getOwnerSafeRbacBootstrapMetadata
} from "../src/db/queries/ownerSafeRbacSchemaQueries.js";
import {
  createOwnerSafeRbacSchemaService,
  validateOwnerSafeRbacSchemaEnv
} from "../src/services/ownerSafeRbacSchemaService.js";

function productionSource(overrides = {}) {
  return {
    NOBLESSE_OWNER_SAFE_RBAC_BOOTSTRAP_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "production",
    ...overrides
  };
}

test("owner-safe RBAC env rejects missing allow flag", () => {
  assert.deepEqual(validateOwnerSafeRbacSchemaEnv({}), {
    ok: false,
    category: "BOOTSTRAP_NOT_ALLOWED"
  });
});

test("owner-safe RBAC env rejects non-production runtime", () => {
  assert.deepEqual(
    validateOwnerSafeRbacSchemaEnv(productionSource({ NOBLESSE_RUNTIME_ENV: "staging" })),
    { ok: false, category: "NON_PRODUCTION_RUNTIME" }
  );
});

test("owner-safe RBAC env rejects secret-shaped input", () => {
  assert.deepEqual(
    validateOwnerSafeRbacSchemaEnv(productionSource({ TARGET_PASSWORD: "blocked" })),
    { ok: false, category: "UNSAFE_INPUT_REJECTED" }
  );
});

test("owner-safe service returns sanitized aggregate result", async () => {
  const service = createOwnerSafeRbacSchemaService({
    source: productionSource(),
    queries: {
      async applyOwnerSafeBootstrap() {
        return {
          ok: true,
          category: "OWNER_SAFE_RBAC_SCHEMA_BOOTSTRAP_COMPLETE",
          alreadyApplied: false,
          userLifecycleBackfillCount: 2,
          buyerVerificationBackfillCount: 1,
          adminProfileCount: 0,
          permissionOverrideCount: 0,
          ownerCount: 0,
          productCount: 0,
          categoryCount: 0,
          priceBookCount: 0,
          buyerApprovalUnchanged: true,
          productCatalogUnchanged: true,
          transactionCommitted: true,
          email: "never@example.test",
          authUid: "uid-never"
        };
      }
    }
  });

  const result = await service.applyBootstrap();

  assert.equal(result.ok, true);
  assert.equal(result.ownerCount, 0);
  assert.equal(result.userLifecycleBackfillCount, 2);
  assert.doesNotMatch(JSON.stringify(result), /never@example|uid-never|password|token/i);
});

function createFakePool({
  existingBootstrapChecksum = null,
  ownerCountBefore = 0,
  ownerCountAfter = 0,
  productCountBefore = 0,
  productCountAfter = 0,
  categoryCountBefore = 0,
  categoryCountAfter = 0,
  priceBookCountBefore = 0,
  priceBookCountAfter = 0,
  buyerApprovedBefore = 0,
  buyerApprovedAfter = 0,
  failOn = ""
} = {}) {
  const calls = [];
  let releaseCount = 0;
  const counts = {
    products: [productCountBefore, productCountAfter],
    categories: [categoryCountBefore, categoryCountAfter],
    product_prices: [priceBookCountBefore, priceBookCountAfter],
    admin_profiles: [0, 0],
    admin_permission_overrides: [0, 0]
  };

  function nextCount(tableName) {
    const values = counts[tableName] || [0, 0];
    const index = calls.filter((call) => call.kind === `count:${tableName}`).length;
    calls.push({ kind: `count:${tableName}` });
    return values[Math.min(index, values.length - 1)];
  }

  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase().replace(/\s+/g, " ");
      calls.push({ sql: text, params });
      if (failOn && normalized.includes(failOn)) throw new Error("fake owner-safe failure");
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.startsWith("select to_regclass")) {
        return { rows: [{ table_name: String(params[0] || "").replace("public.", "") }] };
      }
      if (normalized.startsWith("select count(*)::int as count from public.products")) {
        return { rows: [{ count: nextCount("products") }] };
      }
      if (normalized.startsWith("select count(*)::int as count from public.categories")) {
        return { rows: [{ count: nextCount("categories") }] };
      }
      if (normalized.startsWith("select count(*)::int as count from public.product_prices")) {
        return { rows: [{ count: nextCount("product_prices") }] };
      }
      if (normalized.startsWith("select count(*)::int as count from public.admin_permission_overrides")) {
        return { rows: [{ count: nextCount("admin_permission_overrides") }] };
      }
      if (normalized.startsWith("select count(*)::int as count from public.admin_profiles")) {
        return { rows: [{ count: nextCount("admin_profiles") }] };
      }
      if (normalized.includes("from public.users u join public.admin_profiles ap")) {
        const ownerIndex = calls.filter((call) => call.kind === "owner-count").length;
        calls.push({ kind: "owner-count" });
        return { rows: [{ count: ownerIndex === 0 ? ownerCountBefore : ownerCountAfter }] };
      }
      if (normalized.includes("from public.buyers b join public.users u")) {
        return { rows: [{ count: buyerApprovedBefore }] };
      }
      if (normalized.includes("from public.buyers where verification_status = 'approved'")) {
        return { rows: [{ count: buyerApprovedAfter }] };
      }
      if (normalized.includes("from public.app_schema_migrations")) {
        return existingBootstrapChecksum ? { rows: [{ checksum: existingBootstrapChecksum }] } : { rows: [] };
      }
      if (normalized.startsWith("update public.users")) return { rowCount: 2, rows: [] };
      if (normalized.startsWith("update public.buyers b set verification_status")) {
        return { rowCount: 3, rows: [] };
      }
      if (normalized.startsWith("update public.buyers b set submitted_at")) {
        return { rowCount: 4, rows: [] };
      }
      if (normalized.startsWith("update public.buyers b set reviewed_at")) {
        return { rowCount: 5, rows: [] };
      }
      return { rows: [] };
    },
    release() {
      releaseCount += 1;
    }
  };

  return {
    calls,
    get releaseCount() {
      return releaseCount;
    },
    pool: {
      async connect() {
        return client;
      }
    }
  };
}

function sqlTexts(fake) {
  return fake.calls.map((call) => String(call.sql || "").toLowerCase());
}

test("owner-safe bootstrap creates RBAC schema without owner or permission override rows", async () => {
  const fake = createFakePool();

  const result = await createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap();
  const texts = sqlTexts(fake);

  assert.equal(result.ok, true);
  assert.equal(result.category, "OWNER_SAFE_RBAC_SCHEMA_BOOTSTRAP_COMPLETE");
  assert.equal(result.ownerCount, 0);
  assert.equal(result.adminProfileCount, 0);
  assert.equal(result.permissionOverrideCount, 0);
  assert.equal(result.productCatalogUnchanged, true);
  assert.equal(result.buyerApprovalUnchanged, true);
  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_profiles")), false);
  assert.equal(texts.some((text) => text.includes("then 'owner'")), false);
  assert.equal(texts.some((text) => text.includes("permission_key") && text.includes("catalog.write")), false);
  assert.equal(fake.releaseCount, 1);
});

test("owner-safe bootstrap is idempotent when matching bootstrap ledger exists", async () => {
  const metadata = getOwnerSafeRbacBootstrapMetadata();
  const fake = createFakePool({ existingBootstrapChecksum: metadata.checksum });

  const result = await createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap();

  assert.equal(result.ok, true);
  assert.equal(result.alreadyApplied, true);
  assert.equal(result.ownerCount, 0);
  assert.equal(sqlTexts(fake).includes("commit"), true);
});

test("owner-safe bootstrap fails closed when bootstrap ledger checksum differs", async () => {
  const fake = createFakePool({ existingBootstrapChecksum: "0".repeat(64) });

  const result = await createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "OWNER_SAFE_BOOTSTRAP_CHECKSUM_MISMATCH");
  assert.equal(sqlTexts(fake).includes("rollback"), true);
});

test("owner-safe bootstrap stops if an owner already exists before bootstrap", async () => {
  const fake = createFakePool({ ownerCountBefore: 1 });

  const result = await createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "OWNER_ALREADY_EXISTS_BEFORE_BOOTSTRAP");
  assert.equal(sqlTexts(fake).includes("rollback"), true);
});

test("owner-safe bootstrap rolls back if owner appears during bootstrap", async () => {
  const fake = createFakePool({ ownerCountAfter: 1 });

  const result = await createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "UNEXPECTED_OWNER_CREATED");
  assert.equal(sqlTexts(fake).includes("rollback"), true);
});

test("owner-safe bootstrap rolls back if product data changes", async () => {
  const fake = createFakePool({ productCountAfter: 1 });

  const result = await createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "UNEXPECTED_PRODUCT_MUTATION");
  assert.equal(sqlTexts(fake).includes("rollback"), true);
});

test("owner-safe bootstrap rolls back on query failure", async () => {
  const fake = createFakePool({ failOn: "create table if not exists public.admin_profiles" });

  await assert.rejects(
    () => createOwnerSafeRbacSchemaQueries(fake.pool).applyOwnerSafeBootstrap(),
    /fake owner-safe failure/
  );
  assert.equal(sqlTexts(fake).includes("rollback"), true);
  assert.equal(fake.releaseCount, 1);
});
