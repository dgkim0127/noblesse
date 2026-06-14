import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createBuyerService } from "../src/services/buyerService.js";
import { request } from "./testClient.js";

const buyerService = createBuyerService();

const verifier = {
  async verifyIdToken(token) {
    if (token !== "valid-token") {
      throw new Error("Invalid token");
    }
    return {
      uid: "firebase-uid-1",
      email: "buyer@example.test"
    };
  }
};

async function loadViewer(decodedToken) {
  return {
    userId: "user-1",
    authUid: decodedToken.uid,
    email: decodedToken.email,
    role: "buyer",
    status: "approved",
    buyerId: "buyer-1",
    companyName: "Tokyo Piercing Lab",
    assignedMarket: "JP",
    currency: "JPY"
  };
}

test("GET /api/buyer/me returns UNAUTHORIZED without token", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { buyer: buyerService },
    auth: { verifier, loadViewer }
  });

  const response = await request(app, "/api/buyer/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
  assert.match(response.headers.get("x-request-id"), /.+/);
  assert.equal(response.body.error.requestId, response.headers.get("x-request-id"));
});

test("GET /api/buyer/me returns UNAUTHORIZED for invalid token", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { buyer: buyerService },
    auth: { verifier, loadViewer }
  });

  const response = await request(app, "/api/buyer/me", {
    headers: {
      authorization: "Bearer invalid-token"
    }
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
  assert.match(response.body.error.requestId, /.+/);
});

test("GET /api/buyer/me returns current buyer profile for valid token", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { buyer: buyerService },
    auth: { verifier, loadViewer }
  });

  const response = await request(app, "/api/buyer/me", {
    headers: {
      authorization: "Bearer valid-token"
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.profile.userId, "user-1");
  assert.equal(response.body.profile.role, "buyer");
  assert.equal(response.body.profile.status, "approved");
  assert.equal(response.body.profile.buyerId, "buyer-1");
  assert.equal(response.body.profile.assignedMarket, "JP");
  assert.equal(response.body.profile.currency, "JPY");
});
