# Admin API Plan

## Purpose

This document defines the future trusted API/RPC layer required before Noblesse admin screens can use production data.

The current admin screens are mock preview only. They must not write directly from the browser to production business tables.

## Why Trusted API/RPC Is Required

- Client viewerState is a preview tool and cannot prove admin identity.
- Browser-side price, subtotal, confirmed total, and status values can be manipulated.
- Admin role must be verified server-side.
- Price changes, buyer approval, Request Quote review, and Admin Quote state changes need a trusted layer.
- PostgreSQL/Supabase should remain the production business source of truth.
- `docs/SUPABASE_MIGRATION_CHECKLIST.md` must pass before production admin API/RPC work starts.
- 21B static SQL review must pass before local/dev SQL dry-run and before API/RPC implementation planning moves into build work.
- Schema, RLS, analytics views, and seed validation must be completed in local/dev first.
- `audit_logs` is required before production admin writes.

## Future Trusted Operations

### 1. approveBuyerApplication

Input:

- buyerId
- assignedMarket
- currency
- discountRate
- minOrderAmount
- adminMemo

Validation:

- admin role
- buyer exists
- required agreements accepted
- market and currency are valid
- required `buyer_agreements` rows are present for the active terms versions

Result:

- buyer status becomes approved
- approved_at and approved_by are recorded
- audit log is recorded

### 2. blockBuyer

Input:

- buyerId
- reason

Validation:

- admin role
- buyer exists

Result:

- buyer status becomes blocked
- audit log is recorded

### 3. updateProduct

Input:

- product fields

Validation:

- admin role
- product code is unique
- valid category, material, and options

Result:

- products record is updated
- updated_at is recorded
- audit log is recorded

### 4. updateProductPrice

Input:

- productId
- market
- currency
- wholesalePrice
- retailPrice
- MOQ
- minOrderAmount
- active

Validation:

- admin role
- market and currency are valid
- price is greater than or equal to zero
- MOQ is greater than zero
- product exists
- market, currency, MOQ, wholesale price, retail price, and minimum amount are validated server-side

Result:

- product_prices record is updated
- audit log is recorded

### 5. reviewInquiry

Input:

- inquiryId
- nextStatus
- adminMemo

Validation:

- admin role
- inquiry exists
- valid status transition

Result:

- inquiries status is updated
- audit log is recorded

### 6. createAdminQuote

Input:

- inquiryId
- quote items
- leadTime
- shippingNote
- adminMemo

Validation:

- admin role
- inquiry exists
- buyer is approved
- product_prices are reloaded server-side
- MOQ is validated
- confirmed totals are recalculated server-side
- operation is transaction-safe
- inquiry status and quote rows are committed together

Result:

- admin_quotes row is inserted
- admin_quote_items rows are inserted
- inquiry status becomes quoted
- audit log is recorded

### 7. sendAdminQuote

Input:

- adminQuoteId

Validation:

- admin role
- quote exists
- quote status transition is allowed

Result:

- quote status becomes sent
- quoted_at is set
- notification job is created
- audit log is recorded

### 8. getAnalyticsDashboard

Validation:

- admin role

Result:

- reads PostgreSQL views:
  - v_top_requested_products_30d
  - v_top_requested_products_by_market
  - v_buyer_inquiry_summary
  - v_category_inquiry_summary
  - v_quote_conversion_monthly
  - v_popular_option_combinations
  - v_monthly_inquiry_trend

## Security

- no privileged key in frontend
- no database connection string in frontend
- RLS remains active
- admin writes go through API/RPC only
- audit_logs table is needed before real admin operations
- admin API/RPC should not be implemented against production until schema/RLS/views pass the migration checklist

## Future Table Suggestion

audit_logs:

- id
- actor_user_id
- actor_role
- action
- target_table
- target_id
- before_snapshot jsonb
- after_snapshot jsonb
- ip_address
- user_agent
- created_at

## Current Boundary

This plan is documentation only. No SQL migration, runtime database connection, or production write path is added in this step.
