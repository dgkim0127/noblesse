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

function createMultiItemCandidate() {
  const items = Array.from({ length: 15 }, (_, index) => {
    const requestedQuantity = index % 5 === 1 ? 3 : 2;
    const fulfillmentStatus = index % 5 === 0
      ? "cancelled"
      : index % 5 === 1
        ? "partial"
        : "ready";
    const confirmedQuantity = fulfillmentStatus === "cancelled"
      ? 0
      : fulfillmentStatus === "partial"
        ? 2
        : requestedQuantity;
    const cancelledQuantity = requestedQuantity - confirmedQuantity;
    const confirmedUnitPrice = 1500 + (index * 100);
    const cancellationReason = fulfillmentStatus === "cancelled"
      ? "out_of_stock"
      : fulfillmentStatus === "partial"
        ? "quantity_shortage"
        : "";

    return {
      id: `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      productCode: `NB-SAMPLE-${String(index + 1).padStart(2, "0")}`,
      productName: `Piercing Sample ${String(index + 1).padStart(2, "0")}`,
      productImage: {
        id: `image-${index + 1}`,
        url: "/api/catalog/media/products/NB-SAMPLE/thumb.webp",
        objectKey: "products/NB-SAMPLE/thumb.webp",
        altText: `Piercing Sample ${index + 1}`
      },
      selectedOptions: [
        {
          groupId: "color",
          valueId: index % 2 === 0 ? "gold" : "pink",
          groupLabels: { kr: "Color", en: "Color", jp: "Color", "zh-TW": "Color" },
          valueLabels: {
            kr: index % 2 === 0 ? "Gold" : "Pink",
            en: index % 2 === 0 ? "Gold" : "Pink",
            jp: index % 2 === 0 ? "Gold" : "Pink",
            "zh-TW": index % 2 === 0 ? "Gold" : "Pink"
          }
        },
        {
          groupId: "bar-length",
          valueId: index % 2 === 0 ? "6mm" : "8mm",
          groupLabels: { kr: "Bar length", en: "Bar length", jp: "Bar length", "zh-TW": "Bar length" },
          valueLabels: {
            kr: index % 2 === 0 ? "6mm" : "8mm",
            en: index % 2 === 0 ? "6mm" : "8mm",
            jp: index % 2 === 0 ? "6mm" : "8mm",
            "zh-TW": index % 2 === 0 ? "6mm" : "8mm"
          }
        },
        {
          groupId: "gauge",
          valueId: index % 2 === 0 ? "1.2mm-16g" : "1.0mm-18g",
          groupLabels: { kr: "Gauge", en: "Gauge", jp: "Gauge", "zh-TW": "Gauge" },
          valueLabels: {
            kr: index % 2 === 0 ? "1.2mm / 16G" : "1.0mm / 18G",
            en: index % 2 === 0 ? "1.2mm / 16G" : "1.0mm / 18G",
            jp: index % 2 === 0 ? "1.2mm / 16G" : "1.0mm / 18G",
            "zh-TW": index % 2 === 0 ? "1.2mm / 16G" : "1.0mm / 18G"
          }
        }
      ],
      requestedQuantity,
      confirmedQuantity,
      cancelledQuantity,
      fulfillmentStatus,
      cancellationReason,
      cancellationNote: cancellationReason ? `Line ${index + 1} shortage` : "",
      confirmedUnitPrice,
      confirmedSubtotal: confirmedQuantity * confirmedUnitPrice
    };
  });

  return {
    quote: {
      id: quoteId,
      inquiryId: "33333333-3333-4333-8333-333333333333",
      inquiryNumber: "INQ-015",
      status: "draft",
      currency: "KRW",
      confirmedTotal: items.reduce((total, item) => total + item.confirmedSubtotal, 0),
      documentLocale: "en",
      validUntil: "2099-12-31",
      customerNote: "Prepare the available items",
      adminMemo: "Internal 15-line picking note",
      updatedAt: "2026-07-13T00:00:00.000Z"
    },
    buyer: { companyName: "Multi Item Buyer", country: "KR" },
    items,
    nextRevision: 4
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

test("issueQuote preserves 15 prepared, partial, and cancelled option lines", async () => {
  const candidate = createMultiItemCandidate();
  const saved = [];
  let issuedInput;
  let imageReadCount = 0;
  const service = createAdminQuoteService({
    queries: {
      async getIssueCandidate() { return candidate; },
      async issueQuote(id, input) {
        issuedInput = input;
        return { quote: { id, status: "sent" }, document: { revision: 4 } };
      }
    },
    objectStore: {
      async save(input) { saved.push(input); },
      async deleteMany() {},
      async createReadStream(objectKey) {
        imageReadCount += 1;
        assert.equal(objectKey, "products/NB-SAMPLE/thumb.webp");
        return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#ff8fa9"/></svg>');
      }
    },
    async pdfRenderer(snapshot) {
      assert.equal(snapshot.schemaVersion, 3);
      assert.equal(snapshot.items.length, 15);
      assert.equal(snapshot.adminMemo, undefined);
      assert.equal(snapshot.items.filter((item) => item.fulfillmentStatus === "cancelled").length, 3);
      assert.equal(snapshot.items.filter((item) => item.fulfillmentStatus === "partial").length, 3);
      assert.equal(snapshot.items.filter((item) => item.fulfillmentStatus === "ready").length, 9);
      assert.equal(snapshot.items[0].selectedOptions.length, 3);
      assert.equal(snapshot.items[0].selectedOptions[2].valueLabels.en, "1.2mm / 16G");
      assert.equal(snapshot.items[1].selectedOptions[1].valueLabels.en, "8mm");
      assert.equal(snapshot.total, candidate.quote.confirmedTotal);
      assert.ok(snapshot.items.every((item) => Buffer.isBuffer(item.imageBuffer)));
      return Buffer.from("%PDF-15-line-test");
    }
  });

  const result = await service.issueQuote(quoteId, { userId: "admin-1" });

  assert.equal(result.quote.status, "sent");
  assert.equal(saved.length, 1);
  assert.equal(imageReadCount, 1);
  assert.equal(issuedInput.snapshot.items.length, 15);
  assert.equal(issuedInput.snapshot.items[0].imageBuffer, undefined);
  assert.equal(issuedInput.snapshot.items[0].productImage.objectKey, undefined);
  assert.equal(issuedInput.snapshot.items[0].selectedOptions.length, 3);
  assert.equal(issuedInput.pdfSha256.length, 64);
});

test("issueQuote loads legacy product images from catalog media URLs", async () => {
  const candidate = createCandidate();
  const objectKey = "products/NB-001/legacy-thumb.jpg";
  candidate.items[0].productImage.objectKey = "";
  candidate.items[0].productImage.url = `/api/catalog/media/${Buffer.from(objectKey).toString("base64url")}`;

  let readObjectKey = "";
  const service = createAdminQuoteService({
    queries: {
      async getIssueCandidate() { return candidate; },
      async issueQuote(id) { return { quote: { id, status: "sent" }, document: { revision: 1 } }; }
    },
    objectStore: {
      async save() {},
      async deleteMany() {},
      async createReadStream(key) {
        readObjectKey = key;
        return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#ff8fa9"/></svg>');
      }
    },
    async pdfRenderer(snapshot) {
      assert.ok(Buffer.isBuffer(snapshot.items[0].imageBuffer));
      assert.ok(snapshot.items[0].imageBuffer.length > 0);
      return Buffer.from("%PDF-test");
    }
  });

  await service.issueQuote(quoteId, { userId: "admin-1" });

  assert.equal(readObjectKey, objectKey);
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
