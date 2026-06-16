# Admin Mock Backend Route QA Report

## Scope

- QA for 32E mock-only Admin backend skeleton.
- No real DB.
- No real Firebase Auth.
- No SQL execution.
- No Firebase `/api` rewrite.
- No deploy.
- No frontend `src` changes.

## Inputs Reviewed

- `docs/ADMIN_BACKEND_SKELETON_APPROVAL_PLAN.md`
- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `backend/src/app.js`
- `backend/src/routes/adminRoutes.js`
- `backend/src/auth/requireAdmin.js`
- `backend/src/services/admin*.js`
- `backend/src/db/queries/admin*.js`
- `backend/src/utils/*.js`
- `backend/tests/admin*.test.js`

## Route Inventory

Expected mounted prefix:

- `/api/admin`

Expected read routes:

- `GET /api/admin/dashboard`
- `GET /api/admin/inquiries`
- `GET /api/admin/inquiries/:inquiryId`
- `GET /api/admin/buyers`
- `GET /api/admin/products`

Expected mock-only write-shaped route:

- `PATCH /api/admin/inquiries/:inquiryId/memo`

Expected blocked routes:

- `PATCH /api/admin/inquiries/:inquiryId/status`
- `POST /api/admin/quotes`
- `DELETE /api/admin/*`

## Static Review Results

- App mount: `backend/src/app.js` mounts `/api/admin` and keeps `/api/health`, `/api/catalog`, and `/api/buyer`.
- `requireAdmin`: uses injected `verifier.verifyIdToken` and injected `loadAdminUserByAuthUid`.
- `requireAdmin`: requires `role = admin` and `status = approved`.
- `requireAdmin`: does not trust frontend `viewerState`.
- Read route handlers: dashboard, inquiries, inquiry detail, buyers, and products exist.
- Memo route handler: `PATCH /inquiries/:inquiryId/memo` exists and calls the injected service.
- Blocked route behavior: status, quote, and delete routes are intentionally not implemented.
- Validators: UUID, enum, boolean-like, string, and unknown field validation exist.
- Pagination: default `limit` 20, max `limit` 100, offset accepted, `nextCursor` remains `null`.
- Service/query injection: admin services depend on injected query objects.
- Real DB/Auth absence: tests use mock auth and mock query/service dependencies only.
- `DATABASE_URL` usage: no direct use in new admin skeleton code.
- Firebase Admin credential absence: no real credential or project connection is required for mock tests.

## Test Results

- Backend command: `cd backend && npm.cmd test`
- Result: Pass
- Tests passed: 34
- Admin auth tests: pass
- Admin dashboard tests: pass
- Admin inquiries tests: pass
- Admin inquiry detail tests: pass
- Admin buyers tests: pass
- Admin products tests: pass
- Admin inquiry memo tests: pass
- Blocked route tests: pass

## Go / No-Go

- Mock-only admin backend skeleton QA: Go
- Real admin write implementation: No-Go
- Real DB/Auth integration: No-Go
- Production rollout: No-Go

## 32G Local Dry-run Planning Follow-up

- The next planning step is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_PLAN.md`.
- 32G does not change the mock-only skeleton.
- The mock skeleton remains separate from any future local DB dry-run implementation.

## 32H Local Query Path Follow-up

- 32H extends the memo skeleton with a local-only transaction-capable query path.
- Fake pool tests verify memo transaction behavior and `audit_logs` insert behavior.
- Route-level memo tests remain mock dependency tests and still pass.
- Real DB/Auth integration, local PostgreSQL dry-run, production rollout, Firebase `/api` rewrite, and deploy remain blocked.
