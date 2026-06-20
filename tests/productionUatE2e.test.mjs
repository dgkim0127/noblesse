import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionUatEnv } from "../scripts/productionUatE2e.mjs";

function validEnv(overrides = {}) {
  return {
    NOBLESSE_PRODUCTION_UAT_ALLOW: "YES",
    VITE_API_BASE_URL: "https://noblesse.web.app/api",
    VITE_FIREBASE_API_KEY: "public-test-key",
    NOBLESSE_PROD_UAT_BUYER_EMAIL: "buyer@example.test",
    NOBLESSE_PROD_UAT_BUYER_PASSWORD: "buyer-password",
    NOBLESSE_PROD_UAT_ADMIN_EMAIL: "admin@example.test",
    NOBLESSE_PROD_UAT_ADMIN_PASSWORD: "admin-password",
    ...overrides
  };
}

test("production UAT env validation fails closed when required env is missing", () => {
  assert.throws(
    () => validateProductionUatEnv(validEnv({ NOBLESSE_PRODUCTION_UAT_ALLOW: "" })),
    /Missing required env/
  );
});

test("production UAT env validation requires explicit allow flag", () => {
  assert.throws(
    () => validateProductionUatEnv(validEnv({ NOBLESSE_PRODUCTION_UAT_ALLOW: "NO" })),
    /must be YES/
  );
});

test("production UAT env validation requires exact production API URL", () => {
  assert.throws(
    () => validateProductionUatEnv(validEnv({ VITE_API_BASE_URL: "https://example.com/api" })),
    /exactly https:\/\/noblesse\.web\.app\/api/
  );
});

test("production UAT env validation rejects staging API URLs", () => {
  assert.throws(
    () => validateProductionUatEnv(validEnv({ VITE_API_BASE_URL: "https://staging-api.example.internal/api" })),
    /exactly https:\/\/noblesse\.web\.app\/api/
  );
});

test("production UAT env validation normalizes the production API URL", () => {
  const config = validateProductionUatEnv(validEnv({ VITE_API_BASE_URL: "https://noblesse.web.app/api/" }));

  assert.equal(config.apiBaseUrl, "https://noblesse.web.app/api");
  assert.equal(config.firebaseApiKey, "public-test-key");
  assert.equal(config.buyerEmail, "buyer@example.test");
  assert.equal(config.adminEmail, "admin@example.test");
});
