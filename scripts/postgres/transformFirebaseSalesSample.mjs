import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const samplePath = path.join(repoRoot, 'database', 'postgres', 'samples', 'firebase_sales_sample.json');

const fallbackCurrency = 'KRW';
const sourceSystem = 'pors_firebase';

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toStringOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
};

const uniqueBy = (items, keyFn) => {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);
    if (!key || map.has(key)) {
      continue;
    }

    map.set(key, item);
  }

  return Array.from(map.values());
};

const raw = await readFile(samplePath, 'utf8');
const sample = JSON.parse(raw);
const sales = Array.isArray(sample.sales) ? sample.sales : [];

const buyers = uniqueBy(
  sales.map((sale) => ({
    source_customer_id: toStringOrNull(sale.customerId),
    customer_name: toStringOrNull(sale.customerName) ?? 'Unknown customer',
    company_name: toStringOrNull(sale.customerName) ?? 'Unknown customer',
    currency: toStringOrNull(sale.currency) ?? fallbackCurrency,
    raw_customer_json: {
      customerId: toStringOrNull(sale.customerId),
      customerName: toStringOrNull(sale.customerName),
      sample: true,
    },
  })),
  (buyer) => buyer.source_customer_id ?? buyer.customer_name,
);

const sourceLines = sales.flatMap((sale) =>
  (Array.isArray(sale.lines) ? sale.lines : []).map((line, lineIndex) => ({
    sale,
    line,
    lineIndex,
  })),
);

const products = uniqueBy(
  sourceLines.map(({ line }) => ({
    source_item_id: toStringOrNull(line.itemId),
    product_code: toStringOrNull(line.productCode),
    item_name: toStringOrNull(line.name) ?? 'Unknown item',
    product_name: toStringOrNull(line.name) ?? 'Unknown item',
    category_id: toStringOrNull(line.categoryId),
    unit_price: toNumber(line.price),
    raw_item_json: line,
  })),
  (product) => product.source_item_id ?? `${product.product_code}:${product.item_name}`,
);

const pos_sales = sales.map((sale) => {
  const lines = Array.isArray(sale.lines) ? sale.lines : [];
  const totalQuantity = lines.reduce((sum, line) => sum + toNumber(line.quantity), 0);
  const calculatedTotal = lines.reduce((sum, line) => sum + toNumber(line.price) * toNumber(line.quantity), 0);
  const totals = sale.totals ?? {};

  return {
    source_system: sourceSystem,
    source_sale_id: toStringOrNull(sale.id),
    local_sale_id: null,
    idempotency_key: null,
    store_id: null,
    device_id: null,
    source_customer_id: toStringOrNull(sale.customerId),
    customer_name: toStringOrNull(sale.customerName) ?? 'Unknown customer',
    sale_date: toStringOrNull(sale.createdAt),
    currency: toStringOrNull(sale.currency) ?? fallbackCurrency,
    subtotal_amount: toNumber(totals.subtotal),
    discount_amount: toNumber(totals.discount),
    supply_amount: toNumber(totals.supply),
    vat_amount: toNumber(totals.vat),
    total_amount: totals.total === undefined ? calculatedTotal : toNumber(totals.total),
    total_quantity: totalQuantity,
    line_count: lines.length,
    synced_at: null,
    raw_sale_json: sale,
  };
});

const pos_sale_items = sourceLines.map(({ sale, line, lineIndex }) => {
  const quantity = toNumber(line.quantity);
  const unitPrice = toNumber(line.price);
  const sourceSaleId = toStringOrNull(sale.id);

  return {
    source_system: sourceSystem,
    source_sale_id: sourceSaleId,
    source_line_id: `${sourceSaleId}:${lineIndex + 1}`,
    source_item_id: toStringOrNull(line.itemId),
    product_code: toStringOrNull(line.productCode),
    item_name: toStringOrNull(line.name) ?? 'Unknown item',
    category_id: toStringOrNull(line.categoryId),
    quantity,
    unit_price: unitPrice,
    original_unit_price: unitPrice,
    line_total_amount: line.lineTotal === undefined ? unitPrice * quantity : toNumber(line.lineTotal),
    discountable: line.discountable ?? true,
    raw_line_json: line,
  };
});

const output = {
  source_system: sourceSystem,
  sample: sample.sample === true,
  counts: {
    buyers: buyers.length,
    products: products.length,
    pos_sales: pos_sales.length,
    pos_sale_items: pos_sale_items.length,
  },
  buyers,
  products,
  pos_sales,
  pos_sale_items,
};

console.log(JSON.stringify(output, null, 2));
