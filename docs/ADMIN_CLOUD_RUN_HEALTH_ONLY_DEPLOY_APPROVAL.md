# Admin Cloud Run Health-only Deploy Approval

## Purpose

- Define the final approval gate for the first Cloud Run health-only backend deploy.
- This deploy, when separately approved later, is only for runtime health smoke.
- It must not enable production admin_memo write.
- It must not connect DB/Auth/Secret Manager.
- It must not add Firebase /api rewrite.
- This step is docs-only.

## Current Status

- Required APIs: Enabled
- Health-only entrypoint smoke: Go
- Source path: backend
- Build method: existing backend/Dockerfile through Cloud Build
- Cloud Run deploy execution: No-Go
- Cloud Build execution: No-Go
- Secret Manager secret creation: No-Go
- Firebase /api rewrite: No-Go
- DB/Auth/SQL: No-Go
- production admin_memo write: No-Go
- frontend source dirty: allowed but not staged

## Proposed First Deploy Shape

Future deploy candidate only:

- project: configured active project, real id not recorded
- service: noblesse-admin-backend
- region: asia-northeast3 recommended; asia-northeast1 fallback
- source: backend
- build: existing backend/Dockerfile through Cloud Build
- env:
  - NODE_ENV=production
  - ALLOW_HEALTH_ONLY_STARTUP=true
- no DATABASE_URL
- no Firebase private key
- no Firebase client email
- no GOOGLE_APPLICATION_CREDENTIALS
- no Secret Manager secret
- no Firebase /api rewrite
- no production admin_memo write

## Region Decision

Recommended:

- asia-northeast3 as first candidate if Korea/Seoul latency and operator preference matter.
- asia-northeast1 as fallback if Seoul availability, pricing, or operator preference requires it.

Status:

- Pending user approval.

## Public Access / Ingress Decision

Decision needed:

- Should the initial Cloud Run health-only service allow unauthenticated requests for /api/health smoke?
- Admin routes must still fail closed through backend auth.
- No DB/Auth/Secret is connected in the first health-only deploy.

Candidate:

- Allow unauthenticated only for initial health smoke if explicitly approved.
- Treat it as temporary/pre-production runtime validation.
- Do not connect Firebase Hosting /api rewrite yet.

Status:

- Pending user approval.

## Runtime Service Account Decision

Candidate:

- Use a dedicated least-privilege runtime service account later.
- For health-only no-secret deploy, no Secret Manager access is required.
- Do not record real service account email in docs.

Status:

- Pending user approval.

## Required Before Actual Deploy

Before any gcloud run deploy:

- user explicitly approves actual deploy
- user approves region
- user approves service name
- user approves public/unauthenticated boundary
- user approves health-only env mode
- user confirms no DB/Auth/Secret Manager for first deploy
- rollback command/owner documented
- POS/default site impact confirmed none
- Firebase /api rewrite remains blocked

## Placeholder Command - Do Not Run

Document only:

```sh
# DO NOT RUN in 32K-12. Placeholder only.
gcloud run deploy noblesse-admin-backend \
  --source backend \
  --region <APPROVED_REGION> \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,ALLOW_HEALTH_ONLY_STARTUP=true
```

Rules:

- Do not run this command in 32K-12.
- Do not include actual project id.
- Do not add DATABASE_URL.
- Do not add Firebase credentials.
- Do not add Secret Manager references.
- Do not deploy Firebase Hosting.
- Do not add /api rewrite.

## Smoke Checks After Future Deploy

Future checks only:

- Cloud Run service URL exists
- GET /api/health returns 200
- /api/health body has ok=true, service=noblesse-backend, version=phase1
- GET /api/admin/dashboard without token returns 401
- requestId present
- no raw secret leak
- no raw SQL leak
- no DB write occurred
- Firebase /api rewrite still absent

## No-Go Boundaries

Still blocked:

- Cloud Run deploy in 32K-12
- Cloud Build execution in 32K-12
- Secret Manager secret creation
- DB/Auth/SQL
- Firebase deploy
- Firebase /api rewrite
- production admin_memo write
- status/buyer/product/price/quote writes
