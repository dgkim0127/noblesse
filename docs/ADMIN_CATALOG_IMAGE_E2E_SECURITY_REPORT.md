# Admin Catalog Image E2E Security Report

## Scope
- Admin catalog image upload security follow-up for N37-E.
- Fix upload authentication ordering so unauthenticated multipart requests stop before raw body buffering.
- Review product image Storage cleanup behavior.
- Attempt staging synthetic image E2E only when approved staging credentials are present in the current process environment.
- No production product/image data mutation.
- No schema migration.
- No Firebase Hosting deploy required by this report.
- No bucket or IAM change in this step.

## Auth Before Body Parser
- Previous risk: app-level raw multipart parser was mounted before `/api/admin` route authentication.
- Fix: image upload raw parser is now route-local and runs after `requireAdmin`.
- Route order for `POST /api/admin/products/:productId/images`:
  1. `requireAdmin`
  2. route-local multipart raw parser
  3. image upload handler
- App-level upload raw parser was removed.

## Security Test Results
- No-token multipart upload: 401 `UNAUTHORIZED`.
- No-token oversized multipart upload: 401 `UNAUTHORIZED`, before route-local parser.
- Invalid-token multipart upload: 401 `UNAUTHORIZED`.
- Parser before auth: not invoked for no-token/invalid-token requests.
- Upload service before auth: not invoked for no-token/invalid-token requests.
- Approved admin malformed multipart: safe 400 `VALIDATION_ERROR`.
- Approved admin unsupported MIME/signature mismatch: safe 415 `UNSUPPORTED_MEDIA_TYPE`.
- Approved admin too many images: safe 400 `VALIDATION_ERROR`.
- Approved admin oversized body: safe 413 `PAYLOAD_TOO_LARGE`.
- Error responses do not include raw binary, token, DB URL, or secret values.

## Storage Cleanup And Lifecycle Review
- New upload object keys are generated server-side under `products/<productId>/`.
- DB stores image metadata in `products.image_set` and `products.image_alt`; image binary is not stored in PostgreSQL.
- If DB metadata update fails after object upload, uploaded objects are cleaned up.
- If product lookup/update returns not found after object upload, uploaded objects are cleaned up.
- Cleanup failure does not mask the original DB/update failure; only a sanitized object count is logged.
- Existing image replacement does not delete previous image objects in this step to avoid accidental data loss.
- Product deletion image cleanup is not implemented in this step.
- Bucket-wide list/delete was not used.

## Staging E2E
- Required staging E2E env in current Codex process: missing.
- Synthetic product/image upload-readback-cleanup: not executed.
- Production endpoint was not used as a substitute.
- Production product/image mutation: No.

## Runtime Smoke Results
- Staging read-only smoke:
  - `/api/health`: 200
  - `/api/catalog/products`: 200
  - `/api/buyer/me` no-token: 401
  - image upload no-token with malformed multipart: 401
- Production read-only smoke:
  - `/api/health`: 200
  - `/api/catalog/products`: 200
  - `/api/buyer/me` no-token: 401
  - image upload no-token with malformed multipart: 401
- No production product/image creation.

## Remaining Risks
- Staging synthetic upload/read-back/cleanup remains blocked until staging E2E credentials are available in the Codex process environment.
- Existing object cleanup on image replacement and product deletion should be handled behind a separate approved cleanup strategy.

## Go / No-Go
- Auth-before-parser fix: Go.
- Backend security tests: Go.
- Storage cleanup review: Go with deferred lifecycle cleanup gates.
- Staging synthetic image E2E: No-Go, blocked by missing env.
- Production feature verification complete: No, staging synthetic E2E is still blocked.

## Next Gate
- `APPROVE_STAGING_IMAGE_E2E_CREDENTIAL_SETUP = YES`
