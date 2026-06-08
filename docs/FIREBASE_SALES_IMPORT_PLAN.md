# Firebase Sales Import Plan

## Purpose

This document defines how existing pors Firebase `sales` documents can be imported into the Noblesse PostgreSQL analytics database.

Firebase sales are a historical backfill/import source only.
The long-term production structure should be:

```text
pors POS app
-> API server
-> PostgreSQL
-> Noblesse admin analytics
```

pors remains the source of truth for live POS entry.
Noblesse remains the source of truth for the B2B catalog and Request Quote workflow.

## Current Firebase Source

- Firebase project: `pors-piercing-pos`
- Firestore collection: `sales`
- sale lines: `sales.lines[]`
- buyer/customer fields: `customerId`, `customerName`
- date field: `createdAt`
- totals fields: `totals.subtotal`, `totals.discount`, `totals.supply`, `totals.vat`, `totals.total`
- product fields: `lines[].itemId`, `lines[].name`, `lines[].categoryId`
- quantity field: `lines[].quantity`
- unit price field: `lines[].price`

Fields such as `productCode`, `buyerId`, `storeId`, `deviceId`, `lineTotal`, and `syncedAt` are not guaranteed yet and should be added to future API payloads.

## PostgreSQL Target Tables

- `buyers`
- `products`
- `pos_sales`
- `pos_sale_items`
- `pos_import_batches`
- `pos_source_mappings`

## Firebase to PostgreSQL Mapping

### buyers

| Firebase field | PostgreSQL field | Rule |
| --- | --- | --- |
| `customerId` | `buyers.source_customer_id` | Stable source ID when present |
| `customerName` | `buyers.customer_name` | Display fallback |
| `customerName` | `buyers.company_name` | Temporary fallback until buyer profile is mapped |
| source document | `buyers.raw_customer_json` | Keep minimal source evidence |

If `buyerId` is missing, create or match a buyer by `source_customer_id`.
If `customerId` is missing, `customerName` may be used as a temporary fallback only.

### products

| Firebase field | PostgreSQL field | Rule |
| --- | --- | --- |
| `lines[].itemId` | `products.source_item_id` | Stable source item ID when present |
| `lines[].productCode` | `products.product_code` | Map to Noblesse `NB-*` code when available |
| `lines[].name` | `products.item_name` | Required display fallback |
| `lines[].categoryId` | `products.category_id` | Category source value |
| `lines[].price` | `products.unit_price` | Source unit price fallback |
| source line | `products.raw_item_json` | Keep original line evidence |

If `productCode` is missing, keep it `null` or treat the item as a POS local product.
Missing `productCode` must not break analytics.

### pos_sales

| Firebase field | PostgreSQL field | Rule |
| --- | --- | --- |
| document ID | `pos_sales.source_sale_id` | Required source sale key |
| fixed value | `pos_sales.source_system` | `pors_firebase` |
| future field | `pos_sales.local_sale_id` | `null` for historical Firebase export unless present |
| future field | `pos_sales.idempotency_key` | `null` for historical Firebase export unless present |
| future field | `pos_sales.store_id` | `null` until store mapping exists |
| future field | `pos_sales.device_id` | `null` until device mapping exists |
| `customerId` | `pos_sales.source_customer_id` | Source customer key |
| `customerName` | `pos_sales.customer_name` | Display fallback |
| `createdAt` | `pos_sales.sale_date` | Parse to timestamp |
| `currency` | `pos_sales.currency` | Default to `KRW` when missing |
| `totals.subtotal` | `pos_sales.subtotal_amount` | Default `0` when missing |
| `totals.discount` | `pos_sales.discount_amount` | Default `0` when missing |
| `totals.supply` | `pos_sales.supply_amount` | Default `0` when missing |
| `totals.vat` | `pos_sales.vat_amount` | Default `0` when missing |
| `totals.total` | `pos_sales.total_amount` | Default calculated line sum when missing |
| `lines[]` | `pos_sales.total_quantity` | Sum `lines[].quantity` |
| `lines[]` | `pos_sales.line_count` | Count source lines |
| source document | `pos_sales.raw_sale_json` | Keep full source sale |

### pos_sale_items

| Firebase field | PostgreSQL field | Rule |
| --- | --- | --- |
| generated value | `pos_sale_items.source_line_id` | `source_sale_id:index` |
| `lines[].itemId` | `pos_sale_items.source_item_id` | Source item key |
| `lines[].productCode` | `pos_sale_items.product_code` | `null` if unavailable |
| `lines[].name` | `pos_sale_items.item_name` | Required display fallback |
| `lines[].categoryId` | `pos_sale_items.category_id` | Category source value |
| `lines[].quantity` | `pos_sale_items.quantity` | Default `0` when missing |
| `lines[].price` | `pos_sale_items.unit_price` | Default `0` when missing |
| `lines[].price` | `pos_sale_items.original_unit_price` | Same as source unit price |
| `lines[].lineTotal` | `pos_sale_items.line_total_amount` | Use source value when present |
| `lines[].price * lines[].quantity` | `pos_sale_items.line_total_amount` | Fallback calculation |
| `lines[].discountable` | `pos_sale_items.discountable` | Default `true` |
| source line | `pos_sale_items.raw_line_json` | Keep original line |

## Idempotency

Use these duplicate prevention keys:

- `source_system + source_sale_id`
- `source_system + idempotency_key`

Historical Firebase export can rely on `source_system + source_sale_id`.
Future API sync should provide `idempotency_key` for stronger retry safety.

## Missing Field Handling

- `productCode` missing: store `null` or map as POS local product.
- `buyerId` missing: use `source_customer_id`; if missing, use `customerName` as a temporary fallback only.
- `storeId` missing: keep `null`.
- `deviceId` missing: keep `null`.
- `lineTotal` missing: calculate `price * quantity`.
- `syncedAt` missing: keep `null` for historical export.

## Currency Handling

If `sales.currency` is missing, default to `KRW` or source-specific default rules.

Do not compare mixed currencies in the same amount metric.
Analytics views include `currency` where amount comparisons are used.

## Import Steps

1. Export Firebase `sales` documents to JSON.
2. Save the JSON file locally outside credential folders.
3. Run a parser to generate PostgreSQL insert SQL, CSV, or normalized JSON.
4. Apply the generated output with pgAdmin or `psql`.
5. Validate results with analytics views.

Initial local parser draft:

```bash
npm run postgres:transform-sample
```

This parser reads only `database/postgres/samples/firebase_sales_sample.json` and writes normalized JSON to stdout.

## Security Notes

- Do not commit Firebase credentials.
- Do not commit PostgreSQL credentials.
- Do not commit private production exports.
- Public users must never read POS sales data.
- Approved buyers must never read another buyer's POS sales data.
- Admin analytics access must be protected by server-side authorization or Firebase Security Rules.
