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
