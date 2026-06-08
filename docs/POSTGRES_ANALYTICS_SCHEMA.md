# PostgreSQL Analytics Schema

## 1. Purpose

Noblesse will use PostgreSQL as the analytics database for POS sales and buyer purchase behavior.

Firebase remains the current operational source for the pors POS app.
PostgreSQL is added as a normalized analytics layer.

Goals:

- buyer purchase frequency
- buyer total purchase amount
- average purchase amount
- latest purchase date
- repeat interval
- month-over-month amount change
- month-over-month quantity change
- frequently purchased products
- reduced purchase products
- category preference
- inactive buyer detection
- product best-seller detection
- future community and feedback insights

## 2. Source Data

Current POS source:

- Firebase project: pors-piercing-pos
- Firestore collection: sales
- sale lines: sales.lines[]
- buyer/customer fields: customerId, customerName
- date field: createdAt
- totals fields: totals.subtotal, totals.discount, totals.supply, totals.vat, totals.total
- product fields: lines[].itemId, lines[].name, lines[].categoryId
- quantity field: lines[].quantity
- unit price field: lines[].price

Important:

- productCode is not currently guaranteed.
- buyerId is not currently guaranteed.
- storeId and deviceId are future required fields.
- lineTotal can be calculated as price * quantity.

## 3. Database Role

PostgreSQL should not replace Firebase immediately.

Recommended flow:

- pors POS app writes to Firebase
- import/ETL reads Firebase sales
- PostgreSQL stores normalized sales and sale items
- Noblesse admin reads PostgreSQL analytics
- future automation may sync on schedule

## 4. Core Tables

Document these tables:

- stores
- pos_devices
- buyers
- products
- pos_sales
- pos_sale_items
- buyer_monthly_metrics
- product_monthly_metrics
- pos_import_batches
- pos_source_mappings

## 5. Table Definitions

### stores

Fields:

- id uuid primary key
- source_store_id text
- name text
- status text
- created_at timestamptz
- updated_at timestamptz

### pos_devices

Fields:

- id uuid primary key
- store_id uuid references stores(id)
- source_device_id text
- device_name text
- platform text
- app_version text
- last_seen_at timestamptz
- status text
- created_at timestamptz
- updated_at timestamptz

### buyers

Fields:

- id uuid primary key
- source_customer_id text
- noblesse_buyer_id text
- customer_name text
- company_name text
- contact_name text
- phone text
- country text
- market text
- currency text
- discount_rate numeric(5,2)
- vat_enabled boolean
- status text
- raw_customer_json jsonb
- created_at timestamptz
- updated_at timestamptz

### products

Fields:

- id uuid primary key
- source_item_id text
- noblesse_product_id text
- product_code text
- item_name text
- product_name text
- category_id text
- category_name text
- unit_price bigint
- is_official boolean
- is_active boolean
- raw_item_json jsonb
- created_at timestamptz
- updated_at timestamptz

### pos_sales

Fields:

- id uuid primary key
- source_system text
- source_sale_id text
- store_id uuid references stores(id)
- buyer_id uuid references buyers(id)
- source_customer_id text
- customer_name text
- sale_date timestamptz
- currency text
- subtotal_amount bigint
- discount_amount bigint
- supply_amount bigint
- vat_amount bigint
- total_amount bigint
- total_quantity integer
- line_count integer
- writer_name text
- raw_sale_json jsonb
- imported_at timestamptz
- created_at timestamptz
- updated_at timestamptz

Constraints:

- unique(source_system, source_sale_id)

### pos_sale_items

Fields:

- id uuid primary key
- pos_sale_id uuid references pos_sales(id)
- source_line_id text
- source_item_id text
- product_id uuid references products(id)
- product_code text
- item_name text
- category_id text
- category_name text
- quantity integer
- unit_price bigint
- original_unit_price bigint
- line_total_amount bigint
- discountable boolean
- raw_line_json jsonb
- created_at timestamptz

### buyer_monthly_metrics

Fields:

- id uuid primary key
- buyer_id uuid references buyers(id)
- month date
- purchase_count integer
- total_purchase_amount bigint
- total_quantity integer
- average_purchase_amount bigint
- latest_purchase_date timestamptz
- repeat_interval_days numeric(10,2)
- top_product_id uuid
- top_product_name text
- top_category_id text
- amount_change_rate numeric(10,2)
- quantity_change_rate numeric(10,2)
- inactive_buyer_flag boolean
- calculated_at timestamptz

Constraints:

- unique(buyer_id, month)

### product_monthly_metrics

Fields:

- id uuid primary key
- product_id uuid references products(id)
- month date
- sale_count integer
- total_quantity integer
- total_amount bigint
- buyer_count integer
- repeat_buyer_count integer
- amount_change_rate numeric(10,2)
- quantity_change_rate numeric(10,2)
- calculated_at timestamptz

Constraints:

- unique(product_id, month)

### pos_import_batches

Fields:

- id uuid primary key
- source_system text
- source_project_id text
- import_type text
- status text
- started_at timestamptz
- finished_at timestamptz
- imported_sales_count integer
- imported_lines_count integer
- error_message text
- created_at timestamptz

### pos_source_mappings

Fields:

- id uuid primary key
- mapping_type text
- source_system text
- source_id text
- target_table text
- target_id uuid
- confidence text
- created_at timestamptz
- updated_at timestamptz

## 6. Firebase to PostgreSQL Mapping

- Firebase sales.id -> pos_sales.source_sale_id
- Firebase sales.createdAt -> pos_sales.sale_date
- Firebase sales.customerId -> buyers.source_customer_id and pos_sales.source_customer_id
- Firebase sales.customerName -> buyers.customer_name and pos_sales.customer_name
- Firebase sales.totals.subtotal -> pos_sales.subtotal_amount
- Firebase sales.totals.discount -> pos_sales.discount_amount
- Firebase sales.totals.supply -> pos_sales.supply_amount
- Firebase sales.totals.vat -> pos_sales.vat_amount
- Firebase sales.totals.total -> pos_sales.total_amount
- Firebase sales.lines[] -> pos_sale_items rows
- Firebase sales.lines[].id -> pos_sale_items.source_line_id
- Firebase sales.lines[].itemId -> products.source_item_id and pos_sale_items.source_item_id
- Firebase sales.lines[].name -> products.item_name and pos_sale_items.item_name
- Firebase sales.lines[].categoryId -> products.category_id and pos_sale_items.category_id
- Firebase sales.lines[].quantity -> pos_sale_items.quantity
- Firebase sales.lines[].price -> pos_sale_items.unit_price
- Firebase sales.lines[].originalPrice -> pos_sale_items.original_unit_price
- Firebase sales.lines[].discountable -> pos_sale_items.discountable
- price * quantity -> pos_sale_items.line_total_amount

## 7. JSONB Usage

Use JSONB only for raw source snapshots and flexible metadata.

Recommended JSONB fields:

- buyers.raw_customer_json
- products.raw_item_json
- pos_sales.raw_sale_json
- pos_sale_items.raw_line_json

Do not store critical analytics fields only in JSONB.
Buyer id, sale date, total amount, quantity, product code, and category id must be normal columns.

## 8. Analytics Calculation Rules

purchase_count:

- count(pos_sales) grouped by buyer_id and month

total_purchase_amount:

- sum(pos_sales.total_amount)

average_purchase_amount:

- total_purchase_amount / purchase_count

latest_purchase_date:

- max(pos_sales.sale_date)

repeat_interval_days:

- average day interval between buyer sale dates

total_quantity:

- sum(pos_sale_items.quantity)

top_products:

- group pos_sale_items by product_id/item_name and sort by quantity or amount

reduced_products:

- compare current period item quantity with previous period item quantity

month_over_month_amount_change:

- (current_month_amount - previous_month_amount) / previous_month_amount * 100

month_over_month_quantity_change:

- (current_month_quantity - previous_month_quantity) / previous_month_quantity * 100

inactive_buyer_flag:

- latest_purchase_date older than configured threshold

## 9. Index Strategy

Recommended indexes:

- pos_sales(source_system, source_sale_id)
- pos_sales(buyer_id, sale_date desc)
- pos_sales(sale_date)
- pos_sale_items(pos_sale_id)
- pos_sale_items(product_id)
- pos_sale_items(source_item_id)
- pos_sale_items(category_id)
- buyer_monthly_metrics(buyer_id, month)
- product_monthly_metrics(product_id, month)
- products(product_code)
- buyers(source_customer_id)

## 10. Security Notes

- POS sales data is sensitive.
- Public users must not access analytics tables.
- Approved buyers must not read other buyers' sales data.
- Admin-only read access is required for analytics.
- Future RLS should separate admin and buyer access.
- Service credentials must not be committed.
- Raw JSON may contain customer-sensitive data.

## 11. Implementation Phases

Phase 1:

- add PostgreSQL analytics schema document
- add SQL draft file

Phase 2:

- build Firebase sales export/import parser
- no automatic sync yet

Phase 3:

- build buyer analytics calculation service

Phase 4:

- build Noblesse admin analytics screen

Phase 5:

- schedule automatic sync or ETL

Phase 6:

- connect community/product feedback insights
