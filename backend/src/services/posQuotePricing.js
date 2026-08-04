const CALCULATION_VERSION = "noblesse-online-quote-v2";

function money(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TypeError("Money values must be nonnegative numbers");
  }
  return Math.round(parsed * 100) / 100;
}

function quantity(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new TypeError("Quantities must be nonnegative integers");
  }
  return parsed;
}

export function calculatePosQuote(input = {}) {
  const customer = input.customer || {};
  const lines = (input.lines || []).map((line) => {
    const preparedQuantity = quantity(line.preparedQuantity);
    const requestedQuantity = quantity(line.requestedQuantity);
    if (preparedQuantity > requestedQuantity) {
      throw new TypeError("Prepared quantity cannot exceed requested quantity");
    }

    const hasOverride = line.overrideUnitPrice !== undefined && line.overrideUnitPrice !== null;
    if (hasOverride) {
      throw new TypeError("Online quotes must use the request-time unit price");
    }

    const unitPrice = money(line.baseUnitPrice);
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
      discountable: false,
      priceSource: line.priceSource || "site_snapshot",
      overrideReason: null
    };
  });

  const subtotal = money(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
  const supplyAmount = subtotal;
  const vatAmount = money(supplyAmount * 0.1);
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
      discountRate: 0,
      vatEnabled: true,
      isOverseas: Boolean(customer.isOverseas)
    },
    lines,
    priceBands: [...priceBandMap.values()].sort((left, right) => left.unitPrice - right.unitPrice),
    subtotal,
    deductionAmount: 0,
    remainingSubtotal: subtotal,
    discountableSubtotal: subtotal,
    discountSource: "none",
    appliedDiscountRate: 0,
    discountAmount: 0,
    supplyAmount,
    vatAmount,
    totalAmount
  };
}

export { CALCULATION_VERSION };
