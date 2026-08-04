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
    vatEnabled: true,
    isOverseas,
    isActive: true,
    pricingRules: {},
    connectionStatus: "unlinked"
  };
};

const toCustomerSnapshot = (customer) => ({
  id: customer?.id || null,
  name: asText(customer?.name) || "General customer",
  discountRate: 0,
  vatEnabled: true,
  isOverseas: Boolean(customer?.isOverseas),
  pricingRules: {},
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
  body
}) => {
  const pricingByItemId = new Map(
    pricing.lines.map((line) => [String(line.itemId), line])
  );

  return {
    leadTime:
      body?.leadTime === undefined
        ? detail.quote.leadTime || ""
        : asText(body.leadTime),
    shippingNote:
      body?.shippingNote === undefined
        ? detail.quote.shippingNote || ""
        : asText(body.shippingNote),
    validUntil:
      asOptionalText(body?.validUntil) ||
      detail.quote.validUntil ||
      addDays(new Date(), 7),
    documentLocale:
      asOptionalText(body?.documentLocale) ||
      detail.quote.documentLocale ||
      "kr",
    customerNote:
      body?.customerNote === undefined
        ? detail.quote.customerNote || ""
        : asText(body.customerNote),
    adminMemo:
      body?.adminMemo === undefined
        ? detail.quote.adminMemo || ""
        : asText(body.adminMemo),
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

const resolveImageUrl = (item) =>
  item?.imageUrl ||
  item?.imageSet?.thumb ||
  item?.imageSet?.card ||
  null;

const createFinalizedSnapshot = ({
  context,
  pricing,
  submittedItems
}) => {
  const pricingByItemId = new Map(
    pricing.lines.map((line) => [String(line.itemId), line])
  );

  return {
    schemaVersion: 2,
    calculationVersion: CALCULATION_VERSION,
    finalizedAt: new Date().toISOString(),
    quoteId: context.detail.quote.id,
    quoteNumber: context.detail.quote.quoteNumber || null,
    customer: toCustomerSnapshot(context.customer),
    items: context.detail.items.map((item) => {
      const submitted = submittedItems.get(String(item.id)) || {};
      const priced = pricingByItemId.get(String(item.id));
      return {
        itemId: item.id,
        productId: item.productId || null,
        productCode: item.productCode || item.code || null,
        productName: item.productName || item.name || null,
        imageSet: item.imageSet || null,
        imageUrl: resolveImageUrl(item),
        selectedOptions: Array.isArray(item.selectedOptions)
          ? item.selectedOptions
          : [],
        requestedQuantity: priced?.requestedQuantity || 0,
        preparedQuantity: priced?.preparedQuantity || 0,
        cancelledQuantity: priced?.cancelledQuantity || 0,
        cancellationReason:
          priced?.cancelledQuantity > 0
            ? asOptionalText(
                submitted.cancellationReason || item.cancellationReason
              )
            : null,
        cancellationNote:
          priced?.cancelledQuantity > 0
            ? asOptionalText(
                submitted.cancellationNote || item.cancellationNote
              )
            : null,
        baseUnitPrice: priced?.baseUnitPrice || 0,
        unitPrice: priced?.unitPrice || 0,
        lineSubtotal: priced?.lineSubtotal || 0,
        priceSource: priced?.priceSource || "site_snapshot",
        overrideReason: priced?.overrideReason || null
      };
    }),
    pricing
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

    const [state, productMappings] = await Promise.all([
      queries.getQuoteState(quoteId),
      queries.getProductMappings(
        detail.items.map((item) => item.productId).filter(Boolean)
      )
    ]);

    // Website-originated quotes are never connected to a PORS customer.
    // PORS customer discounts remain available for normal sales only.
    const customer = makeGeneralCustomer(detail.quote);

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

      if (
        submitted.overrideUnitPrice !== undefined ||
        submitted.overrideReason !== undefined
      ) {
        throw validationError(
          "Online quotes must use the request-time unit price without overrides."
        );
      }

      return {
        itemId: item.id,
        productId: item.productId,
        posItemId: mapping?.isActive === true ? mapping.id : null,
        requestedQuantity,
        preparedQuantity,
        baseUnitPrice:
          item.requestedPriceSnapshot ??
          item.confirmedUnitPrice ??
          0,
        discountable: false,
        priceSource: "site_snapshot"
      };
    });

    const requestedDeduction = asNonNegativeNumber(
      body.deductionAmount ?? 0,
      "deductionAmount"
    );
    if (requestedDeduction !== 0) {
      throw validationError(
        "Online quotes do not support deductions or customer discounts."
      );
    }

    return calculatePosQuote({
      customer: toCustomerSnapshot(context.customer),
      lines: requestedItems,
      deductionAmount: 0
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
    version: 2,
    calculationVersion: CALCULATION_VERSION,
    features: {
      readQuotes: true,
      savePicking: true,
      pricePreview: true,
      finalizeQuote: true,
      publishQuote: true,
      linkReceipt: true,
      unifiedRecords: true,
      deviceRegistration: false,
      pushNotifications: false,
      customerLinking: false,
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

    const enriched = quotes.map((quote) => {
        const state = stateByQuoteId.get(String(quote.id)) || null;
        return {
          ...quote,
          pos: {
            version: state?.version || 1,
            connectionStatus: "unlinked",
            customer: toCustomerSnapshot(makeGeneralCustomer(quote)),
            finalizedAt: state?.finalizedAt || null,
            publishedAt: state?.publishedAt || null,
            linkedReceiptId: state?.linkedReceiptId || null,
            linkedReceiptSnapshot: state?.linkedReceiptSnapshot || null,
            pricing:
              state?.publishedSnapshot?.pricing ||
              state?.finalizedSnapshot?.pricing ||
              state?.lastPreview ||
              null
          }
        };
      });

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
            body
          });

          await quoteService.updateQuote(quoteId, update, viewer);
          const state = await queries.savePickingState(
            quoteId,
            claim.claimedVersion,
            {
              posCustomerId: context.customer.id,
              customerSnapshot: toCustomerSnapshot(context.customer),
              deductionAmount: pricing.deductionAmount,
              lastPreview: pricing,
              invalidateFinalization: true
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
              lastPreview: pricing,
              invalidateFinalization: false
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
            body
          });

          await quoteService.updateQuote(quoteId, update, viewer);
          const snapshot = createFinalizedSnapshot({
            context,
            pricing,
            submittedItems
          });
          const finalized = await queries.saveFinalizedState(
            quoteId,
            claim.claimedVersion,
            {
              calculationVersion: CALCULATION_VERSION,
              snapshot,
              posCustomerId: context.customer.id,
              customerSnapshot: toCustomerSnapshot(context.customer),
              deductionAmount: 0
            },
            actorUid
          );

          if (!finalized?.state) {
            throw conflict(
              "The quote changed while its internal finalization was being saved."
            );
          }

          return {
            quote: await quoteService.getQuoteById(quoteId, viewer),
            issue: null,
            pos: {
              ...finalized,
              customer: toCustomerSnapshot(context.customer),
              pricing,
              finalizedSnapshot: snapshot
            },
            sideEffects: {
              saleCreated: false,
              orderCreated: false,
              paymentCreated: false,
              stockChanged: false
            }
          };
        } catch (error) {
          await restoreClaim({ quoteId, claim, actorUid });
          throw error;
        }
      }
    });

  const publishQuote = async (quoteId, body, viewer) =>
    withIdempotency({
      operation: `pos.quote.publish:${quoteId}`,
      idempotencyKey: body?.idempotencyKey,
      viewer,
      execute: async (actorUid) => {
        const context = await loadQuoteContext(quoteId, viewer);
        const finalizedSnapshot = context.state?.finalizedSnapshot;
        if (!finalizedSnapshot?.pricing) {
          throw validationError(
            "The quote must be internally finalized before customer publication."
          );
        }

        let claim;
        let issued = null;
        try {
          claim = await claimQuoteVersion({
            quoteId,
            expectedVersion: body?.expectedVersion,
            actorUid
          });
          issued = await quoteService.issueQuote(quoteId, viewer, {
            pricingSummary: finalizedSnapshot.pricing
          });
          const publishedAt = new Date().toISOString();
          const snapshot = {
            ...finalizedSnapshot,
            publishedAt,
            document: {
              id: issued.document.id,
              version: issued.document.version || null,
              documentNumber: issued.document.documentNumber || null
            }
          };
          const state = await queries.savePublishedState(
            quoteId,
            claim.claimedVersion,
            {
              snapshot,
              documentId: issued.document.id,
              publishedAt
            },
            actorUid
          );

          if (!state) {
            throw conflict(
              "The quote document was issued, but publication confirmation failed. Refresh before retrying."
            );
          }

          return {
            quote: await quoteService.getQuoteById(quoteId, viewer),
            issue: issued,
            pos: {
              state,
              publishedSnapshot: snapshot,
              customer: toCustomerSnapshot(context.customer),
              pricing: finalizedSnapshot.pricing
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

  const linkReceipt = async (quoteId, body, viewer) =>
    withIdempotency({
      operation: `pos.quote.receipt-link:${quoteId}`,
      idempotencyKey: body?.idempotencyKey,
      viewer,
      execute: async (actorUid) => {
        const context = await loadQuoteContext(quoteId, viewer);
        if (!context.state?.publishedAt) {
          throw validationError(
            "Only a customer-published quote can be linked to a PORS receipt."
          );
        }
        const receiptId = asRequiredText(body?.receiptId, "receiptId");
        const receiptSnapshot = asObject(
          body?.receiptSnapshot,
          "receiptSnapshot"
        );
        let claim;

        try {
          claim = await claimQuoteVersion({
            quoteId,
            expectedVersion: body?.expectedVersion,
            actorUid
          });
          const state = await queries.saveReceiptState(
            quoteId,
            claim.claimedVersion,
            {
              receiptId,
              receiptSnapshot
            },
            actorUid
          );
          if (!state) {
            throw conflict(
              "The quote changed while its PORS receipt link was being saved."
            );
          }
          return {
            state,
            receipt: {
              id: receiptId,
              snapshot: receiptSnapshot
            },
            sideEffects: {
              receiptCreated: false,
              saleCreated: false,
              orderCreated: false,
              paymentCreated: false,
              stockChanged: false
            }
          };
        } catch (error) {
          await restoreClaim({ quoteId, claim, actorUid });
          throw error;
        }
      }
    });

  const listUnifiedRecords = async (filters, viewer) => {
    const result = await listQuotes(filters, viewer);
    const source = asOptionalText(filters?.source);
    const publicationStatus = asOptionalText(filters?.publicationStatus);
    const records = result.quotes
      .map((quote) => {
        const state = quote.pos || {};
        const isPublished = Boolean(state.publishedAt);
        const isReceipt = Boolean(state.linkedReceiptId);
        const sourceType = isReceipt ? "pors_receipt" : "online_quote";
        const publishedPricing =
          state.pricing && isPublished ? state.pricing : null;
        return {
          id: quote.id,
          source: sourceType,
          quote,
          publishedAt: state.publishedAt || null,
          linkedReceiptId: state.linkedReceiptId || null,
          amount: isPublished
            ? Number(
                state.linkedReceiptSnapshot?.totalAmount ??
                publishedPricing?.totalAmount ??
                0
              )
            : 0
        };
      })
      .filter((record) => !source || record.source === source)
      .filter((record) => {
        if (!publicationStatus) return true;
        return publicationStatus === "published"
          ? Boolean(record.publishedAt)
          : !record.publishedAt;
      });

    const { quotes: _quotes, ...page } = result;
    return {
      ...page,
      records,
      totalAmount: records.reduce(
        (sum, record) => sum + record.amount,
        0
      )
    };
  };

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
    publishQuote,
    linkReceipt,
    listUnifiedRecords,
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
