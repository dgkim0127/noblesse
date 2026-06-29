# Signup Terms Enforcement Canary Report

## Scope
- Task: N56-SIGNUP-TERMS-ENFORCEMENT-AND-CANARY-1
- Repository: C:\noblesse-main-work
- Branch: main
- Production API: https://noblesse.web.app/api
- Production backend service: noblesse-backend
- Region: asia-northeast3

## Agreement Enforcement
- Required agreement keys:
  - terms_of_service: terms-v1.0
  - buyer_terms: buyer-terms-v1.0
  - privacy_collection_use: privacy-v1.0
- Optional agreement:
  - marketing_updates can be false or omitted.
- Backend rejects missing agreement arrays.
- Backend rejects missing required keys.
- Backend rejects required agreement values that are not strict boolean true.
- Backend rejects unknown agreement keys through the existing validation convention.
- Backend does not receive or store password payloads.
- Member lifecycle remains buyer / pending with admin approval required.

## Code Changes
- c63beb247c893e63e03eb7ad3862542b3a67e7f0: enforce required signup agreements.
- 30f1493c141acd118e10936f5867b450de02854b: support legacy signup schema without migration.
- 2513c81e1d8bec5bde29db09c6c95feb38e27808: support legacy buyer submitted timestamp absence.

## Validation
- Backend tests: 347 passed.
- Frontend tests: 109 passed.
- Lint: passed.
- Build: passed with the existing Vite chunk-size warning only.
- git diff --check: passed before commits.
- Secret handling: no password, Firebase token, DB URL, service account key, or private key was recorded in repo/docs.

## Backend Deployment
- Rollback baseline observed before N56: noblesse-backend-00007-lzv.
- Final backend revision: noblesse-backend-00010-r2g.
- Final backend image digest: sha256:48bf9176fbab873eab20cb0a05c4b0d33813d065bc3110c991358683e6641594.
- Traffic: 100 percent to the final revision.
- Firebase Hosting deploy: No.
- DB migration: No.
- Direct DB/SQL: No.
- Secret Manager mutation: No.
- IAM mutation: No.
- FX/Scheduler mutation: No.

## Production Smoke
- GET /api/health: 200.
- GET /api/catalog/products: 200.
- POST /api/buyer/register without token: 401.
- GET /api/catalog/products/NB-001: 404 because the production catalog is currently empty.

## Production Signup Canary
- Controlled production signup canary was performed after backend deploy.
- Required agreement payload: all three required agreements set to strict boolean true.
- Optional marketing agreement: false.
- Signup result: 201.
- /api/buyer/me read-back: 200.
- Member role: buyer.
- Member status: pending.
- Account status: active.
- Verification status: pending.
- Assigned market: TW.
- Currency: TWD.
- Canary approval: No.
- Password exposed: No.
- Firebase token exposed: No.
- Full email or Firebase UID recorded: No.

## Failed Canary Attempts During Recovery
- First recovery canary failed before the final fix because production schema lacked account_status.
- Second recovery canary failed before the final fix because production schema lacked buyers.submitted_at.
- Both failures were handled without DB migration, direct SQL, or secret access.
- Failed attempts may have created redacted Firebase Auth canary users without buyer profiles.

## Product Detail State
- Product detail route exists.
- Product detail API exists.
- Production product count: 0.
- NB-001 detail: 404.
- Detail canary was not performed because no published production product exists.
- Next product gate: APPROVE_PRODUCT_CATALOG_SEED_AND_DETAIL_CANARY = YES.

## Decision
- Signup state: SIGNUP_OPERATIONAL.
- Product detail state: DETAIL_ROUTE_READY_BUT_NO_PRODUCTION_PRODUCT.
