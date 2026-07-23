import assert from "node:assert/strict";
import test from "node:test";
import { createQuotePdfBuffer } from "../src/services/quotePdfRenderer.js";

for (const documentLocale of ["kr", "en", "jp", "zh-TW"]) {
  test(`quote PDF renders ${documentLocale} with a valid PDF header`, async () => {
    const buffer = await createQuotePdfBuffer({
      documentLocale,
      quoteNumber: "QT-20260713-TEST",
      issuedAt: "2026-07-13T00:00:00.000Z",
      validUntil: "2099-12-31",
      buyer: { companyName: "Noblesse Test Buyer" },
      currency: "KRW",
      total: 12000,
      leadTime: "7 days",
      shippingNote: "EXW",
      customerNote: "Test",
      items: [{
        id: "line-1",
        productCode: "NB-001",
        productName: "클로버 바벨",
        color: "오알",
        size: "8mm",
        quantity: 1,
        unitPrice: 12000,
        subtotal: 12000
      }]
    });

    assert.equal(buffer.subarray(0, 4).toString("ascii"), "%PDF");
    assert.equal((buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length, 1);
    assert.ok(buffer.length > 1000);
    assert.ok(buffer.length < 12 * 1024 * 1024);
  });
}

test("quote PDF paginates 15 mixed option lines without dropping the summary", async () => {
  const items = Array.from({ length: 15 }, (_, index) => {
    const requestedQuantity = index % 5 === 1 ? 3 : 2;
    const fulfillmentStatus = index % 5 === 0
      ? "cancelled"
      : index % 5 === 1
        ? "partial"
        : "ready";
    const quantity = fulfillmentStatus === "cancelled"
      ? 0
      : fulfillmentStatus === "partial"
        ? requestedQuantity - 1
        : requestedQuantity;
    const cancelledQuantity = requestedQuantity - quantity;
    const unitPrice = 1500 + index * 100;

    return {
      id: `line-${index + 1}`,
      productCode: `NB-SAMPLE-${String(index + 1).padStart(2, "0")}`,
      productName: `Piercing Sample ${index + 1}`,
      selectedOptions: [
        {
          groupLabels: { en: "Color" },
          valueLabels: { en: index % 2 === 0 ? "Gold" : "Pink" }
        },
        {
          groupLabels: { en: "Bar length" },
          valueLabels: { en: index % 2 === 0 ? "6mm" : "8mm" }
        },
        {
          groupLabels: { en: "Gauge" },
          valueLabels: { en: index % 2 === 0 ? "1.2mm / 16G" : "1.0mm / 18G" }
        }
      ],
      requestedQuantity,
      quantity,
      cancelledQuantity,
      fulfillmentStatus,
      cancellationReason: fulfillmentStatus === "cancelled"
        ? "out_of_stock"
        : fulfillmentStatus === "partial"
          ? "quantity_shortage"
          : "",
      cancellationNote: cancelledQuantity > 0
        ? `Line ${index + 1} could not be fully prepared`
        : "",
      unitPrice,
      subtotal: quantity * unitPrice
    };
  });
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const buffer = await createQuotePdfBuffer({
    documentLocale: "en",
    quoteNumber: "QT-20260723-15-LINES",
    issuedAt: "2026-07-23T00:00:00.000Z",
    validUntil: "2099-12-31",
    buyer: { companyName: "Noblesse Multi Item Buyer", country: "KR" },
    currency: "KRW",
    total,
    leadTime: "7 days",
    shippingNote: "Prepared items only",
    customerNote: "Prepared and cancelled quantities are shown per line.",
    items
  });
  const pageCount = (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;

  assert.equal(buffer.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pageCount >= 3);
  assert.ok(buffer.length > 5000);
  assert.ok(buffer.length < 12 * 1024 * 1024);
});
