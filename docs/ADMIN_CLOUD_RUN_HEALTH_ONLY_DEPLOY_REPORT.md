# Admin Cloud Run Health-only Deploy Report

## Scope

- First Cloud Run health-only backend deployment
- Source deploy using backend/Dockerfile
- Cloud Build executed
- Dedicated no-role runtime service account
- Public health smoke enabled
- No DB
- No Firebase Admin credentials
- No Secret Manager
- No Firebase Hosting rewrite
- No production write
- No secret recorded

## Approval

- Explicit user approval: Yes
- Region approved: asia-northeast3
- Service name approved: noblesse-admin-backend
- Public health smoke approved: Yes
- Dedicated runtime identity approved: Yes
- min instances: 0
- max instances: 1
- rollback owner: operator

## Deployment

- deploy executed: Yes
- source path: backend
- Dockerfile used: Yes
- Cloud Build executed: Yes
- Artifact Registry repository created or reused: Created during first source deploy, reused on final deploy
- dedicated runtime service account created: Yes
- runtime service account role grants added: No
- service created: Yes
- revision ready: Yes
- service URL available: Yes
- raw service URL recorded: No
- real project id recorded: No
- account email recorded: No
- runtime service account email recorded: No
- initial validation rollback executed: Yes
- final rollback executed: No

## Runtime Configuration

- NODE_ENV=production: Yes
- ALLOW_HEALTH_ONLY_STARTUP=true: Yes
- min instances=0: Yes
- max instances=1: Yes
- ingress all: Yes
- public invocation enabled: Yes
- port 8080: Yes
- DATABASE_URL supplied: No
- Firebase credentials supplied: No
- Secret Manager reference supplied: No

## Smoke

- /api/health status: 200
- health body sanitized:
  - ok=true
  - service=noblesse-backend
  - version=phase1
- admin no-token status: 401
- UNAUTHORIZED verified: Yes
- requestId present: Yes
- raw secret leak: No
- raw SQL leak: No

## No-Go

- Firebase /api rewrite: No-Go
- Firebase deploy: No-Go
- DB/Auth/SQL: No-Go
- production admin_memo write: No-Go
- status/buyer/product/price/quote writes: No-Go

## Go / No-Go

- Health-only Cloud Run runtime: Go
- Production backend integration: No-Go
- Production admin write: No-Go

## 32K-14 Operations Audit Follow-up

- Read-only operations audit is documented in `docs/ADMIN_CLOUD_RUN_HEALTH_ONLY_OPERATIONS_AUDIT.md`.
- Runtime remains health-only.
- Service is recommended to be kept temporarily while the next backend integration phase is active.
- Firebase `/api` rewrite remains No-Go.
- DB/Auth/Secret integration remains No-Go.
- Production admin_memo write remains No-Go.
