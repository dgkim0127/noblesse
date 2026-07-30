const CALCULATION_VERSION = "pors-quote-v1";

function money(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TypeError("Money values must be nonnegative numbers");
  }
  return Math.round(parsed * 100) / 100;
}

function rate(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new TypeError("Discount rates must be between 0 and 100");
  }
  return parsed;
}

function quantity(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new TypeError("Quantities must be nonnegative integers");
  }
  return parsed;
}

function resolveThresholdRate(subtotal, rules = {}) {
  const thresholds = Array.isArray(rules.thresholds)
    ? rules.thresholds
    : [
        { minimum: 1_000_000, rate: 10 },
        { minimum: 500_000, rate: 5 }
      ];

  return thresholds
    .map((entry) => ({
      minimum: money(entry.minimum || 0),
      rate: rate(entry.rate || 0)
    }))
    .sort((left, right) => right.minimum - left.minimum)
    .find((entry) => subtotal >= entry.minimum)?.rate || 0;
}

export function calculatePosQuote(input = {}) {
  const customer = input.customer || {};
  const rules = input.rules || {};
  const lines = (input.lines || []).map((line) => {
    const preparedQuantity = quantity(line.preparedQuantity);
    const requestedQuantity = quantity(line.requestedQuantity);
    if (preparedQuantity > requestedQuantity) {
      throw new TypeError("Prepared quantity cannot exceed requested quantity");
    }

    const hasOverride = line.overrideUnitPrice !== undefined && line.overrideUnitPrice !== null;
    const overrideReason = String(line.overrideReason || "").trim();
    if (hasOverride && !overrideReason) {
      throw new TypeError("A unit price override requires a reason");
    }

    const unitPrice = money(hasOverride ? line.overrideUnitPrice : line.baseUnitPrice);
    return {
      itemId: String(line.itemId),
      productId: line.productId || null,
      posItemId: line.posItemId || null,
      requestedQuantity,
      preparedQuantity,
      cancelledQuantity: requestedQuantity - preparedQuantity,
      baseUnitPrice: money(line.baseUnitPrice),
      unitPrice,
      lineSubtotal: money(unitPrice * preparedQuantity),
      discountable: line.discountable !== false,
      priceSource: line.priceSource || "site",
      overrideReason: hasOverride ? overrideReason : null
    };
  });

  const subtotal = money(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
  const deductionAmount = Math.min(subtotal, money(input.deductionAmount || 0));
  const remainingSubtotal = money(subtotal - deductionAmount);
  const remainingRatio = subtotal > 0 ? remainingSubtotal / subtotal : 0;
  const discountableSubtotal = money(
    lines
      .filter((line) => line.discountable)
      .reduce((sum, line) => sum + line.lineSubtotal, 0) * remainingRatio
  );

  const customerDiscountRate = rate(customer.discountRate || 0);
  const thresholdDiscountRate = customerDiscountRate > 0 || customer.isOverseas
    ? 0
    : resolveThresholdRate(remainingSubtotal, rules);
  const appliedDiscountRate = customerDiscountRate || thresholdDiscountRate;
  const discountAmount = money(discountableSubtotal * (appliedDiscountRate / 100));
  const supplyAmount = money(remainingSubtotal - discountAmount);
  const vatEnabled = customer.vatEnabled !== false && !customer.isOverseas;
  const vatAmount = vatEnabled ? money(supplyAmount * 0.1) : 0;
  const totalAmount = money(supplyAmount + vatAmount);

  const priceBandMap = new Map();
  for (const line of lines) {
    if (line.preparedQuantity < 1) continue;
    const key = String(line.unitPrice);
    const current = priceBandMap.get(key) || {
      unitPrice: line.unitPrice,
      quantity: 0,
      subtotal: 0
    };
    current.quantity += line.preparedQuantity;
    current.subtotal = money(current.subtotal + line.lineSubtotal);
    priceBandMap.set(key, current);
  }

  return {
    calculationVersion: CALCULATION_VERSION,
    customer: {
      id: customer.id || null,
      name: customer.name || "",
      linked: Boolean(customer.id),
      discountRate: customerDiscountRate,
      vatEnabled,
      isOverseas: Boolean(customer.isOverseas)
    },
    lines,
    priceBands: [...priceBandMap.values()].sort((left, right) => left.unitPrice - right.unitPrice),
    subtotal,
    deductionAmount,
    remainingSubtotal,
    discountableSubtotal,
    discountSource: customerDiscountRate > 0
      ? "customer"
      : thresholdDiscountRate > 0
        ? "threshold"
        : "none",
    appliedDiscountRate,
    discountAmount,
    supplyAmount,
    vatAmount,
    totalAmount
  };
}

export { CALCULATION_VERSION };
