# Backend API Boundary

## Purpose

This document defines the trusted backend API responsibilities between the Noblesse React frontend and the PostgreSQL business database.

The React frontend must not connect directly to PostgreSQL. Database credentials must exist only on the server side.

## Current Status

- Frontend mock preview
- Admin mock preview
- PostgreSQL scaffold local dry-run passed with `audit_logs`
- Provider/auth decision is documented in `docs/BACKEND_PROVIDER_AUTH_DECISION.md`
- Route priority and implementation readiness are tracked in `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- Stack decision gate must pass before writing route code.
- Human/operator approval is tracked in `docs/BACKEND_HUMAN_DECISION_RECORD.md`
- Candidate default: Cloud Run + Firebase Auth + PostgreSQL provider
- No production DB connection
- 26B local backend scaffold exists for Phase 1 only
- Phase 1 route skeletons exist for health, catalog products, catalog product detail, and buyer profile
- No production backend deployment yet

## Required Principles

- No `DATABASE_URL` in frontend code or frontend config.
- No direct browser-to-PostgreSQL access.
- All write operations go through a backend API.
- Server recalculates prices and totals.
- Server validates buyer/admin identity.
- Server validates agreement acceptance.
- Server validates market, currency, and MOQ.
- Server writes `audit_logs` for admin and sensitive operations.

## Candidate API Hosting Options

- Cloud Run behind Firebase Hosting rewrite
- Render/Railway API service
- Vercel serverless API
- Node.js Express/Fastify server
- Other controlled backend

## Public / Buyer API Boundaries

These are candidate endpoint boundaries only. They are not implemented in this step.

Backend API boundaries are not implementation approval. `docs/BACKEND_STACK_DECISION_GATE.md` must pass and `docs/BACKEND_HUMAN_DECISION_RECORD.md` must be approved before route code is written.

25B confirms Phase 1 as the first candidate scope after a separate scaffold plan: health check, catalog product reads, product detail read, and buyer profile read.

26A documents the Phase 1 scaffold plan in `docs/BACKEND_PHASE1_SCAFFOLD_PLAN.md`. It covers health/catalog/buyer-me only; write APIs remain future phases.

26B creates the local scaffold for those Phase 1 routes. Route code remains limited to read-only boundaries and mockable Auth/DB dependencies.

26C documents the Phase 1 route contract in `docs/BACKEND_PHASE1_ROUTE_CONTRACT.md` and adds mock QA for request IDs, validation, auth errors, and protected price exclusion. Write APIs remain future phases.

### `GET /api/catalog/products`

- Returns public visible product metadata.
- Does not return protected buyer prices for guest or pending users.

### `GET /api/catalog/products/:productCode`

- Returns public product detail.
- Price visibility depends on approved buyer status.

### `POST /api/buyer/register`

- Creates user/buyer application.
- Validates required agreements.
- Stores `buyer_agreements`.
- Does not automatically approve the buyer.

### `GET /api/buyer/me`

- Returns current buyer profile and approval status.

### `POST /api/inquiries`

- Creates Request Quote.
- Reloads `product_prices` server-side.
- Validates approved buyer status.
- Validates MOQ and minimum amount.
- Recalculates `price_snapshot`, subtotal, and estimated total.
- Inserts `inquiries` and `inquiry_items` in one transaction.

### `GET /api/inquiries`

- Buyer sees own inquiries only.

### `GET /api/inquiries/:id`

- Buyer sees own inquiry and quote status only.

## Admin API Boundaries

These are candidate endpoint boundaries only. They are not implemented in this step.

### `GET /api/admin/dashboard`

- Admin only.
- Returns summary cards and analytics signals.

### `GET /api/admin/buyers`

- Admin only.
- Returns buyer approval list.

### `POST /api/admin/buyers/:buyerId/approve`

- Admin only.
- Validates required agreements.
- Sets market, currency, discount, and minimum amount.
- Writes `audit_logs`.

### `POST /api/admin/buyers/:buyerId/block`

- Admin only.
- Writes `audit_logs`.

### `POST /api/admin/products/:productId`

- Admin only.
- Updates product metadata.
- Writes `audit_logs`.

### `POST /api/admin/product-prices/:priceId`

- Admin only.
- Validates market, currency, MOQ, and price.
- Writes `audit_logs`.

### `POST /api/admin/inquiries/:inquiryId/review`

- Admin only.
- Enforces valid status transition.
- Writes `audit_logs`.

### `POST /api/admin/quotes`

- Admin only.
- Transaction-safe `createAdminQuote`.
- Reloads `product_prices` server-side.
- Validates MOQ.
- Recalculates confirmed totals.
- Inserts `admin_quotes` and `admin_quote_items`.
- Updates inquiry status.
- Writes `audit_logs`.

### `POST /api/admin/quotes/:quoteId/send`

- Admin only.
- Marks quote as sent.
- Creates future notification job.
- Writes `audit_logs`.

### `GET /api/admin/analytics`

- Admin only.
- Reads SQL views.

## Transaction Requirements

- Request Quote creation inserts `inquiries` and `inquiry_items` atomically.
- Admin Quote creation inserts `admin_quotes` and `admin_quote_items` and updates inquiry status atomically.
- Product price update and audit log should be committed in the same transaction.
- Buyer approval and audit log should be committed in the same transaction.

## Not Implemented In This Step

- No production backend server
- No real auth provider connection
- No production DB connection
- No write API route code
- No production migration
