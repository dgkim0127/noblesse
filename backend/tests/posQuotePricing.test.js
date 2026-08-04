import test from "node:test";
import assert from "node:assert/strict";
import { calculatePosQuote } from "../src/services/posQuotePricing.js";

test("online quote pricing uses prepared quantities, fixed zero discount, and VAT 10%", () => {
  const result = calculatePosQuote({
    customer: {
      id: "store-1",
      name: "Test Store",
      discountRate: 25,
      vatEnabled: false,
      isOverseas: true
    },
    deductionAmount: 10_000,
    lines: [
      {
        itemId: "line-1",
        requestedQuantity: 5,
        preparedQuantity: 5,
        baseUnitPrice: 1_800,
        discountable: true
      },
      {
        itemId: "line-2",
        requestedQuantity: 4,
        preparedQuantity: 4,
        baseUnitPrice: 1_400
      },
      {
        itemId: "line-3",
        requestedQuantity: 5,
        preparedQuantity: 3,
        baseUnitPrice: 1_400
      }
    ]
  });

  assert.equal(result.subtotal, 18_800);
  assert.equal(result.deductionAmount, 0);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.appliedDiscountRate, 0);
  assert.equal(result.supplyAmount, 18_800);
  assert.equal(result.vatAmount, 1_880);
  assert.equal(result.totalAmount, 20_680);
  assert.deepEqual(result.priceBands, [
    { unitPrice: 1_400, quantity: 7, subtotal: 9_800 },
    { unitPrice: 1_800, quantity: 5, subtotal: 9_000 }
  ]);
  assert.equal(result.lines[2].cancelledQuantity, 2);
  assert.equal(result.customer.discountRate, 0);
  assert.equal(result.customer.vatEnabled, true);
});

test("online quote pricing rejects line price overrides", () => {
  assert.throws(
    () => calculatePosQuote({
      lines: [{
        itemId: "line-1",
        requestedQuantity: 1,
        preparedQuantity: 1,
        baseUnitPrice: 1_800,
        overrideUnitPrice: 1_500,
        overrideReason: "manual correction"
      }]
    }),
    /request-time unit price/
  );
});

test("POS quote pricing groups prepared quantities by final unit price", () => {
  const result = calculatePosQuote({
    lines: [
      {
        itemId: "line-1",
        requestedQuantity: 12,
        preparedQuantity: 12,
        baseUnitPrice: 1_800
      },
      {
        itemId: "line-2",
        requestedQuantity: 5,
        preparedQuantity: 3,
        baseUnitPrice: 1_800
      },
      {
        itemId: "line-3",
        requestedQuantity: 2,
        preparedQuantity: 2,
        baseUnitPrice: 2_500
      }
    ]
  });

  assert.deepEqual(result.priceBands, [
    { unitPrice: 1_800, quantity: 15, subtotal: 27_000 },
    { unitPrice: 2_500, quantity: 2, subtotal: 5_000 }
  ]);
  assert.equal(result.lines[1].cancelledQuantity, 2);
});
