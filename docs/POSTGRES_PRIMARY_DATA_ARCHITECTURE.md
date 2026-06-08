# PostgreSQL Primary Data Architecture

## 1. Purpose

Noblesse will use PostgreSQL as the primary structured database for POS sales, buyers, products, purchase analytics, reports, and future community insights.

Firebase remains important, but it should focus on:

- authentication
- storage
- push notifications
- app configuration
- lightweight operational support

Firebase should not remain the long-term primary source for structured POS sales analytics.

## 2. Role Separation

Firebase:

- Auth
- Storage
- Push notification
- Remote config or lightweight app config
- historical Firebase sales backfill source

PostgreSQL:

- stores
- devices
- buyers
- products
- product prices
- POS sales
- POS sale items
- buyer purchase analytics
- product analytics
- community data later

Noblesse web:

- buyer catalog
- Inquiry List
- Request Quote
- admin analytics
- PostgreSQL analytics reader

pors POS app:

- tablet sales entry
- local/offline operation
- sends sales data to API server
- must not connect directly to PostgreSQL

API server:

- verifies Firebase Auth token
- validates storeId and deviceId
- writes normalized POS sales to PostgreSQL
- prevents duplicate sale sync
- handles future sync logs

## 3. Correct Data Flow

Long-term target:

```text
pors POS app
-> API server
-> PostgreSQL
-> Noblesse admin analytics
```

Firebase remains for Auth/Storage/Push/Config.

Do not use this as the long-term flow:

```text
pors POS app
-> Firebase sales
-> PostgreSQL
-> Noblesse analytics
```

That Firebase-to-PostgreSQL path is allowed only for historical backfill/migration.

## 4. Existing Firebase Sales

Current Firebase sales data should be treated as historical/legacy operational data.

Use it for:

- one-time import
- migration validation
- comparison with PostgreSQL records
- fallback during transition

Do not design future analytics around Firebase sales as the main data source.

## 5. PostgreSQL Core Tables

Define these future tables:

- stores
- pos_devices
- buyers
- products
- product_prices
- pos_sales
- pos_sale_items
- buyer_monthly_metrics
- product_monthly_metrics
- pos_import_batches
- sync_logs
- pos_source_mappings

## 6. Required POS App Field Additions

Future pors API payload should include:

- storeId
- deviceId
- localSaleId
- buyerId or customerId
- customerName
- saleDate
- productCode when available
- itemId
- itemName
- categoryId
- quantity
- unitPrice
- lineTotal
- subtotalAmount
- discountAmount
- supplyAmount
- vatAmount
- totalAmount
- idempotencyKey
- appVersion
- syncedAt

## 7. PostgreSQL Sales Model

pos_sales:

- one row per sale

pos_sale_items:

- one row per sale line

buyers:

- one row per buyer/customer

products:

- official Noblesse product or POS local product

buyer_monthly_metrics:

- precomputed buyer monthly analytics

product_monthly_metrics:

- precomputed product monthly analytics

## 8. Firebase Historical Backfill

Existing Firebase sales should be imported into PostgreSQL using a backfill process.

Mapping:

- Firebase sales.id -> pos_sales.source_sale_id
- Firebase sales.createdAt -> pos_sales.sale_date
- Firebase sales.customerId -> buyers.source_customer_id
- Firebase sales.customerName -> buyers.customer_name
- Firebase sales.totals.total -> pos_sales.total_amount
- Firebase sales.lines[] -> pos_sale_items rows
- Firebase lines[].itemId -> products.source_item_id
- Firebase lines[].name -> products.item_name
- Firebase lines[].quantity -> pos_sale_items.quantity
- Firebase lines[].price -> pos_sale_items.unit_price
- price * quantity -> line_total_amount

Backfill must be idempotent:

- unique(source_system, source_sale_id)
- avoid duplicate sale imports

## 9. API Layer Requirement

pors POS app must not connect directly to PostgreSQL.

API layer must:

- verify Firebase Auth token
- validate store/device permission
- accept sale payloads
- normalize payload into PostgreSQL
- generate or verify idempotency key
- return sync status
- log sync errors

Possible API options:

- Cloud Run
- Firebase Functions
- Supabase Edge Functions
- Node/Express server
- Next.js API routes if Noblesse later moves to that structure

## 10. Analytics Requirements

Buyer analytics:

- purchase count
- total purchase amount
- average purchase amount
- latest purchase date
- repeat interval
- month-over-month amount change
- month-over-month quantity change
- frequently purchased products
- reduced purchase products
- category preference
- inactive buyer detection

Product analytics:

- total quantity
- total amount
- buyer count
- repeat buyer count
- best-seller detection
- declining product detection

## 11. Security

- PostgreSQL credentials must never be embedded in pors APK.
- Public users must not access analytics data.
- Approved buyers must not read other buyers' sales data.
- Admin-only analytics access is required.
- Firebase Auth token can be used for identity verification.
- API server or RLS must enforce store/device scope.
- Raw sale JSON may contain customer-sensitive data.

## 12. Implementation Phases

Phase 1:

- document PostgreSQL primary data architecture
- add SQL schema draft

Phase 2:

- provision PostgreSQL provider
- run schema migration

Phase 3:

- build API write endpoint for POS sales

Phase 4:

- update pors POS app to send sales to API while preserving local/offline usage

Phase 5:

- backfill existing Firebase sales into PostgreSQL

Phase 6:

- build Noblesse admin buyer analytics screen

Phase 7:

- connect product/community insights
