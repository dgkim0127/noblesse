import assert from "node:assert/strict";
import test from "node:test";
import { validateStagingRcEnv } from "../scripts/stagingRcE2e.mjs";

function validEnv(overrides = {}) {
  return {
    NOBLESSE_STAGING_E2E_ALLOW: "YES",
    VITE_API_BASE_URL: "https://staging-api.example.internal/api",
    VITE_FIREBASE_API_KEY: "public-test-key",
    NOBLESSE_STAGING_BUYER_EMAIL: "buyer@example.test",
    NOBLESSE_STAGING_BUYER_PASSWORD: "redacted-buyer-credential",
    NOBLESSE_STAGING_ADMIN_EMAIL: "admin@example.test",
    NOBLESSE_STAGING_ADMIN_PASSWORD: "redacted-admin-credential",
    ...overrides,
  };
}

test("staging RC env validation fails closed when required env is missing", () => {
  assert.throws(
    () => validateStagingRcEnv({}),
    /Missing required env/
  );
});

test("staging RC env validation requires explicit allow flag", () => {
  assert.throws(
    () => validateStagingRcEnv(validEnv({ NOBLESSE_STAGING_E2E_ALLOW: "NO" })),
    /must be YES/
  );
});

test("staging RC env validation rejects production-looking API URLs", () => {
  assert.throws(
    () => validateStagingRcEnv(validEnv({ VITE_API_BASE_URL: "https://noblesse.web.app/api" })),
    /does not look like a staging API URL/
  );
});

test("staging RC env validation requires an API base that includes /api", () => {
  assert.throws(
    () => validateStagingRcEnv(validEnv({ VITE_API_BASE_URL: "https://staging-api.example.internal" })),
    /must include \/api/
  );
});

test("staging RC env validation normalizes a safe staging API URL", () => {
  const config = validateStagingRcEnv(validEnv({ VITE_API_BASE_URL: "https://staging-api.example.internal/api/" }));

  assert.equal(config.apiBaseUrl, "https://staging-api.example.internal/api");
  assert.equal(config.firebaseApiKey, "public-test-key");
});
