import assert from "node:assert/strict";
import test from "node:test";
import { createAdminBuyerService } from "../src/services/adminBuyerService.js";

const buyerId = "11111111-1111-4111-8111-111111111111";
const owner = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin",
  adminRole: "owner",
  permissions: ["admins.manage"]
};

function createDeletionService(overrides = {}) {
  const calls = [];
  const service = createAdminBuyerService({
    queries: {
      async getBuyerDeletionCandidate() {
        calls.push("candidate");
        return {
          buyerId,
          email: "buyer@example.test",
          authUid: "firebase-buyer-uid",
          inquiryCount: 3
        };
      },
      async deleteBuyer() {
        calls.push("database");
        return {
          buyerId,
          email: "buyer@example.test",
          inquiryCount: 3,
          pdfObjectKeys: ["quotes/one.pdf", "quotes/two.pdf"],
          auditLogId: "audit-delete-1"
        };
      },
      ...overrides.queries
    },
    identityManager: {
      async deleteUser(authUid) {
        calls.push(`identity:${authUid}`);
        return { deleted: true, alreadyMissing: false };
      },
      ...overrides.identityManager
    },
    objectStore: {
      async deleteMany(keys) {
        calls.push(`objects:${keys.join(",")}`);
      },
      ...overrides.objectStore
    }
  });
  return { calls, service };
}

test("owner deletion removes login identity before database profile and quote objects", async () => {
  const { calls, service } = createDeletionService();
  const result = await service.deleteBuyer(buyerId, { confirmation: "BUYER@example.test" }, owner);

  assert.deepEqual(calls, [
    "candidate",
    "identity:firebase-buyer-uid",
    "database",
    "objects:quotes/one.pdf,quotes/two.pdf"
  ]);
  assert.deepEqual(result.deleted, {
    buyerId,
    email: "buyer@example.test",
    inquiryCount: 3,
    quoteDocumentCount: 2,
    authAccountDeleted: true
  });
  assert.equal(result.auditLogId, "audit-delete-1");
});

test("buyer deletion is restricted to the owner administrator", async () => {
  const { service } = createDeletionService();
  await assert.rejects(
    () => service.deleteBuyer(buyerId, { confirmation: "buyer@example.test" }, {
      ...owner,
      adminRole: "manager"
    }),
    (error) => error.statusCode === 403 && error.code === "FORBIDDEN"
  );
});

test("buyer deletion requires an exact email confirmation", async () => {
  const { calls, service } = createDeletionService();
  await assert.rejects(
    () => service.deleteBuyer(buyerId, { confirmation: "wrong@example.test" }, owner),
    (error) => error.statusCode === 400 && error.code === "VALIDATION_ERROR"
  );
  assert.deepEqual(calls, ["candidate"]);
});

test("buyer deletion stops before database removal when Firebase deletion fails", async () => {
  const { calls, service } = createDeletionService({
    identityManager: {
      async deleteUser() {
        calls.push("identity:failed");
        throw new Error("firebase unavailable");
      }
    }
  });
  await assert.rejects(
    () => service.deleteBuyer(buyerId, { confirmation: "buyer@example.test" }, owner),
    /firebase unavailable/
  );
  assert.deepEqual(calls, ["candidate", "identity:failed"]);
});
