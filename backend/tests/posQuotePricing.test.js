import test from "node:test";
import assert from "node:assert/strict";
import { calculatePosQuote } from "../src/services/posQuotePricing.js";

test("POS quote pricing applies deduction, customer discount, and VAT in order", () => {
  const result = calculatePosQuote({
    customer: {
      id: "store-1",
      name: "Test Store",
      discountRate: 10,
      vatEnabled: true,
      isOverseas: false
    },
    deductionAmount: 10_000,
    lines: [
      {
        itemId: "line-1",
        requestedQuantity: 10,
        preparedQuantity: 10,
        baseUnitPrice: 10_000,
        discountable: true,
        priceSource: "pors"
      }
    ]
  });

  assert.equal(result.subtotal, 100_000);
  assert.equal(result.deductionAmount, 10_000);
  assert.equal(result.discountAmount, 9_000);
  assert.equal(result.supplyAmount, 81_000);
  assert.equal(result.vatAmount, 8_100);
  assert.equal(result.totalAmount, 89_100);
  assert.equal(result.discountSource, "customer");
});

test("POS quote pricing excludes protected items from discount", () => {
  const result = calculatePosQuote({
    customer: { discountRate: 10, vatEnabled: false },
    lines: [
      {
        itemId: "discountable",
        requestedQuantity: 1,
        preparedQuantity: 1,
        baseUnitPrice: 100_000,
        discountable: true
      },
      {
        itemId: "protected",
        requestedQuantity: 1,
        preparedQuantity: 1,
        baseUnitPrice: 100_000,
        discountable: false
      }
    ]
  });

  assert.equal(result.subtotal, 200_000);
  assert.equal(result.discountAmount, 10_000);
  assert.equal(result.totalAmount, 190_000);
});

test("POS quote pricing requires a reason for line price overrides", () => {
  assert.throws(
    () => calculatePosQuote({
      lines: [{
        itemId: "line-1",
        requestedQuantity: 1,
        preparedQuantity: 1,
        baseUnitPrice: 1_800,
        overrideUnitPrice: 1_500
      }]
    }),
    /requires a reason/
  );
});

test("POS quote pricing groups prepared quantities by final unit price", () => {
  const result = calculatePosQuote({
    customer: { vatEnabled: false },
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
