import { randomUUID } from "node:crypto";
import {
  conflict,
  notFound,
  validationError
} from "../utils/errors.js";
import {
  CALCULATION_VERSION,
  calculatePosQuote
} from "./posQuotePricing.js";

const asText = (value) => String(value ?? "").trim();

const asOptionalText = (value) => {
  const normalized = asText(value);
  return normalized || null;
};

const asNonNegativeNumber = (value, field) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw validationError(`${field} must be a non-negative number.`);
  }
  return parsed;
};

const asQuantity = (value, field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError(`${field} must be a non-negative integer.`);
  }
  return parsed;
};

const asExpectedVersion = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw validationError("expectedVersion must be a positive integer.");
  }
  return parsed;
};

const asSourceVersion = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError("sourceVersion must be a non-negative integer.");
  }
  return parsed;
};

const asPercentage = (value, field) => {
  const parsed = asNonNegativeNumber(value, field);
  if (parsed > 100) {
    throw validationError(`${field} must be between 0 and 100.`);
  }
  return parsed;
};

const asRequiredText = (value, field, maximumLength = 200) => {
  const normalized = asText(value);
  if (!normalized || normalized.length > maximumLength) {
    throw validationError(
      `${field} is required and must be ${maximumLength} characters or fewer.`
    );
  }
  return normalized;
};

const asObject = (value, field) => {
  if (
    value === undefined ||
    value === null
  ) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw validationError(`${field} must be an object.`);
  }
  return value;
};

const requireIdempotencyKey = (value) => {
  const key = asText(value);
  if (!key || key.length > 200) {
    throw validationError(
      "idempotencyKey is required and must be 200 characters or fewer."
    );
  }
  return key;
};

const resolveActorUid = (viewer) => {
  const actorUid = asText(viewer?.authUid || viewer?.userId);
  if (!actorUid) {
    throw validationError("An authenticated operator is required.");
  }
  return actorUid;
};

const normalizeCountryCode = (value) =>
  asText(value).toUpperCase().replace(/[^A-Z-]/g, "");

const makeGeneralCustomer = (quote) => {
  const country = normalizeCountryCode(quote?.buyerCountry);
  const isOverseas = Boolean(country && country !== "KR");
  return {
    id: null,
    name: asText(quote?.companyName) || "General customer",
    discountRate: 0,
    vatEnabled: !isOverseas,
    isOverseas,
    isActive: true,
    pricingRules: {},
    connectionStatus: "unlinked"
  };
};

const toCustomerSnapshot = (customer) => ({
  id: customer?.id || null,
  name: asText(customer?.name) || "General customer",
  discountRate: Number(customer?.discountRate || 0),
  vatEnabled: Boolean(customer?.vatEnabled),
  isOverseas: Boolean(customer?.isOverseas),
  pricingRules: customer?.pricingRules || {},
  connectionStatus: customer?.id ? "linked" : "unlinked"
});

const normalizeItemsById = (items) => {
  const result = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const id = asText(item?.id || item?.itemId);
    if (!id) {
      throw validationError("Each item requires an id.");
    }
    if (result.has(id)) {
      throw validationError(`Duplicate quote item id: ${id}`);
    }
    result.set(id, item);
  }
  return result;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const createAdminQuoteUpdate = ({
  detail,
  pricing,
  submittedItems,
  validUntil,
  documentLocale
}) => {
  const pricingByItemId = new Map(
    pricing.lines.map((line) => [String(line.itemId), line])
  );

  return {
    leadTime: detail.quote.leadTime || "",
    shippingNote: detail.quote.shippingNote || "",
    validUntil:
      asOptionalText(validUntil) ||
      detail.quote.validUntil ||
      addDays(new Date(), 7),
    documentLocale:
      asOptionalText(documentLocale) ||
      detail.quote.documentLocale ||
      "kr",
    customerNote: detail.quote.customerNote || "",
    adminMemo: detail.quote.adminMemo || "",
    items: detail.items.map((item) => {
      const submitted = submittedItems.get(String(item.id)) || {};
      const priced = pricingByItemId.get(String(item.id));
      const requestedQuantity = asQuantity(
        item.requestedQuantity,
        `items.${item.id}.requestedQuantity`
      );
      const preparedQuantity = priced?.preparedQuantity ?? requestedQuantity;
      const cancelledQuantity = requestedQuantity - preparedQuantity;
      const cancellationReason =
        cancelledQuantity > 0
          ? asOptionalText(
              submitted.cancellationReason || item.cancellationReason
            )
          : null;
      const cancellationNote =
        cancelledQuantity > 0
          ? asOptionalText(
              submitted.cancellationNote || item.cancellationNote
            )
          : null;

      if (cancelledQuantity > 0 && !cancellationReason) {
        throw validationError(
          `A cancellation reason is required for quote item ${item.id}.`
        );
      }

      return {
        id: item.id,
        confirmedQuantity: preparedQuantity,
        confirmedUnitPrice: priced?.unitPrice ?? item.confirmedUnitPrice,
        itemNote:
          submitted.itemNote === undefined
            ? item.itemNote || ""
            : asText(submitted.itemNote),
        fulfillmentStatus:
          preparedQuantity === 0
            ? "cancelled"
            : preparedQuantity === requestedQuantity
              ? "ready"
              : "partial",
        cancellationReason,
        cancellationNote
      };
    })
  };
};

export function createAdminPosService({ queries, quoteService }) {
  if (!queries) {
    throw new Error("POS quote queries are required.");
  }
  if (!quoteService) {
    throw new Error("Admin quote service is required.");
  }

  const withIdempotency = async ({
    operation,
    idempotencyKey,
    viewer,
    execute
  }) => {
    const actorUid = resolveActorUid(viewer);
    const normalizedKey = requireIdempotencyKey(idempotencyKey);
    const claimed = await queries.beginIdempotency(
      actorUid,
      operation,
      normalizedKey
    );

    if (claimed.completed) {
      return claimed.responseBody;
    }
    if (!claimed.claimed) {
      throw conflict(
        "This operation is already in progress. Refresh before retrying."
      );
    }

    try {
      const response = await execute(actorUid);
      await queries.completeIdempotency(
        actorUid,
        operation,
        normalizedKey,
        200,
        response
      );
      return response;
    } catch (error) {
      await queries
        .clearIdempotency(actorUid, operation, normalizedKey)
        .catch(() => {});
      throw error;
    }
  };

  const loadQuoteContext = async (quoteId, viewer) => {
    const detail = await quoteService.getQuoteById(quoteId, viewer);
    if (!detail?.quote) {
      throw notFound("Quote not found.");
    }

    const [state, linkedCustomer, productMappings] = await Promise.all([
      queries.getQuoteState(quoteId),
      detail.quote.buyerId
        ? queries.getBuyerCustomer(detail.quote.buyerId)
        : Promise.resolve(null),
      queries.getProductMappings(
        detail.items.map((item) => item.productId).filter(Boolean)
      )
    ]);

    const customer =
      linkedCustomer?.isActive === true
        ? {
            ...linkedCustomer,
            connectionStatus: "linked"
          }
        : makeGeneralCustomer(detail.quote);

    const productMappingsById = new Map(
      productMappings.map((entry) => [
        String(entry.productId),
        entry.item
      ])
    );

    return {
      detail,
      state,
      customer,
      productMappings: productMappingsById
    };
  };

  const calculateContextPricing = ({
    context,
    body,
    submittedItems
  }) => {
    const requestedItems = context.detail.items.map((item) => {
      const submitted = submittedItems.get(String(item.id)) || {};
      const mapping = item.productId
        ? context.productMappings.get(String(item.productId))
        : null;
      const requestedQuantity = asQuantity(
        item.requestedQuantity,
        `items.${item.id}.requestedQuantity`
      );
      const preparedQuantity =
        submitted.preparedQuantity === undefined
          ? Number(item.confirmedQuantity ?? requestedQuantity)
          : asQuantity(
              submitted.preparedQuantity,
              `items.${item.id}.preparedQuantity`
            );

      if (preparedQuantity > requestedQuantity) {
        throw validationError(
          `Prepared quantity cannot exceed requested quantity for item ${item.id}.`
        );
      }

      const mappedItem = mapping?.isActive === true ? mapping : null;

      return {
        itemId: item.id,
        productId: item.productId,
        posItemId: mappedItem?.id || null,
        requestedQuantity,
        preparedQuantity,
        baseUnitPrice:
          mappedItem?.basePrice ?? item.requestedPriceSnapshot ?? 0,
        discountable: mappedItem?.discountable !== false,
        priceSource: mappedItem ? "pors" : "site_snapshot",
        overrideUnitPrice:
          submitted.overrideUnitPrice === undefined ||
          submitted.overrideUnitPrice === null ||
          submitted.overrideUnitPrice === ""
            ? null
            : asNonNegativeNumber(
                submitted.overrideUnitPrice,
                `items.${item.id}.overrideUnitPrice`
              ),
        overrideReason: asOptionalText(submitted.overrideReason)
      };
    });

    return calculatePosQuote({
      customer: context.customer,
      lines: requestedItems,
      deductionAmount: asNonNegativeNumber(
        body.deductionAmount ??
          context.state?.deductionAmount ??
          0,
        "deductionAmount"
      )
    });
  };

  const claimQuoteVersion = async ({
    quoteId,
    expectedVersion,
    actorUid
  }) => {
    const version = asExpectedVersion(expectedVersion);
    const claim = await queries.claimQuoteVersion(
      quoteId,
      version,
      actorUid
    );
    if (!claim.claimed) {
      throw conflict(
        "This quote was changed by another operator. Refresh and review the latest version."
      );
    }
    return {
      previousVersion: version,
      claimedVersion: claim.state.version,
      state: claim.state
    };
  };

  const restoreClaim = async ({
    quoteId,
    claim,
    actorUid
  }) => {
    if (!claim) {
      return;
    }
    await queries
      .restoreQuoteVersion(
        quoteId,
        claim.claimedVersion,
        claim.previousVersion,
        actorUid
      )
      .catch(() => {});
  };

  const getCapabilities = async () => ({
    version: 1,
    calculationVersion: CALCULATION_VERSION,
    features: {
      readQuotes: true,
      savePicking: true,
      pricePreview: true,
      finalizeQuote: true,
      customerLinking: true,
      productLinking: true,
      createsSale: false,
      createsOrder: false,
      createsPayment: false,
      changesStock: false,
      offlineWrites: false
    }
  });

  const listQuotes = async (filters, viewer) => {
    const result = await quoteService.listQuotes(filters, viewer);
    const quotes = Array.isArray(result?.quotes) ? result.quotes : [];
    const states = await queries.getQuoteStates(
      quotes.map((quote) => quote.id)
    );
    const stateByQuoteId = new Map(
      states.map((state) => [String(state.quoteId), state])
    );

    const enriched = await Promise.all(
      quotes.map(async (quote) => {
        const customer = quote.buyerId
          ? await queries.getBuyerCustomer(quote.buyerId)
          : null;
        const state = stateByQuoteId.get(String(quote.id)) || null;
        return {
          ...quote,
          pos: {
            version: state?.version || 1,
            connectionStatus:
              customer?.isActive === true ? "linked" : "unlinked",
            customer: customer?.isActive === true
              ? toCustomerSnapshot(customer)
              : toCustomerSnapshot(makeGeneralCustomer(quote)),
            finalizedAt: state?.finalizedAt || null,
            pricing: state?.lastPreview || null
          }
        };
      })
    );

    return {
      ...result,
      quotes: enriched
    };
  };

  const getQuoteById = async (quoteId, viewer) => {
    const context = await loadQuoteContext(quoteId, viewer);
    return {
      ...context.detail,
      pos: {
        state: context.state,
        customer: toCustomerSnapshot(context.customer),
        productMappings: Array.from(context.productMappings.entries()).map(
          ([productId, mapping]) => ({
            productId,
            posItemId: mapping?.id || null,
            posItem: mapping || null
          })
        )
      }
    };
  };

  const savePicking = async (quoteId, body, viewer) =>
    withIdempotency({
      operation: `pos.quote.picking:${quoteId}`,
      idempotencyKey: body?.idempotencyKey,
      viewer,
      execute: async (actorUid) => {
        const context = await loadQuoteContext(quoteId, viewer);
        const submittedItems = normalizeItemsById(body?.items);
        let claim;

        try {
          claim = await claimQuoteVersion({
            quoteId,
            expectedVersion: body?.expectedVersion,
            actorUid
          });
          const pricing = calculateContextPricing({
            context,
            body: body || {},
            submittedItems
          });
          const update = createAdminQuoteUpdate({
            detail: context.detail,
            pricing,
            submittedItems,
            validUntil: body?.validUntil,
            documentLocale: body?.documentLocale
          });

          await quoteService.updateQuote(quoteId, update, viewer);
          const state = await queries.savePickingState(
            quoteId,
            claim.claimedVersion,
            {
              posCustomerId: context.customer.id,
              customerSnapshot: toCustomerSnapshot(context.customer),
              deductionAmount: pricing.deductionAmount,
              lastPreview: pricing
            },
            actorUid
          );

          if (!state) {
            throw conflict(
              "This quote changed while the picking result was being saved."
            );
          }

          return {
            quote: await quoteService.getQuoteById(quoteId, viewer),
            pos: {
              state,
              customer: toCustomerSnapshot(context.customer),
              pricing
            }
          };
        } catch (error) {
          await restoreClaim({ quoteId, claim, actorUid });
          throw error;
        }
      }
    });

  const previewPrice = async (quoteId, body, viewer) =>
    withIdempotency({
      operation: `pos.quote.preview:${quoteId}`,
      idempotencyKey: body?.idempotencyKey,
      viewer,
      execute: async (actorUid) => {
        const context = await loadQuoteContext(quoteId, viewer);
        const submittedItems = normalizeItemsById(body?.items);
        let claim;

        try {
          claim = await claimQuoteVersion({
            quoteId,
            expectedVersion: body?.expectedVersion,
            actorUid
          });
          const pricing = calculateContextPricing({
            context,
            body: body || {},
            submittedItems
          });
          const state = await queries.savePickingState(
            quoteId,
            claim.claimedVersion,
            {
              posCustomerId: context.customer.id,
              customerSnapshot: toCustomerSnapshot(context.customer),
              deductionAmount: pricing.deductionAmount,
              lastPreview: pricing
            },
            actorUid
          );

          if (!state) {
            throw conflict(
              "This quote changed while the price preview was being saved."
            );
          }

          return {
            state,
            customer: toCustomerSnapshot(context.customer),
            pricing
          };
        } catch (error) {
          await restoreClaim({ quoteId, claim, actorUid });
          throw error;
        }
      }
    });

  const finalizeQuote = async (quoteId, body, viewer) =>
    withIdempotency({
      operation: `pos.quote.finalize:${quoteId}`,
      idempotencyKey: body?.idempotencyKey,
      viewer,
      execute: async (actorUid) => {
        const context = await loadQuoteContext(quoteId, viewer);
        const submittedItems = normalizeItemsById(body?.items);
        let claim;
        let issued = null;

        try {
          claim = await claimQuoteVersion({
            quoteId,
            expectedVersion: body?.expectedVersion,
            actorUid
          });
          const pricing = calculateContextPricing({
            context,
            body: body || {},
            submittedItems
          });
          const update = createAdminQuoteUpdate({
            detail: context.detail,
            pricing,
            submittedItems,
            validUntil: body?.validUntil,
            documentLocale: body?.documentLocale
          });

          await quoteService.updateQuote(quoteId, update, viewer);
          issued = await quoteService.issueQuote(quoteId, viewer, {
            pricingSummary: pricing
          });
          const finalized = await queries.saveFinalizedState(
            quoteId,
            claim.claimedVersion,
            {
              calculationVersion: CALCULATION_VERSION,
              snapshot: pricing,
              posCustomerId: context.customer.id,
              customerSnapshot: toCustomerSnapshot(context.customer),
              deductionAmount: pricing.deductionAmount,
              documentId: issued.document.id
            },
            actorUid
          );

          if (!finalized?.state) {
            throw conflict(
              "The quote document was issued, but final POS state confirmation failed. Refresh before retrying."
            );
          }

          return {
            quote: await quoteService.getQuoteById(quoteId, viewer),
            issue: issued,
            pos: {
              ...finalized,
              customer: toCustomerSnapshot(context.customer),
              pricing
            },
            sideEffects: {
              saleCreated: false,
              orderCreated: false,
              paymentCreated: false,
              stockChanged: false
            }
          };
        } catch (error) {
          if (!issued) {
            await restoreClaim({ quoteId, claim, actorUid });
          }
          throw error;
        }
      }
    });

  const listCustomers = async (filters) => queries.listCustomers(filters);

  const syncCatalog = async (body, viewer) => {
    const customers = Array.isArray(body?.customers) ? body.customers : [];
    const items = Array.isArray(body?.items) ? body.items : [];
    if (customers.length > 1000 || items.length > 1000) {
      throw validationError(
        "Catalog sync supports at most 1000 customers and 1000 items per request."
      );
    }

    const sourceVersion = asSourceVersion(body?.sourceVersion);
    const actorUid = resolveActorUid(viewer);
    const customerIds = new Set();
    const itemIds = new Set();

    const normalizedCustomers = customers.map((customer, index) => {
      const id = asRequiredText(
        customer?.id,
        `customers.${index}.id`
      );
      if (customerIds.has(id)) {
        throw validationError(`Duplicate PORS customer id: ${id}`);
      }
      customerIds.add(id);
      return {
        id,
        name: asRequiredText(
          customer?.name,
          `customers.${index}.name`
        ),
        discountRate: asPercentage(
          customer?.discountRate ?? 0,
          `customers.${index}.discountRate`
        ),
        vatEnabled: customer?.vatEnabled !== false,
        isOverseas: Boolean(customer?.isOverseas),
        isActive: customer?.isActive !== false,
        pricingRules: asObject(
          customer?.pricingRules,
          `customers.${index}.pricingRules`
        ),
        sourceVersion,
        actorUid
      };
    });

    const normalizedItems = items.map((item, index) => {
      const id = asRequiredText(item?.id, `items.${index}.id`);
      if (itemIds.has(id)) {
        throw validationError(`Duplicate PORS item id: ${id}`);
      }
      itemIds.add(id);
      return {
        id,
        code: asRequiredText(item?.code, `items.${index}.code`),
        name: asRequiredText(item?.name, `items.${index}.name`),
        categoryId: asOptionalText(item?.categoryId),
        basePrice: asNonNegativeNumber(
          item?.basePrice ?? 0,
          `items.${index}.basePrice`
        ),
        discountable: item?.discountable !== false,
        isActive: item?.isActive !== false,
        pricingRules: asObject(
          item?.pricingRules,
          `items.${index}.pricingRules`
        ),
        sourceVersion,
        actorUid
      };
    });

    for (const customer of normalizedCustomers) {
      await queries.upsertCustomer(customer);
    }
    for (const item of normalizedItems) {
      await queries.upsertItem(item);
    }

    return {
      sourceVersion,
      customersSynced: normalizedCustomers.length,
      itemsSynced: normalizedItems.length,
      syncedAt: new Date().toISOString()
    };
  };

  const createCustomer = async (body, viewer) => {
    const name = asText(body?.name);
    if (!name) {
      throw validationError("Customer name is required.");
    }
    if (
      body?.discountRate !== undefined &&
      body?.confirmPermanentPricing !== true
    ) {
      throw validationError(
        "confirmPermanentPricing is required to save a permanent customer discount."
      );
    }

    return queries.upsertCustomer({
      id: asOptionalText(body?.id) || `manual:${randomUUID()}`,
      name,
      discountRate: asPercentage(
        body?.discountRate ?? 0,
        "discountRate"
      ),
      vatEnabled: body?.vatEnabled !== false,
      isOverseas: Boolean(body?.isOverseas),
      isActive: body?.isActive !== false,
      pricingRules: body?.pricingRules || {},
      sourceVersion: body?.sourceVersion ?? 0,
      actorUid: resolveActorUid(viewer)
    });
  };

  const updateCustomer = async (customerId, body, viewer) => {
    const customer = await queries.getCustomerById(customerId);
    if (!customer) {
      throw notFound("PORS customer not found.");
    }
    if (
      body?.discountRate !== undefined &&
      body?.confirmPermanentPricing !== true
    ) {
      throw validationError(
        "confirmPermanentPricing is required to save a permanent customer discount."
      );
    }

    return queries.upsertCustomer({
      ...customer,
      ...body,
      id: customerId,
      name: asText(body?.name ?? customer.name),
      discountRate: asPercentage(
        body?.discountRate ?? customer.discountRate,
        "discountRate"
      ),
      pricingRules: body?.pricingRules ?? customer.pricingRules ?? {},
      actorUid: resolveActorUid(viewer)
    });
  };

  const linkBuyer = async (buyerId, body, viewer) => {
    const customerId = asText(body?.posCustomerId);
    if (!customerId) {
      throw validationError("posCustomerId is required.");
    }
    return queries.linkBuyer(
      buyerId,
      customerId,
      resolveActorUid(viewer)
    );
  };

  const listItems = async (filters) => queries.listItems(filters);

  const updateItem = async (itemId, body, viewer) => {
    const code = asText(body?.code);
    const name = asText(body?.name);
    if (!code || !name) {
      throw validationError("PORS item code and name are required.");
    }
    return queries.upsertItem({
      id: itemId,
      code,
      name,
      categoryId: asOptionalText(body?.categoryId),
      basePrice: asNonNegativeNumber(body?.basePrice ?? 0, "basePrice"),
      discountable: body?.discountable !== false,
      isActive: body?.isActive !== false,
      pricingRules: body?.pricingRules || {},
      sourceVersion: body?.sourceVersion ?? 0,
      actorUid: resolveActorUid(viewer)
    });
  };

  const linkProduct = async (productId, body, viewer) => {
    const itemId = asText(body?.posItemId);
    if (!itemId) {
      throw validationError("posItemId is required.");
    }
    return queries.linkProduct(
      productId,
      itemId,
      resolveActorUid(viewer)
    );
  };

  return {
    getCapabilities,
    listQuotes,
    getQuoteById,
    savePicking,
    previewPrice,
    finalizeQuote,
    syncCatalog,
    listCustomers,
    createCustomer,
    updateCustomer,
    linkBuyer,
    listItems,
    updateItem,
    linkProduct
  };
}
