import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

const buyerService = {
  async getMe(viewer) {
    return {
      user: {
        id: viewer.userId,
        email: viewer.email,
        role: viewer.role,
        status: viewer.status
      },
      buyer: {
        id: viewer.buyerId,
        companyName: viewer.companyName,
        assignedMarket: viewer.assignedMarket,
        currency: viewer.currency
      }
    };
  }
};

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
  assert.equal(response.body.profile.user.status, "approved");
  assert.equal(response.body.profile.buyer.assignedMarket, "JP");
});
