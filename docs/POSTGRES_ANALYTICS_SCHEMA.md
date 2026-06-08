# PostgreSQL Analytics Schema

## Purpose

PostgreSQL is used as the structured database for POS sales, buyer/customer analytics, product analytics, and reporting.

Firebase remains focused on:

- Auth
- Storage
- Push
- Config

The POS app must not connect directly to PostgreSQL.
The long-term flow is:

```text
pors POS app
-> API server
-> PostgreSQL
-> Noblesse admin analytics
```

Existing Firebase sales are historical data for import/backfill only.

## Current Firebase Source

Current POS source:

- Firebase project: `pors-piercing-pos`
- Firestore collection: `sales`
- sale lines: `sales.lines[]`
- buyer/customer fields: `customerId`, `customerName`
- date field: `createdAt`
- totals fields: `totals.subtotal`, `totals.discount`, `totals.supply`, `totals.vat`, `totals.total`
- product fields: `lines[].itemId`, `lines[].name`, `lines[].categoryId`
- quantity field: `lines[].quantity`
- unit price field: `lines[].price`

Fields such as `productCode`, `buyerId`, `storeId`, `deviceId`, `lineTotal`, and `syncedAt` are not guaranteed yet.

Future POS API payloads should add `localSaleId`, `idempotencyKey`, `appVersion`, and `syncedAt` for reliable server sync.

## Core Tables

- stores
- pos_devices
- buyers
- products
- product_prices
- pos_sales
- pos_sale_items
- buyer_monthly_metrics
- product_monthly_metrics
- sync_logs
- pos_import_batches
- pos_source_mappings

## Firestore Sales to PostgreSQL Mapping

- Firebase sales.id -> pos_sales.source_sale_id
- POS API localSaleId -> pos_sales.local_sale_id
- POS API idempotencyKey -> pos_sales.idempotency_key
- POS API appVersion -> pos_sales.app_version
- POS API syncedAt -> pos_sales.synced_at
- Firebase sales.createdAt -> pos_sales.sale_date
- Firebase sales.customerId -> buyers.source_customer_id and pos_sales.source_customer_id
- Firebase sales.customerName -> buyers.customer_name and pos_sales.customer_name
- Firebase sales.totals.subtotal -> pos_sales.subtotal_amount
- Firebase sales.totals.discount -> pos_sales.discount_amount
- Firebase sales.totals.supply -> pos_sales.supply_amount
- Firebase sales.totals.vat -> pos_sales.vat_amount
- Firebase sales.totals.total -> pos_sales.total_amount
- Firebase sales.lines[] -> pos_sale_items rows
- Firebase sales.lines[].itemId -> products.source_item_id and pos_sale_items.source_item_id
- Firebase sales.lines[].name -> products.item_name and pos_sale_items.item_name
- Firebase sales.lines[].categoryId -> products.category_id and pos_sale_items.category_id
- Firebase sales.lines[].quantity -> pos_sale_items.quantity
- Firebase sales.lines[].price -> pos_sale_items.unit_price
- price * quantity -> pos_sale_items.line_total_amount

Backfill imports must be idempotent through:

- unique(source_system, source_sale_id)

New API sync writes should be idempotent through:

- unique(source_system, idempotency_key)
- PostgreSQL unique constraints allow multiple null values, so historical backfill records with null idempotency_key remain valid
- records with idempotency_key are treated as API sync records and must not be duplicated
- idx_pos_sales_idempotency supports lookup by source_system and idempotency_key

## POS Sync Fields

local_sale_id:

- POS app local sale ID.
- Used to trace a sale created while the POS app was offline or working locally.

idempotency_key:

- Key sent by the POS app to prevent duplicate persistence when the same sale is retried.
- Use unique(source_system, idempotency_key) for duplicate prevention.
- PostgreSQL allows multiple null values in a unique constraint, so backfill rows without idempotency_key can coexist.

app_version:

- POS app version at the time the sale was created or synced.
- Useful for debugging sync behavior by deployed app version.

synced_at:

- Time when the POS app synced the sale to the server/API.
- Different from sale_date, which means when the sale happened.

Backfill versus API sync:

- Existing Firebase backfill data uses source_system and source_sale_id uniqueness.
- New API synchronization data uses idempotency_key for duplicate prevention.
- If both source_sale_id and idempotency_key are available, keep both for traceability.

## JSONB Usage

JSONB should be used only for raw source payload storage and flexible metadata.

Recommended JSONB fields:

- buyers.raw_customer_json
- products.raw_item_json
- pos_sales.raw_sale_json
- pos_sale_items.raw_line_json

Do not store critical analytics fields only in JSONB.
Important fields must be normal columns, including:

- buyer/customer id
- sale date
- total amount
- quantity
- product code
- category id
- source item id

## Buyer Analytics

Buyer analytics should support:

- buyer purchase count
- total purchase amount
- average purchase amount
- latest purchase date
- purchase interval
- month-over-month amount change
- month-over-month quantity change
- frequently purchased products
- reduced purchase products
- category preference
- inactive buyer detection

Suggested calculations:

- purchase_count: count(pos_sales) grouped by buyer_id and month
- total_purchase_amount: sum(pos_sales.total_amount)
- average_purchase_amount: total_purchase_amount / purchase_count
- latest_purchase_date: max(pos_sales.sale_date)
- total_quantity: sum(pos_sale_items.quantity)
- inactive_buyer_flag: latest_purchase_date older than the configured threshold

## Product Analytics

Product analytics should support:

- total quantity
- total amount
- buyer count
- repeat buyer count
- best-seller candidates
- declining product detection
- category trends

Suggested calculations:

- total_quantity: sum(pos_sale_items.quantity)
- total_amount: sum(pos_sale_items.line_total_amount)
- buyer_count: count(distinct pos_sales.buyer_id)
- repeat_buyer_count: count buyers with repeated product purchases in the period

## Security Notes

- Public users must not access analytics tables.
- Approved buyers must not read other buyers' sales data.
- Admin-only analytics access is required.
- PostgreSQL credentials must never be embedded in pors APK.
- Production writes must go through an API layer.
- RLS or equivalent server-side authorization must be added before production.
