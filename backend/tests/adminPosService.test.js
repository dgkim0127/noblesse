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
    savePickingState: async (_quoteId, version, input) => ({
      quoteId: "quote-1",
      version,
      ...input
    }),
    saveFinalizedState: async (_quoteId, version, input) => ({
      state: { quoteId: "quote-1", version, finalizedAt: "2026-07-23T00:00:00Z" },
      priceSnapshot: { id: "snapshot-1", ...input }
    }),
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
      return { document: { id: "document-1" } };
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

test("finalizing issues the server-priced document without creating sales or stock movement", async () => {
  const { service, calls } = createHarness();

  const result = await service.finalizeQuote(
    "quote-1",
    {
      expectedVersion: 1,
      idempotencyKey: "finalize-1",
      items: [
        {
          id: "line-1",
          preparedQuantity: 2,
          overrideUnitPrice: 1_800,
          overrideReason: "Counter price confirmation"
        }
      ]
    },
    viewer
  );

  assert.equal(calls.updates.length, 1);
  assert.equal(calls.issues.length, 1);
  assert.equal(calls.issues[0].pricingSummary.totalAmount, 3_960);
  assert.deepEqual(result.sideEffects, {
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
