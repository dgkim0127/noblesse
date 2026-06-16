# Admin Backend Skeleton Approval Plan

## Purpose

- Decide the exact mock-only backend skeleton scope before implementation.
- Align read-only admin baseline with the full editable admin target.
- Allow only safe mock-only backend route scaffolding in the next implementation step.
- Keep real DB, real Firebase Auth, SQL migrations, Firebase rewrite, and production rollout blocked.

## Inputs Reviewed

- `docs/ADMIN_FULL_EDITABLE_SCOPE.md`
- `docs/ADMIN_WRITE_API_CANDIDATES.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/ADMIN_WRITE_SCHEMA_IMPACT_REVIEW.md`
- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `docs/ADMIN_READ_ONLY_API_CONTRACT.md`
- `docs/ADMIN_READ_ONLY_BACKEND_SCAFFOLD_PLAN.md`

## Current Decision

- Mock-only admin backend skeleton planning: Go
- Real admin write implementation: No-Go
- Real DB/Auth integration: No-Go
- Production admin rollout: No-Go

## Approved Scope For Next Code Step

Next code step may create a mock-only admin backend skeleton.

Allowed backend routes in next code step:

Read routes:

- `GET /api/admin/dashboard`
- `GET /api/admin/inquiries`
- `GET /api/admin/inquiries/:inquiryId`
- `GET /api/admin/buyers`
- `GET /api/admin/products`

First write-skeleton route:

- `PATCH /api/admin/inquiries/:inquiryId/memo`

Important:

- PATCH memo route must be mock-only.
- It must not connect to real DB.
- It must not use real Firebase Auth.
- It must not modify SQL/schema.
- It must not be deployed.
- It must return mock `auditLogId` in tests only.
- It must preserve the contract in `docs/ADMIN_WRITE_API_CONTRACT.md`.

Explicitly not allowed in next code step:

- `PATCH /api/admin/inquiries/:inquiryId/status`
- `PATCH /api/admin/buyers/:buyerId/status`
- `PATCH /api/admin/buyers/:buyerId/profile`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:productId`
- `PATCH /api/admin/products/:productId/visibility`
- product price writes
- quote writes
- category writes
- banner/catalog file writes
- `DELETE` routes
- payment/checkout/order routes

## Mock-only Safety Rules

The next code step may implement backend skeleton only if all rules below are followed:

- No `DATABASE_URL` usage.
- No production DB connection.
- No local PostgreSQL connection.
- No Firebase Admin SDK credential.
- No real Firebase token verification.
- No SQL execution.
- No schema migration.
- No Firebase Hosting `/api` rewrite.
- No deploy.
- No package dependency addition.
- No frontend admin integration.
- No frontend Register/member signup changes.

Required design:

- dependency injection for auth verifier
- dependency injection for admin user loader
- dependency injection for admin services/queries
- mock services/queries in tests
- requestId included in success/error
- safe error response
- no raw SQL error exposure
- route tests use Node built-in test runner

## Allowed Backend Files For Next Code Step

Allowed future files:

- `backend/src/routes/adminRoutes.js`
- `backend/src/auth/requireAdmin.js`
- `backend/src/services/adminDashboardService.js`
- `backend/src/services/adminInquiryService.js`
- `backend/src/services/adminBuyerService.js`
- `backend/src/services/adminProductService.js`
- `backend/src/db/queries/adminDashboardQueries.js`
- `backend/src/db/queries/adminInquiryQueries.js`
- `backend/src/db/queries/adminBuyerQueries.js`
- `backend/src/db/queries/adminProductQueries.js`
- `backend/src/utils/pagination.js`
- `backend/src/utils/validators.js`
- `backend/tests/adminAuth.test.js`
- `backend/tests/adminDashboard.test.js`
- `backend/tests/adminInquiries.test.js`
- `backend/tests/adminInquiryDetail.test.js`
- `backend/tests/adminBuyers.test.js`
- `backend/tests/adminProducts.test.js`
- `backend/tests/adminInquiryMemo.test.js`

Allowed existing backend file modification:

- `backend/src/app.js`
  - may mount `/api/admin`
  - must preserve existing health/catalog/buyer routes
  - must not create real DB pool
  - must not require real Firebase credentials

Not allowed:

- root `package.json`
- `backend/package.json`
- `firebase.json`
- `.firebaserc`
- `supabase/*.sql`
- frontend `src/*`
- POS/APK/Capacitor files

## PATCH /api/admin/inquiries/:inquiryId/memo Skeleton Requirements

The memo route in next code step must:

- require mock/injected admin auth
- validate `inquiryId` UUID
- reject unknown body fields
- validate `adminMemo` as string
- call injected service only
- return:
  - updated inquiry mock object
  - mock `auditLogId`
  - requestId
- return `VALIDATION_ERROR` for invalid UUID/body
- return `NOT_FOUND` for mock not found
- return `FORBIDDEN` for non-admin
- return `UNAUTHORIZED` for missing/invalid token

It must not:

- execute SQL
- update real DB
- write real `audit_logs`
- read `DATABASE_URL`
- depend on Firebase Admin SDK
- expose stack trace

Notes:

- The route is a skeleton only.
- Real write remains blocked until Auth, DB, transaction, and audit path are implemented.

## Required Mock Tests For Next Code Step

Required tests:

Auth:

- missing token -> `UNAUTHORIZED`
- invalid token -> `UNAUTHORIZED`
- non-admin -> `FORBIDDEN`
- pending/blocked admin -> `FORBIDDEN`
- approved admin can access read route

Read routes:

- `GET /api/admin/dashboard` returns mock data
- `GET /api/admin/inquiries` returns mock list
- `GET /api/admin/inquiries/:inquiryId` returns mock detail
- invalid `inquiryId` -> `VALIDATION_ERROR`
- not found inquiry -> `NOT_FOUND`
- `GET /api/admin/buyers` returns mock list
- `GET /api/admin/products` returns mock list

Memo write skeleton:

- `PATCH /api/admin/inquiries/:inquiryId/memo` requires admin
- invalid `inquiryId` -> `VALIDATION_ERROR`
- unknown body field -> `VALIDATION_ERROR`
- `adminMemo` invalid type -> `VALIDATION_ERROR`
- not found -> `NOT_FOUND`
- success returns inquiry + `auditLogId` + requestId

Blocked routes:

- `PATCH /api/admin/inquiries/:inquiryId/status` is not implemented
- `POST /api/admin/quotes` is not implemented
- product price writes are not implemented
- `DELETE` routes are not implemented

## Implementation Go / No-Go

Go:

- mock-only admin backend skeleton
- read-only admin routes
- mock-only inquiry memo write skeleton
- mock auth/mock query tests
- no real DB/Auth

No-Go:

- real DB write
- real Firebase Auth
- status write
- buyer approval write
- product write
- price write
- quote write
- production rollout
- Firebase `/api` rewrite
- deploy

Next recommended step:

- 32E: implement mock-only admin backend skeleton with read routes and inquiry memo write skeleton.
