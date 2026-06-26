import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createBuyerRegistrationService } from "../src/services/buyerRegistrationService.js";
import { request } from "./testClient.js";

const verifier = {
  async verifyIdToken(token) {
    if (token !== "valid-token") {
      throw new Error("Invalid token");
    }
    return { uid: "firebase-uid-1", email: "buyer@example.test" };
  }
};

function authHeaders() {
  return { authorization: "Bearer valid-token" };
}

function createRegisterApp({ service, queries } = {}) {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      buyerRegistration:
        service ||
        createBuyerRegistrationService({
          queries: {
            async registerBuyer(identity, input) {
              return {
                profile: {
                  userId: "user-1",
                  email: identity.email,
                  role: "buyer",
                  status: "pending",
                  buyerId: "buyer-1",
                  companyName: input.companyName,
                  contactName: input.contactName,
                  country: input.country,
                  preferredLanguage: input.preferredLanguage,
                  assignedMarket: input.assignedMarket,
                  currency: input.currency
                }
              };
            },
            ...queries
          }
        })
    },
    auth: { verifier }
  });
}

test("POST /api/buyer/register requires Firebase token", async () => {
  const app = createRegisterApp();
  const response = await request(app, "/api/buyer/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("POST /api/buyer/register creates pending buyer profile from token identity", async () => {
  const app = createRegisterApp();
  const response = await request(app, "/api/buyer/register", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.test",
      companyName: "Noblesse Buyer",
      contactName: "Buyer Contact",
      country: "Japan",
      preferredLanguage: "jp",
      phone: "010",
      agreements: [
        { key: "terms_of_service", version: "terms-v1.0", required: true, accepted: true },
        { key: "buyer_terms", version: "buyer-terms-v1.0", required: true, accepted: true },
        { key: "privacy_collection_use", version: "privacy-v1.0", required: true, accepted: true }
      ]
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.profile.email, "buyer@example.test");
  assert.equal(response.body.data.profile.status, "pending");
  assert.equal(response.body.data.profile.assignedMarket, "JP");
  assert.equal(response.body.data.profile.currency, "JPY");
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});

test("POST /api/buyer/register maps Taiwan buyer to TW and TWD", async () => {
  const app = createRegisterApp();
  const response = await request(app, "/api/buyer/register", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.test",
      companyName: "Noblesse Buyer TW",
      contactName: "Buyer Contact",
      country: "Taiwan",
      preferredLanguage: "TW",
      phone: "010"
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.profile.assignedMarket, "TW");
  assert.equal(response.body.data.profile.currency, "TWD");
});

test("POST /api/buyer/register rejects email that differs from Firebase token", async () => {
  const app = createRegisterApp();
  const response = await request(app, "/api/buyer/register", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      email: "other@example.test",
      companyName: "Noblesse Buyer",
      contactName: "Buyer Contact",
      country: "Japan",
      preferredLanguage: "jp"
    })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/buyer/register rejects client-controlled role or status", async () => {
  const app = createRegisterApp();
  const response = await request(app, "/api/buyer/register", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.test",
      companyName: "Noblesse Buyer",
      contactName: "Buyer Contact",
      country: "Japan",
      preferredLanguage: "jp",
      role: "admin",
      status: "approved"
    })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/buyer/register returns conflict for duplicate registered email", async () => {
  const app = createRegisterApp({
    queries: {
      async registerBuyer() {
        return { conflict: "email_in_use" };
      }
    }
  });

  const response = await request(app, "/api/buyer/register", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.test",
      companyName: "Noblesse Buyer",
      contactName: "Buyer Contact",
      country: "Japan",
      preferredLanguage: "jp"
    })
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});
