import test from "node:test";
import assert from "node:assert/strict";
import { createAdminPosService } from "../src/services/adminPosService.js";

const viewer = {
  authUid: "operator-1",
  permissions: ["quotes.read", "quotes.write"]
};

function createQuoteDetail() {
  return {
    quote: {
      id: "quote-1",
      buyerId: "buyer-1",
      companyName: "Buyer Company",
      buyerCountry: "KR",
      leadTime: "",
      shippingNote: "",
      validUntil: "2099-12-31",
      documentLocale: "kr",
      customerNote: "",
      adminMemo: ""
    },
    items: [
      {
        id: "line-1",
        productId: "product-1",
        productCode: "NB-CLOVER-01",
        productName: "4-Way Green Clover Barbell",
        imageUrl: "https://example.com/clover.webp",
        selectedOptions: [
          { groupId: "color", groupLabel: "색상", valueId: "gold", valueLabel: "골드" },
          { groupId: "bar-length", groupLabel: "바 길이", valueId: "6mm", valueLabel: "6mm" }
        ],
        requestedQuantity: 2,
        confirmedQuantity: 2,
        requestedPriceSnapshot: 2_000,
        confirmedUnitPrice: 2_000,
        cancellationReason: null,
        cancellationNote: null,
        itemNote: ""
      }
    ]
  };
}

function createHarness(overrides = {}) {
  const calls = {
    upsertCustomers: [],
    upsertItems: [],
    updates: [],
    issues: [],
    publications: [],
    receiptLinks: [],
    deviceRegistrations: [],
    pickingStates: [],
    restores: [],
    clears: [],
    completions: []
  };
  const detail = createQuoteDetail();

  const queries = {
    beginIdempotency: async () => ({ claimed: true, completed: false }),
    completeIdempotency: async (...args) => {
      calls.completions.push(args);
    },
    clearIdempotency: async (...args) => {
      calls.clears.push(args);
    },
    getQuoteState: async () => ({
      quoteId: "quote-1",
      version: 1,
      deductionAmount: 0
    }),
    getQuoteStates: async () => [],
    getBuyerCustomer: async () => null,
    getProductMappings: async () => [],
    claimQuoteVersion: async (_quoteId, expectedVersion) => ({
      claimed: expectedVersion === 1,
      state: { quoteId: "quote-1", version: 2 }
    }),
    restoreQuoteVersion: async (...args) => {
      calls.restores.push(args);
    },
    savePickingState: async (_quoteId, version, input) => {
      calls.pickingStates.push(input);
      return {
        quoteId: "quote-1",
        version,
        ...input,
        finalizedSnapshot: input.invalidateFinalization ? null : undefined,
        finalizedAt: input.invalidateFinalization ? null : undefined
      };
    },
    saveFinalizedState: async (_quoteId, version, input) => ({
      state: { quoteId: "quote-1", version, finalizedAt: "2026-07-23T00:00:00Z" },
      priceSnapshot: { id: "snapshot-1", ...input }
    }),
    savePublishedState: async (_quoteId, version, input) => {
      calls.publications.push(input);
      return {
        quoteId: "quote-1",
        version,
        publishedAt: input.publishedAt,
        publishedSnapshot: input.snapshot
      };
    },
    saveReceiptState: async (_quoteId, version, input) => {
      calls.receiptLinks.push(input);
      return {
        quoteId: "quote-1",
        version,
        linkedReceiptId: input.receiptId
      };
    },
    registerDevice: async (input) => {
      calls.deviceRegistrations.push({ operation: "register", input });
      return { id: "device-1", version: 1, ...input };
    },
    unregisterDevice: async (input) => {
      calls.deviceRegistrations.push({ operation: "unregister", input });
      return { id: "device-1", version: input.expectedVersion, active: false };
    },
    upsertCustomer: async (input) => {
      calls.upsertCustomers.push(input);
      return input;
    },
    upsertItem: async (input) => {
      calls.upsertItems.push(input);
      return input;
    },
    getCustomerById: async () => ({
      id: "customer-1",
      name: "Linked Store",
      discountRate: 0,
      pricingRules: {}
    }),
    ...overrides.queries
  };

  const quoteService = {
    getQuoteById: async () => detail,
    listQuotes: async () => ({ quotes: [] }),
    updateQuote: async (_quoteId, input) => {
      calls.updates.push(input);
      return detail;
    },
    issueQuote: async (_quoteId, _viewer, options) => {
      calls.issues.push(options);
      return {
        document: {
          id: "document-1",
          version: 1,
          documentNumber: "QT-20260730-0001"
        }
      };
    },
    ...overrides.quoteService
  };

  return {
    calls,
    queries,
    quoteService,
    service: createAdminPosService({ queries, quoteService })
  };
}

test("catalog sync validates the full payload before writing any mirror data", async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    () =>
      service.syncCatalog(
        {
          customers: [
            { id: "customer-1", name: "One" },
            { id: "customer-1", name: "Duplicate" }
          ],
          items: [{ id: "item-1", code: "A", name: "Item" }],
          sourceVersion: 3
        },
        viewer
      ),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      /Duplicate PORS customer id/.test(error.message)
  );

  assert.equal(calls.upsertCustomers.length, 0);
  assert.equal(calls.upsertItems.length, 0);
});

test("unlinked buyers are priced as a zero-discount general customer", async () => {
  const { service } = createHarness();

  const result = await service.previewPrice(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "preview-1",
      items: [{ id: "line-1", preparedQuantity: 2 }]
    },
    viewer
  );

  assert.equal(result.pricing.customer.linked, false);
  assert.equal(result.pricing.appliedDiscountRate, 0);
  assert.equal(result.pricing.subtotal, 4_000);
  assert.equal(result.pricing.vatAmount, 400);
  assert.equal(result.pricing.totalAmount, 4_400);
  assert.equal(result.state.version, 2);
});

test("partial picking requires a cancellation reason and releases the claimed version", async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    () =>
      service.savePicking(
        "quote-1",
        {
          expectedVersion: 1,
          idempotencyKey: "pick-1",
          items: [{ id: "line-1", preparedQuantity: 1 }]
        },
        viewer
      ),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      /cancellation reason is required/i.test(error.message)
  );

  assert.equal(calls.updates.length, 0);
  assert.equal(calls.restores.length, 1);
  assert.equal(calls.clears.length, 1);
});

test("saving changed picking results invalidates the previous internal finalization", async () => {
  const { service, calls } = createHarness();

  const result = await service.savePicking(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "pick-after-finalize",
      items: [
        {
          id: "line-1",
          preparedQuantity: 1,
          cancellationReason: "out_of_stock"
        }
      ]
    },
    viewer
  );

  assert.equal(calls.pickingStates.length, 1);
  assert.equal(calls.pickingStates[0].invalidateFinalization, true);
  assert.equal(result.pos.state.finalizedSnapshot, null);
  assert.equal(result.pos.state.finalizedAt, null);
});

test("internal finalization stores the server-priced snapshot without publishing a document", async () => {
  const { service, calls } = createHarness();

  const result = await service.finalizeQuote(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "finalize-1",
      items: [
        {
          id: "line-1",
          preparedQuantity: 2
        }
      ]
    },
    viewer
  );

  assert.equal(calls.updates.length, 1);
  assert.equal(calls.issues.length, 0);
  assert.equal(result.issue, null);
  assert.equal(result.pos.pricing.totalAmount, 4_400);
  assert.equal(result.pos.finalizedSnapshot.items[0].requestedQuantity, 2);
  assert.equal(result.pos.finalizedSnapshot.items[0].preparedQuantity, 2);
  assert.equal(result.pos.finalizedSnapshot.items[0].cancelledQuantity, 0);
  assert.equal(result.pos.finalizedSnapshot.items[0].imageUrl, "https://example.com/clover.webp");
  assert.deepEqual(result.sideEffects, {
    saleCreated: false,
    orderCreated: false,
    paymentCreated: false,
    stockChanged: false
  });
});

test("customer publication issues one document from the finalized snapshot", async () => {
  const finalizedSnapshot = {
    calculationVersion: "noblesse-online-quote-v2",
    items: createQuoteDetail().items,
    pricing: {
      subtotal: 3_600,
      supplyAmount: 3_600,
      vatAmount: 360,
      totalAmount: 3_960,
      priceBands: [{ unitPrice: 1_800, quantity: 2, subtotal: 3_600 }]
    }
  };
  const { service, calls } = createHarness({
    queries: {
      getQuoteState: async () => ({
        quoteId: "quote-1",
        version: 1,
        deductionAmount: 0,
        finalizedSnapshot
      })
    }
  });

  const result = await service.publishQuote(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "publish-1"
    },
    viewer
  );

  assert.equal(calls.issues.length, 1);
  assert.equal(calls.issues[0].pricingSummary.totalAmount, 3_960);
  assert.equal(calls.publications.length, 1);
  assert.equal(calls.publications[0].documentId, "document-1");
  assert.equal(result.pos.publishedSnapshot.document.version, 1);
  assert.deepEqual(result.sideEffects, {
    saleCreated: false,
    orderCreated: false,
    paymentCreated: false,
    stockChanged: false
  });
});

test("stale customer publication is rejected before a document is issued", async () => {
  const finalizedSnapshot = {
    pricing: {
      subtotal: 4_000,
      supplyAmount: 4_000,
      vatAmount: 400,
      totalAmount: 4_400,
      priceBands: [{ unitPrice: 2_000, quantity: 2, subtotal: 4_000 }]
    }
  };
  const { service, calls } = createHarness({
    queries: {
      getQuoteState: async () => ({
        quoteId: "quote-1",
        version: 2,
        finalizedSnapshot
      }),
      claimQuoteVersion: async () => ({ claimed: false, state: null })
    }
  });

  await assert.rejects(
    () =>
      service.publishQuote(
        "quote-1",
        {
          expectedVersion: 1,
          idempotencyKey: "publish-stale"
        },
        viewer
      ),
    (error) => error.code === "CONFLICT"
  );

  assert.equal(calls.issues.length, 0);
  assert.equal(calls.publications.length, 0);
});

test("linking an existing PORS receipt never creates a receipt or a sale", async () => {
  const { service, calls } = createHarness({
    queries: {
      getQuoteState: async () => ({
        quoteId: "quote-1",
        version: 1,
        publishedAt: "2026-07-30T00:00:00Z"
      })
    }
  });

  const result = await service.linkReceipt(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "receipt-link-1",
      receiptId: "existing-receipt-1",
      receiptSnapshot: { totalAmount: 3_960 }
    },
    viewer
  );

  assert.equal(calls.receiptLinks.length, 1);
  assert.equal(calls.receiptLinks[0].receiptId, "existing-receipt-1");
  assert.deepEqual(result.sideEffects, {
    receiptCreated: false,
    saleCreated: false,
    orderCreated: false,
    paymentCreated: false,
    stockChanged: false
  });
});

test("completed idempotent requests replay the stored response without executing quote work", async () => {
  const replay = { replayed: true, state: { version: 7 } };
  let quoteReads = 0;
  const { service } = createHarness({
    queries: {
      beginIdempotency: async () => ({
        claimed: false,
        completed: true,
        responseBody: replay
      })
    },
    quoteService: {
      getQuoteById: async () => {
        quoteReads += 1;
        return createQuoteDetail();
      }
    }
  });

  const result = await service.previewPrice(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "preview-replay",
      items: []
    },
    viewer
  );

  assert.deepEqual(result, replay);
  assert.equal(quoteReads, 0);
});

test("permanent customer discount changes require explicit confirmation", async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    () =>
      service.updateCustomer(
        "customer-1",
        { discountRate: 7 },
        viewer
      ),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      /confirmPermanentPricing/.test(error.message)
  );
  assert.equal(calls.upsertCustomers.length, 0);

  await service.updateCustomer(
    "customer-1",
    {
      discountRate: 7,
      confirmPermanentPricing: true
    },
    viewer
  );
  assert.equal(calls.upsertCustomers[0].discountRate, 7);
});
