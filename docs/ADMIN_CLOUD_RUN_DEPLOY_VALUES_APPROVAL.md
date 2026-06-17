# Admin Cloud Run Deploy Values Approval

## Purpose

- Record the approved or pending non-secret Cloud Run deploy values before any future deploy.
- Keep real deploy execution blocked.
- Keep secrets, DB/Auth, Firebase rewrite, and production admin_memo blocked.
- This step is docs-only.

## Current Status

- Required APIs: Enabled
- health-only entrypoint smoke: Go
- source path: backend
- build method: existing backend/Dockerfile through Cloud Build
- Cloud Run deploy: No-Go
- Secret Manager secret creation: No-Go
- Firebase /api rewrite: No-Go
- production admin_memo rollout: No-Go
- frontend source dirty: allowed but not staged

## Deploy Value Decision Table

| Item | Proposed Value | Status | Notes |
| --- | --- | --- | --- |
| Project | configured active project | Pending approval | Do not record project id. |
| Region | asia-northeast3 or asia-northeast1 | Pending approval | Choose based on operator preference and future DB location. |
| Service name | noblesse-admin-backend | Proposed | Non-secret service name. |
| Source path | backend | Proposed | Existing backend package path. |
| Build method | backend/Dockerfile via Cloud Build | Proposed | Docker Desktop not required locally. |
| Runtime env mode | NODE_ENV=production | Proposed | Health-only flag may be used for smoke. |
| Health-only flag | ALLOW_HEALTH_ONLY_STARTUP=true for initial runtime smoke | Proposed | Does not unlock admin write. |
| Runtime service account | dedicated least-privilege service account | Pending | Do not record real email. |
| Ingress | TBD | Pending | Must fit future Firebase Hosting /api rewrite. |
| Unauthenticated access | TBD | Pending | Health may be public; admin routes require backend auth. |
| Secret strategy | Secret Manager only | Pending | No secret value in docs. |
| Rollback owner | user/operator | Pending | Must be confirmed before deploy. |

## Recommended Safe Initial Runtime Values

Recommended for future deploy approval:

- service name: noblesse-admin-backend
- source path: backend
- build method: existing backend/Dockerfile via Cloud Build
- env:
  - NODE_ENV=production
  - ALLOW_HEALTH_ONLY_STARTUP=true
- no DATABASE_URL
- no Firebase credentials
- no production write
- no Firebase /api rewrite

Reason:

- validates backend runtime and /api/health without DB/Auth secrets
- admin routes remain fail-closed
- avoids secret setup before basic runtime smoke

## Required User Decisions

Before deploy:

- choose region
- approve service name
- approve health-only initial runtime smoke
- approve whether runtime is unauthenticated at Cloud Run level or restricted
- approve runtime service account strategy
- approve no-secret first deploy
- approve rollback owner

## Explicit No-Go

- no gcloud run deploy in 32K-11
- no Cloud Build execution in 32K-11
- no Cloud Run service creation in 32K-11
- no Secret Manager secret creation in 32K-11
- no Firebase deploy
- no Firebase /api rewrite
- no DB/Auth/SQL
- no production admin_memo write
- no status/buyer/product/price/quote writes
