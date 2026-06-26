import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDiscount,
  multiplyMoney,
  sumMoney,
  toMinorUnits,
  validateMoneyPrecision
} from "../src/utils/money.js";

test("money helpers preserve currency minor units for discounts", () => {
  assert.equal(applyDiscount(9.99, 10, "USD"), 8.99);
  assert.equal(applyDiscount(58.2, 12, "TWD"), 51.22);
  assert.equal(applyDiscount(12000, 12, "KRW"), 10560);
  assert.equal(applyDiscount(1200, 12, "JPY"), 1056);
  assert.equal(applyDiscount("2.01", "12.50", "USD"), 1.76);
});

test("money precision validation accepts exact minor unit inputs", () => {
  for (const value of [2.01, 2.03, 2.18, 9.99, 100.01]) {
    assert.equal(validateMoneyPrecision(value, "USD"), true);
  }
  for (const value of [58.2, "58.20", 0.01]) {
    assert.equal(validateMoneyPrecision(value, "TWD"), true);
  }
  assert.equal(validateMoneyPrecision(1000, "KRW"), true);
  assert.equal(validateMoneyPrecision(1200, "JPY"), true);
});

test("money precision validation rejects drift-prone or unsafe inputs", () => {
  for (const [value, currency] of [
    [2.001, "USD"],
    [58.999, "TWD"],
    [1000.5, "KRW"],
    [1200.1, "JPY"],
    [Number.NaN, "USD"],
    [Number.POSITIVE_INFINITY, "USD"],
    [-1, "USD"],
    ["1e2", "USD"]
  ]) {
    assert.equal(validateMoneyPrecision(value, currency), false);
    assert.equal(toMinorUnits(value, currency), null);
  }
});

test("money multiplication uses integer minor units", () => {
  assert.equal(multiplyMoney(8.99, 3, "USD"), 26.97);
  assert.equal(multiplyMoney(51.22, 3, "TWD"), 153.66);
  assert.equal(multiplyMoney(10560, 2, "KRW"), 21120);
});

test("money summation uses integer minor units and rejects unsafe totals", () => {
  assert.equal(sumMoney([26.97, 9.05], "USD"), 36.02);
  assert.equal(sumMoney([51.22, 102.44], "TWD"), 153.66);
  assert.equal(sumMoney([10560, 21120], "KRW"), 31680);
  assert.equal(multiplyMoney(Number.MAX_SAFE_INTEGER, 2, "KRW"), null);
  assert.equal(sumMoney([Number.MAX_SAFE_INTEGER, 1], "KRW"), null);
  assert.equal(toMinorUnits(Number.MAX_SAFE_INTEGER + 1, "KRW"), null);
});
