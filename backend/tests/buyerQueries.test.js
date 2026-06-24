import assert from "node:assert/strict";
import test from "node:test";
import { getBuyerByUserId, getUserByAuthUid } from "../src/db/queries/buyerQueries.js";

test("getUserByAuthUid falls back when account_status column is absent", async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        const error = new Error('column "account_status" does not exist');
        error.code = "42703";
        throw error;
      }
      return {
        rows: [{
          id: "user-1",
          auth_uid: "firebase-uid-1",
          email: "admin@example.test",
          role: "admin",
          status: "approved",
          account_status: null
        }]
      };
    }
  };

  const user = await getUserByAuthUid(pool, "firebase-uid-1");

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /account_status/);
  assert.match(calls[1].sql, /null::text as account_status/);
  assert.deepEqual(calls[1].params, ["firebase-uid-1"]);
  assert.equal(user.role, "admin");
  assert.equal(user.account_status, null);
});

test("getBuyerByUserId falls back when lifecycle columns are absent", async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        const error = new Error('column "verification_status" does not exist');
        error.code = "42703";
        throw error;
      }
      return {
        rows: [{
          id: "buyer-1",
          user_id: "user-1",
          company_name: "Noblesse Buyer",
          contact_name: "Buyer",
          country: "KR",
          preferred_language: "kr",
          assigned_market: "KR",
          currency: "KRW",
          discount_rate: 0,
          min_order_amount: 0,
          verification_status: null,
          submitted_at: null,
          reviewed_at: null,
          rejection_reason: null,
          suspension_reason: null
        }]
      };
    }
  };

  const buyer = await getBuyerByUserId(pool, "user-1");

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /verification_status/);
  assert.match(calls[1].sql, /null::text as verification_status/);
  assert.deepEqual(calls[1].params, ["user-1"]);
  assert.equal(buyer.id, "buyer-1");
  assert.equal(buyer.verification_status, null);
});
