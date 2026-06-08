# Firebase to PostgreSQL Mapping

## Purpose

This document describes how a local Firebase `sales` JSON export can be transformed into PostgreSQL analytics records for Noblesse.

This is a planning and local transformation guide only.
It does not connect to Firebase, PostgreSQL, or production services.

## Sample JSON Structure

Local sample file:

```text
database/postgres/samples/firebase_sales_sample.json
```

Expected root shape:

```json
{
  "sample": true,
  "sales": [
    {
      "id": "fb-sale-sample-001",
      "customerId": "fb-customer-tokyo-001",
      "customerName": "Tokyo Piercing Lab",
      "createdAt": "2026-05-12T10:15:00+09:00",
      "currency": "JPY",
      "totals": {
        "subtotal": 72000,
        "discount": 6000,
        "supply": 66000,
        "vat": 0,
        "total": 66000
      },
      "lines": [
        {
          "itemId": "fb-item-barbell-001",
          "productCode": "NB-001",
          "name": "Silver Basic Ball Barbell",
          "categoryId": "barbell",
          "quantity": 30,
          "price": 1200,
          "discountable": true
        }
      ]
    }
  ]
}
```

## buyers Insert Rules

Target table: `buyers`

- `source_customer_id`: `sale.customerId`
- `customer_name`: `sale.customerName`
- `company_name`: `sale.customerName`
- `currency`: `sale.currency` or fallback currency
- `raw_customer_json`: minimal source customer object

Duplicate prevention:

- Match by `source_customer_id` when present.
- If `source_customer_id` is missing, use `customer_name` only as a temporary manual review fallback.

## products Insert Rules

Target table: `products`

- `source_item_id`: `line.itemId`
- `product_code`: `line.productCode` or `null`
- `item_name`: `line.name`
- `product_name`: `line.name`
- `category_id`: `line.categoryId`
- `unit_price`: `line.price`
- `raw_item_json`: original source line

Duplicate prevention:

- Match by `source_item_id` when present.
- If `source_item_id` is missing, keep the line as a local/custom item candidate for manual mapping.

## pos_sales Insert Rules

Target table: `pos_sales`

- `source_system`: `pors_firebase`
- `source_sale_id`: `sale.id`
- `local_sale_id`: `null` unless source data provides it later
- `idempotency_key`: `null` for historical export unless source data provides it later
- `store_id`: `null` until store mapping exists
- `device_id`: `null` until device mapping exists
- `buyer_id`: PostgreSQL buyer ID resolved from `source_customer_id`
- `source_customer_id`: `sale.customerId`
- `customer_name`: `sale.customerName`
- `sale_date`: `sale.createdAt`
- `currency`: `sale.currency` or fallback currency
- `subtotal_amount`: `sale.totals.subtotal`
- `discount_amount`: `sale.totals.discount`
- `supply_amount`: `sale.totals.supply`
- `vat_amount`: `sale.totals.vat`
- `total_amount`: `sale.totals.total`
- `total_quantity`: sum of `sale.lines[].quantity`
- `line_count`: count of `sale.lines[]`
- `synced_at`: `null` unless source data provides it later
- `raw_sale_json`: full source sale document

Duplicate prevention:

- Use unique key `source_system + source_sale_id`.
- Future API sync can also use `source_system + idempotency_key`.

## pos_sale_items Insert Rules

Target table: `pos_sale_items`

- `pos_sale_id`: PostgreSQL sale ID resolved from `source_sale_id`
- `source_line_id`: `${sale.id}:${lineIndex}`
- `source_item_id`: `line.itemId`
- `product_id`: PostgreSQL product ID resolved from `source_item_id`
- `product_code`: `line.productCode` or `null`
- `item_name`: `line.name`
- `category_id`: `line.categoryId`
- `quantity`: `line.quantity`
- `unit_price`: `line.price`
- `original_unit_price`: `line.price`
- `line_total_amount`: `line.lineTotal` or `line.price * line.quantity`
- `discountable`: `line.discountable` when present, otherwise `true`
- `raw_line_json`: original source line

Duplicate prevention:

- Use `pos_sale_id + source_line_id` during generated SQL or CSV import.

## Missing Field Fallback

- Missing `productCode`: keep `null`; analytics should still use `item_name`.
- Missing `buyerId`: resolve buyer through `source_customer_id`.
- Missing `customerId`: use `customerName` as temporary fallback and flag for manual mapping.
- Missing `storeId`: keep `null`.
- Missing `deviceId`: keep `null`.
- Missing `lineTotal`: calculate `price * quantity`.
- Missing `currency`: use `KRW` unless a source-specific rule says otherwise.
- Missing `syncedAt`: keep `null` for historical export.

## Import Verification Views

After importing a sample or historical batch, check:

```sql
select * from v_buyer_purchase_summary;
select * from v_buyer_monthly_amount_change;
select * from v_buyer_product_summary;
select * from v_buyer_reduced_products;
```

Amount analytics should always be reviewed by `currency`.
