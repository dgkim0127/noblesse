import assert from "node:assert/strict";
import test from "node:test";
import { createAdminQuoteService } from "../src/services/adminQuoteService.js";

const quoteId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

function createCandidate() {
  return {
    quote: {
      id: quoteId,
      inquiryId: "33333333-3333-4333-8333-333333333333",
      inquiryNumber: "INQ-001",
      status: "draft",
      currency: "KRW",
      confirmedTotal: 12000,
      documentLocale: "kr",
      validUntil: "2099-12-31",
      customerNote: "고객 안내",
      adminMemo: "PDF에 포함되면 안 되는 내부 메모",
      updatedAt: "2026-07-13T00:00:00.000Z"
    },
    buyer: { companyName: "Buyer Co", country: "KR" },
    items: [{
      id: itemId,
      productCode: "NB-001",
      productImage: {
        id: "image-1",
        url: "/api/catalog/media/products/NB-001/thumb.webp",
        objectKey: "products/NB-001/thumb.webp",
        altText: "NB-001 product"
      },
      selectedOptions: [{
        groupId: "color",
        valueId: "gold",
        groupLabels: { kr: "색상", en: "Color", jp: "カラー", "zh-TW": "顏色" },
        valueLabels: { kr: "골드", en: "Gold", jp: "ゴールド", "zh-TW": "金色" }
      }],
      productName: "클로버 바벨",
      requestedQuantity: 2,
      confirmedQuantity: 1,
      cancelledQuantity: 1,
      fulfillmentStatus: "partial",
      cancellationReason: "quantity_shortage",
      cancellationNote: "Only one item is available",
      confirmedUnitPrice: 12000,
      confirmedSubtotal: 12000
    }],
    nextRevision: 1
  };
}

test("issueQuote stores an immutable customer snapshot and excludes internal memo", async () => {
  const saved = [];
  let issuedInput;
  const service = createAdminQuoteService({
    queries: {
      async getIssueCandidate() { return createCandidate(); },
      async issueQuote(id, input) {
        assert.equal(id, quoteId);
        issuedInput = input;
        return { quote: { id, status: "sent" }, document: { revision: 1 } };
      }
    },
    objectStore: {
      async save(input) { saved.push(input); },
      async deleteMany() {},
      async createReadStream(objectKey) {
        assert.equal(objectKey, "products/NB-001/thumb.webp");
        return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#ff8fa9"/></svg>');
      }
    },
    async pdfRenderer(snapshot) {
      assert.equal(snapshot.adminMemo, undefined);
      assert.equal(snapshot.schemaVersion, 3);
      assert.equal(snapshot.customerNote, "고객 안내");
      assert.equal(snapshot.items[0].requestedQuantity, 2);
      assert.equal(snapshot.items[0].quantity, 1);
      assert.equal(snapshot.items[0].cancelledQuantity, 1);
      assert.equal(snapshot.items[0].fulfillmentStatus, "partial");
      assert.equal(snapshot.items[0].cancellationReason, "quantity_shortage");
      assert.equal(snapshot.items[0].subtotal, 12000);
      assert.equal(snapshot.items[0].selectedOptions[0].valueLabels.en, "Gold");
      assert.equal(snapshot.items[0].productImage.url, "/api/catalog/media/products/NB-001/thumb.webp");
      assert.ok(Buffer.isBuffer(snapshot.items[0].imageBuffer));
      assert.ok(snapshot.items[0].imageBuffer.length > 0);
      return Buffer.from("%PDF-test");
    }
  });

  const result = await service.issueQuote(quoteId, { userId: "admin-1" });

  assert.equal(result.quote.status, "sent");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].contentType, "application/pdf");
  assert.equal(saved[0].cacheControl, "private, max-age=0, no-store");
  assert.match(saved[0].objectKey, new RegExp(`^quotes/${quoteId}/revision-1-`));
  assert.equal(issuedInput.snapshot.adminMemo, undefined);
  assert.equal(issuedInput.snapshot.items[0].productImage.url, "/api/catalog/media/products/NB-001/thumb.webp");
  assert.equal(issuedInput.snapshot.items[0].productImage.objectKey, undefined);
  assert.equal(issuedInput.snapshot.items[0].imageBuffer, undefined);
  assert.equal(issuedInput.pdfSha256.length, 64);
});

test("issueQuote removes the uploaded object when the database detects a stale draft", async () => {
  let savedObjectKey;
  const deleted = [];
  const service = createAdminQuoteService({
    queries: {
      async getIssueCandidate() { return createCandidate(); },
      async issueQuote() { return { stale: true }; }
    },
    objectStore: {
      async save({ objectKey }) { savedObjectKey = objectKey; },
      async deleteMany(keys) { deleted.push(...keys); }
    },
    async pdfRenderer() { return Buffer.from("%PDF-test"); }
  });

  await assert.rejects(
    () => service.issueQuote(quoteId, { userId: "admin-1" }),
    (error) => error.code === "CONFLICT"
  );
  assert.deepEqual(deleted, [savedObjectKey]);
});
