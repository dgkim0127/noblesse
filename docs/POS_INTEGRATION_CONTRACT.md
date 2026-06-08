# POS Integration Contract

## 1. Purpose

Noblesse web and pors POS app are separate products.

Noblesse web:

- buyer catalog
- Inquiry List
- Request Quote
- buyer approval
- future admin analytics

pors POS app:

- tablet sales entry
- buyer/customer discount calculation
- VAT calculation
- receipt printing
- sales history
- Firebase-backed POS data

The two products should be connected through shared data contracts, not by merging their UI or codebases.

## 2. Integration Principle

- Noblesse web must not modify POS sales directly in the first version.
- Noblesse web may read or import POS sales data for analytics.
- pors remains the source of truth for actual store sales.
- Noblesse remains the source of truth for B2B catalog and quote workflow.
- Shared IDs and product codes must be aligned before automatic sync.

## 3. Required POS Data for Web Analytics

Required entities:

- stores
- customers or buyers
- items or products
- sales
- sale lines

Required sale fields:

- saleId
- storeId
- customerId or buyerId
- customerName
- saleDate or createdAt
- subtotal
- discount
- supply
- vat
- total

Required sale line fields:

- saleLineId
- saleId
- itemId or productId
- productCode
- itemName or productName
- categoryId
- quantity
- unitPrice
- lineTotal

## 4. Field Mapping

pors customer -> Noblesse buyer

pors item -> Noblesse product or POS local product

pors sale -> POS sale record

pors sale line -> POS sale item

pors category -> product category

Mapping rules:

- customerId should map to buyerId when possible.
- productCode should map to Noblesse NB-* code when possible.
- POS-only products should be treated as local/custom products.
- Missing productCode must not break analytics.
- customerName can be used as fallback only, not as stable ID.

## 5. Analytics Required by Noblesse

Buyer analytics:

- purchase count
- total purchase amount
- average purchase amount
- latest purchase date
- repeat interval
- monthly amount change
- monthly quantity change
- frequently purchased products
- reduced purchase products
- category preference
- inactive buyer detection

Product analytics:

- total quantity
- total amount
- buyer count
- repeat buyer count
- month-over-month trend
- declining products
- best-seller candidates

## 6. Import / Read Strategy

Version 1:

- manual JSON/CSV import or read-only Firebase data check

Version 2:

- read POS sales from Firebase with read-only service

Version 3:

- scheduled sync or server-side aggregation

Do not implement automatic write-back to POS data in version 1.

## 7. Security

- POS sales data is sensitive.
- Public users must not read POS sales data.
- Approved buyers must not read other buyers' sales data.
- Admin-only analytics access is required.
- Firebase Security Rules or server-side access control must protect POS sales data.
- Do not commit production Firebase keys or private credentials.

## 8. Required Questions Before Implementation

Before building analytics, confirm from pors:

- actual Firebase collection names
- actual sale document shape
- whether sale lines are embedded array or separate collection
- customer/buyer collection name
- item/product collection name
- timestamp field names
- amount field names
- store/device identity fields
- whether productCode exists
- whether customerId is stable

## 9. Development Plan

Phase 1:

- add this contract document

Phase 2:

- add pors Firebase data map document

Phase 3:

- build POS sales sample import parser in Noblesse

Phase 4:

- build buyer analytics service

Phase 5:

- build admin analytics screen

Phase 6:

- connect community/product feedback later
