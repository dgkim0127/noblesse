import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerRegistrationQueries } from "../src/db/queries/buyerRegistrationQueries.js";

const identity = {
  authUid: "firebase-user-1",
  email: "buyer@example.test"
};

const input = {
  email: "buyer@example.test",
  companyName: "Noblesse Buyer",
  contactName: "Buyer Contact",
  country: "Taiwan",
  preferredLanguage: "zh-TW",
  phone: null,
  messengerType: null,
  messengerId: null,
  salesChannel: null,
  businessNumber: null,
  assignedMarket: "TW",
  currency: "TWD",
  agreements: [
    { agreementKey: "terms_of_service", version: "terms-v1.0", required: true, accepted: true },
    { agreementKey: "buyer_terms", version: "buyer-terms-v1.0", required: true, accepted: true },
    { agreementKey: "privacy_collection_use", version: "privacy-v1.0", required: true, accepted: true }
  ]
};

function createPool({ hasAccountStatus, hasVerificationStatus, hasBuyerSubmittedAt = true }) {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      const compactSql = String(sql).replace(/\s+/g, " ").trim();
      if (compactSql === "begin" || compactSql === "commit" || compactSql === "rollback") {
        return { rows: [] };
      }
      if (!hasAccountStatus && /\baccount_status\b/i.test(compactSql) && !/null::text as account_status/i.test(compactSql)) {
        const error = new Error('column "account_status" does not exist');
        error.code = "42703";
        throw error;
      }
      if (!hasVerificationStatus && /\bverification_status\b/i.test(compactSql) && !/null::text as verification_status/i.test(compactSql)) {
        const error = new Error('column "verification_status" does not exist');
        error.code = "42703";
        throw error;
      }
      if (!hasBuyerSubmittedAt && /\bsubmitted_at\b/i.test(compactSql) && !/null::timestamptz as submitted_at/i.test(compactSql)) {
        const error = new Error('column "submitted_at" does not exist');
        error.code = "42703";
        throw error;
      }
      if (compactSql.includes("from public.users") && compactSql.includes("for update")) {
        return { rows: [] };
      }
      if (compactSql.includes("insert into public.users")) {
        return {
          rows: [{
            id: "user-1",
            auth_uid: identity.authUid,
            email: identity.email,
            role: "buyer",
            status: "pending",
            account_status: hasAccountStatus ? "active" : null
          }]
        };
      }
      if (compactSql.includes("insert into public.buyers")) {
        return {
          rows: [{
            buyer_id: "buyer-1",
            user_id: "user-1",
            company_name: input.companyName,
            contact_name: input.contactName,
            country: input.country,
            preferred_language: input.preferredLanguage,
            assigned_market: input.assignedMarket,
            currency: input.currency,
            verification_status: hasVerificationStatus ? "pending" : null,
            submitted_at: hasBuyerSubmittedAt ? new Date("2026-06-29T00:00:00Z") : null
          }]
        };
      }
      if (compactSql.includes("from public.terms_versions")) {
        return {
          rows: input.agreements.map((agreement, index) => ({
            id: `terms-${index + 1}`,
            agreement_key: agreement.agreementKey,
            version: agreement.version,
            required: agreement.required
          }))
        };
      }
      if (compactSql.includes("insert into public.buyer_agreements")) {
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${compactSql}`);
    },
    release() {
      calls.push({ sql: "release", params: [] });
    }
  };

  return {
    calls,
    pool: {
      async connect() {
        return client;
      }
    }
  };
}

test("buyer registration query falls back when lifecycle columns are absent", async () => {
  const { calls, pool } = createPool({ hasAccountStatus: false, hasVerificationStatus: false });
  const queries = createBuyerRegistrationQueries(pool);

  const result = await queries.registerBuyer(identity, input);
  const mutationSql = calls
    .map((call) => String(call.sql))
    .join("\n");

  assert.equal(result.profile.accountStatus, "active");
  assert.equal(result.profile.verificationStatus, "pending");
  assert.doesNotMatch(mutationSql, /insert into public\.users \(auth_uid, email, role, status, account_status\)/i);
  assert.doesNotMatch(mutationSql, /account_status = 'active'/i);
  assert.doesNotMatch(mutationSql, /verification_status = 'pending'/i);
  assert.match(mutationSql, /null::text as account_status/i);
  assert.match(mutationSql, /null::text as verification_status/i);
  assert.equal(calls.filter((call) => String(call.sql).trim() === "rollback").length, 1);
  assert.equal(calls.some((call) => String(call.sql).trim() === "commit"), true);
});

test("buyer registration query falls back when buyer submitted timestamp is absent", async () => {
  const { calls, pool } = createPool({
    hasAccountStatus: false,
    hasVerificationStatus: false,
    hasBuyerSubmittedAt: false
  });
  const queries = createBuyerRegistrationQueries(pool);

  const result = await queries.registerBuyer(identity, input);
  const commitIndex = calls.findIndex((call) => String(call.sql).trim() === "commit");
  const finalAttemptSql = calls
    .slice(calls.findLastIndex((call, index) => index < commitIndex && String(call.sql).trim() === "begin"), commitIndex)
    .map((call) => String(call.sql))
    .join("\n");

  assert.equal(result.profile.accountStatus, "active");
  assert.equal(result.profile.verificationStatus, "pending");
  assert.equal(result.profile.submittedAt, null);
  assert.match(finalAttemptSql, /null::timestamptz as submitted_at/i);
  assert.doesNotMatch(finalAttemptSql, /submitted_at = now\(\)/i);
  assert.equal(calls.filter((call) => String(call.sql).trim() === "rollback").length, 2);
  assert.equal(calls.some((call) => String(call.sql).trim() === "commit"), true);
});

test("buyer registration query uses lifecycle columns when available", async () => {
  const { calls, pool } = createPool({ hasAccountStatus: true, hasVerificationStatus: true });
  const queries = createBuyerRegistrationQueries(pool);

  const result = await queries.registerBuyer(identity, input);
  const sqlText = calls.map((call) => String(call.sql)).join("\n");

  assert.equal(result.profile.accountStatus, "active");
  assert.equal(result.profile.verificationStatus, "pending");
  assert.match(sqlText, /insert into public\.users \(auth_uid, email, role, status, account_status\)/i);
  assert.match(sqlText, /verification_status,\s+submitted_at/i);
  assert.match(sqlText, /verification_status = 'pending'/i);
  assert.equal(calls.some((call) => String(call.sql).trim() === "commit"), true);
});
