# PostgreSQL Local Setup

## Purpose

This document explains how to apply the local PostgreSQL schema for Noblesse POS sales and buyer analytics.

The recommended local database is:

- database name: `noblesse_analytics`
- port: `5432`
- owner: `postgres`

This database is for POS sales, buyer/customer analytics, product analytics, and admin reporting preparation.

## Architecture Rules

- pors POS app must not connect directly to PostgreSQL.
- Future production writes must go through an API server.
- Noblesse web reads analytics data and must not mutate POS sales directly.
- Firebase remains focused on Auth / Storage / Push / Config.
- Existing Firebase sales are historical data for import/backfill only.
- Database passwords and connection strings must not be committed to GitHub.

Long-term production flow:

```text
pors POS app
-> API server
-> PostgreSQL
-> Noblesse admin analytics
```

Do not embed PostgreSQL credentials in the POS APK.

## Schema File

Apply this SQL file:

```text
database/postgres/001_pos_primary_schema.sql
```

The SQL draft:

- creates `pgcrypto`
- uses `create table if not exists`
- uses UUID primary keys with `gen_random_uuid()`
- stores amount fields as `bigint`
- stores raw source payloads as `jsonb`
- includes unique constraints and indexes
- does not include destructive migrations
- leaves RLS as a later production task

After the base schema is applied, analytics views can be created with:

```text
database/postgres/003_pos_analytics_views.sql
```

## pgAdmin Method

1. Open pgAdmin 4.
2. Select the `noblesse_analytics` database.
3. Open Query Tool.
4. Paste the contents of `database/postgres/001_pos_primary_schema.sql`.
5. Run the query.
6. Confirm that the tables were created.

Expected tables:

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

## psql Method

From the repository root:

```bash
psql -U postgres -d noblesse_analytics -f database/postgres/001_pos_primary_schema.sql
```

Do not put passwords in this command inside repository files.
Use local password prompts, a secure local environment, or a local-only secret manager.

## Optional Sample Data

After applying `database/postgres/001_pos_primary_schema.sql`, you may optionally run:

```text
database/postgres/002_sample_pos_data.sql
```

This sample data is for local development/testing only.
Do not run it against a production database.

The sample data adds:

- two test buyers
- three test products
- multiple POS sales across the previous month and current month
- repeated product lines for buyer and product analytics checks

pgAdmin method:

1. Select the `noblesse_analytics` database.
2. Open Query Tool.
3. Paste the contents of `database/postgres/002_sample_pos_data.sql`.
4. Run the query.

psql method:

```bash
psql -U postgres -d noblesse_analytics -f database/postgres/002_sample_pos_data.sql
```

After loading the optional sample data, use `docs/POS_ANALYTICS_QUERIES.md` to confirm buyer and product analytics query results.

## Analytics Views

Run the files in this order:

1. `database/postgres/001_pos_primary_schema.sql`
2. Optional: `database/postgres/002_sample_pos_data.sql`
3. `database/postgres/003_pos_analytics_views.sql`

The view file uses `create or replace view` and does not include destructive migrations.

pgAdmin method:

1. Select the `noblesse_analytics` database.
2. Open Query Tool.
3. Paste the contents of `database/postgres/003_pos_analytics_views.sql`.
4. Run the query.

psql method:

```bash
psql -U postgres -d noblesse_analytics -f database/postgres/003_pos_analytics_views.sql
```

After creating the views, these checks can be run:

```sql
select * from v_buyer_purchase_summary;
select * from v_buyer_monthly_amount_change;
select * from v_buyer_product_summary;
select * from v_buyer_reduced_products;
```

## Backfill Usage

Existing Firebase sales can be used for:

- one-time import
- migration validation
- comparison with PostgreSQL records
- transition fallback

Current Firebase POS source:

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

## Production Notes

Local PostgreSQL is only for development/testing.
Production should use managed PostgreSQL or a secured server.

Before production:

- provision a secured PostgreSQL provider
- define API server access only
- add RLS or equivalent server-side authorization
- define store/device scope
- define admin analytics scope
- create backup and migration strategy
