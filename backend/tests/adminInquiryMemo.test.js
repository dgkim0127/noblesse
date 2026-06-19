import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminInquiryService } from "../src/services/adminInquiryService.js";
import { request } from "./testClient.js";

const inquiryId = "11111111-1111-4111-8111-111111111111";

function createAppWithMemo({ approved = true } = {}) {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: createAdminInquiryService({
          queries: {
            async updateInquiryMemo(id, adminMemo, adminViewer) {
              if (id !== inquiryId) {
                return null;
              }
              return {
                inquiry: {
                  id,
                  inquiryNumber: "INQ-001",
                  adminMemo,
                  updatedBy: adminViewer.userId
                },
                auditLogId: "audit-mock-1"
              };
            },
            async updateInquiryStatus(id, status) {
              if (id !== inquiryId) {
                return null;
              }
              return {
                inquiry: {
                  id,
                  inquiryNumber: "INQ-001",
                  status
                },
                auditLogId: "audit-status-1"
              };
            }
          }
        }),
        buyers: {},
        products: {}
      }
    },
    auth: {
      adminVerifier: { async verifyIdToken() { return { uid: "admin-uid" }; } },
      async loadAdminUserByAuthUid() {
        if (!approved) return { userId: "admin-1", role: "buyer", status: "approved" };
        return { userId: "admin-1", role: "admin", status: "approved" };
      }
    }
  });
}

function patchMemo(app, id, body, headers = {}) {
  return request(app, `/api/admin/inquiries/${id}/memo`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function patchStatus(app, id, body, headers = {}) {
  return request(app, `/api/admin/inquiries/${id}/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

test("PATCH /api/admin/inquiries/:inquiryId/memo requires admin", async () => {
  const response = await patchMemo(createAppWithMemo(), inquiryId, { adminMemo: "Follow up" });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("PATCH /api/admin/inquiries/:inquiryId/memo rejects invalid inquiryId", async () => {
  const response = await patchMemo(
    createAppWithMemo(),
    "not-a-uuid",
    { adminMemo: "Follow up" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/inquiries/:inquiryId/memo rejects unknown body field", async () => {
  const response = await patchMemo(
    createAppWithMemo(),
    inquiryId,
    { adminMemo: "Follow up", status: "quoted" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/inquiries/:inquiryId/memo rejects invalid adminMemo type", async () => {
  const response = await patchMemo(
    createAppWithMemo(),
    inquiryId,
    { adminMemo: 123 },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/inquiries/:inquiryId/memo returns NOT_FOUND", async () => {
  const response = await patchMemo(
    createAppWithMemo(),
    "22222222-2222-4222-8222-222222222222",
    { adminMemo: "Follow up" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});

test("PATCH /api/admin/inquiries/:inquiryId/memo returns inquiry and auditLogId", async () => {
  const response = await patchMemo(
    createAppWithMemo(),
    inquiryId,
    { adminMemo: "Follow up" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiry.adminMemo, "Follow up");
  assert.equal(response.body.data.auditLogId, "audit-mock-1");
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});

test("PATCH /api/admin/inquiries/:inquiryId/status updates inquiry status", async () => {
  const response = await patchStatus(
    createAppWithMemo(),
    inquiryId,
    { status: "quoted" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiry.status, "quoted");
  assert.equal(response.body.data.auditLogId, "audit-status-1");
});

test("PATCH /api/admin/inquiries/:inquiryId/status rejects invalid status", async () => {
  const response = await patchStatus(
    createAppWithMemo(),
    inquiryId,
    { status: "new" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/inquiries/:inquiryId/status rejects unknown fields", async () => {
  const response = await patchStatus(
    createAppWithMemo(),
    inquiryId,
    { status: "checking", adminMemo: "No mass assignment" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/inquiries/:inquiryId/status returns NOT_FOUND", async () => {
  const response = await patchStatus(
    createAppWithMemo(),
    "22222222-2222-4222-8222-222222222222",
    { status: "cancelled" },
    { authorization: "Bearer admin-token" }
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});

test("blocked admin write routes are not implemented", async () => {
  const app = createAppWithMemo();
  const auth = { authorization: "Bearer admin-token" };

  const deleteResponse = await request(app, `/api/admin/inquiries/${inquiryId}`, {
    method: "DELETE",
    headers: auth
  });

  assert.equal(deleteResponse.status, 404);
});
