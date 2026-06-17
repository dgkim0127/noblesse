# Admin Cloud Run Deploy Values Decision

## Purpose

- Decide the non-secret Cloud Run deployment values required before any future deploy.
- Keep all real deploy actions blocked.
- Keep production admin_memo rollout blocked.
- This step is docs-only.

## Current Status

- Cloud Run deploy checklist: documented
- deploy execution: No-Go
- Cloud Build: No-Go
- Firebase /api rewrite: No-Go
- production DB/Auth/Secret: No-Go
- production admin_memo write: No-Go
- frontend source dirty: allowed but not staged

## Decision Items

| Item | Decision Type | Candidate / Rule | Status |
| --- | --- | --- | --- |
| Google Cloud project | non-secret identifier | use approved project only, avoid recording sensitive project metadata | Pending |
| Region | non-secret | choose region near DB/operator preference | Pending |
| Service name | non-secret | Noblesse admin backend scoped name | Pending |
| Source path | non-secret | backend | Proposed |
| Build method | non-secret | Cloud Run source deploy with backend/Dockerfile via Cloud Build | Proposed |
| Runtime service account | sensitive identifier | do not record real email until approved | Pending |
| Secret strategy | sensitive | Secret Manager only, no values in docs | Pending |
| Startup policy | architecture | health should not require DB/Auth unless explicitly approved | Pending |
| Ingress policy | architecture | must fit future Firebase /api rewrite | Pending |
| Public access boundary | architecture | health may be public, admin routes require backend auth | Pending |
| Rollback owner | operational | must be assigned before deploy | Pending |

## Recommended Placeholder Runtime Spec

- project: `<PROJECT_ID>`
- region: `<REGION>`
- service: `<SERVICE_NAME>`
- source: `backend`
- build: existing `backend/Dockerfile` through Cloud Build
- runtime service account: `<RUNTIME_SERVICE_ACCOUNT>`
- database secret: `<DATABASE_URL_SECRET_NAME>`
- firebase credential strategy: `<FIREBASE_CREDENTIAL_STRATEGY>`
- deploy: No-Go

## Startup / Health Policy Decision

Problem:

- Production env currently requires DB/Firebase-related config.
- Cloud Run health smoke should be able to verify runtime safely.
- Admin routes must remain protected.

Options:

### Option A. Require all production secrets before first runtime boot

- Strictest production parity.
- Blocks health smoke until DB/Auth/Secret setup is complete.
- Higher risk of deploy being impossible to smoke-test independently.

### Option B. Allow safe health-only startup without DB/Auth secrets, while admin routes fail closed

- Allows runtime `/api/health` verification before production DB/Auth is wired.
- Requires backend startup behavior to avoid importing or connecting DB/Auth at boot.
- Admin routes must remain closed without credentials.

### Option C. Create staging-only runtime config first

- Tests runtime path with staging/prod-like secrets before production.
- Requires staging DB/Auth/Secret decisions first.
- Best fit before production admin_memo rollout.

Recommended candidate:

- Use Option B for initial runtime health smoke if approved.
- Use Option C before any production write rollout.
- Do not implement either option in 32K-5.
- Do not modify backend/src in 32K-5.

## Source / Build Method Decision

- Source path candidate: `backend`
- Build method candidate: existing `backend/Dockerfile` through Cloud Build
- Buildpacks: fallback/alternative only
- Docker Desktop: optional, not required for this planning path
- local Docker smoke: optional but recommended if Docker CLI becomes available

## Required Before Actual Deploy

- approved project
- approved region
- approved service name
- approved runtime service account
- Secret Manager strategy
- startup/health policy
- rollback owner
- POS/default site protection
- Cloud Run IAM/ingress decision
- no-secret logging policy
- user approval

## Explicit No-Go

- no gcloud run deploy
- no Cloud Build
- no Cloud Run service
- no Secret Manager
- no Firebase Auth
- no Firebase /api rewrite
- no production DB connection
- no production admin_memo write
- no status/buyer/product/price/quote writes

## 32K-5 Decision Summary

- Deploy values are documented as pending or proposed.
- Real deploy values are not recorded.
- Only placeholder values are recorded.
- Source path/build method candidate remains `backend` with existing `backend/Dockerfile` through Cloud Build.
- Startup/health policy remains pending, with Option B and Option C as recommended candidates.
- Production runtime deployment remains No-Go.
- Production admin_memo rollout remains No-Go.

## 32K-6 Health-only Startup Follow-up

- `ALLOW_HEALTH_ONLY_STARTUP=true` candidate is implemented for backend runtime smoke.
- Only the explicit flag allows production health-only startup without DB/Auth secrets.
- Default production config remains strict when the flag is absent.
- Health-only mode allows `/api/health` to respond without DB/Auth secrets.
- Admin routes remain fail-closed without token and still return `UNAUTHORIZED`.
- Production deploy remains No-Go.
- Firebase `/api` rewrite remains No-Go.
- Production admin_memo rollout remains No-Go.
