# Admin Production Secret Manager Plan

## Purpose

- Plan production secret storage and runtime configuration before enabling admin_memo in production.
- Define which values must be stored as secrets, which values are non-secret runtime config, and which values are forbidden in frontend.
- Keep actual secret creation, gcloud commands, DB/Auth integration, Firebase rewrite, and deploy blocked.
- This step is docs-only.

## Current Decision Status

- Secret management planning: Go
- Secret creation: No-Go
- Secret value recording: No-Go
- Production DB/Auth integration: No-Go
- Firebase Hosting /api rewrite: No-Go
- Production admin_memo rollout: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- docs/ADMIN_PRODUCTION_INFRA_DECISION.md
- docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md
- docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md
- docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md
- docs/ADMIN_WRITE_API_CONTRACT.md
- docs/ADMIN_WRITE_SAFETY_GATES.md
- docs/BACKEND_API_BOUNDARY.md
- docs/BACKEND_IMPLEMENTATION_READINESS.md
- supabase/VALIDATION_NOTES.md

## Secret Inventory

Secret values:

- production DATABASE_URL
- staging DATABASE_URL if staging exists
- any future external API secret
- any future private service credential if explicitly approved

Non-secret runtime config:

- NODE_ENV
- PORT
- FIREBASE_PROJECT_ID or equivalent project identifier
- ADMIN_API_ENABLED feature flag
- ADMIN_MEMO_WRITE_ENABLED feature flag
- allowed origin config if it does not contain secrets
- service name / environment label

Forbidden in frontend:

- DATABASE_URL
- PostgreSQL username/password
- service account JSON
- Firebase Admin credential
- SUPABASE_SERVICE_ROLE_KEY
- any admin secret
- any DB connection string

Current status:

- inventory planning only
- no secret created
- no value recorded

## Secret Naming Plan

Candidate secret names:

- noblesse-prod-database-url
- noblesse-staging-database-url
- noblesse-prod-admin-runtime-config only if needed later
- noblesse-staging-admin-runtime-config only if needed later

Rules:

- names may be documented
- values must not be documented
- avoid ambiguous names like DATABASE_URL without environment prefix
- prod and staging secrets must be separate
- local dry-run secrets must not be promoted automatically to production

Current status:

- naming plan only
- no secret created

No-Go:

- do not create Secret Manager secrets in 32J-4
- do not add real secret values to docs
- do not add real secret values to .env.example

## Secret Storage Provider Decision

Recommended direction:

- Google Secret Manager or equivalent managed secret store.

Reason:

- Cloud Run/equivalent runtime can read secrets server-side.
- Secret access can be limited to runtime service account.
- Secret versions can support rotation.
- Secret access can be audited.
- Secrets stay out of frontend and repo.

Current status:

- planning only
- provider not provisioned
- no secret created
- no IAM modified

No-Go:

- do not run gcloud secrets commands in 32J-4
- do not create secret versions
- do not grant IAM access

## Runtime Secret Injection Plan

Future runtime behavior:

- backend runtime receives DATABASE_URL from Secret Manager or equivalent
- backend code reads DATABASE_URL only server-side
- frontend never receives DATABASE_URL
- Dockerfile must not contain DATABASE_URL
- Cloud Build config must not contain raw secret
- Firebase Hosting config must not contain DB secret

Recommended:

- inject production DATABASE_URL into backend runtime as environment variable from secret reference
- keep Secret Manager secret names environment-specific
- separate staging and production secrets

Current status:

- planning only
- no runtime env added
- no Cloud Run config changed

No-Go:

- no runtime secret injection in 32J-4
- no Dockerfile/cloudbuild changes in 32J-4

## Service Account Access Policy

Future runtime service account:

- can read only the required production DB secret
- should not have project Owner
- should not have broad Secret Manager Admin unless explicitly approved
- should have minimum required logging permissions
- should connect to production DB only through approved network/access model

Required before implementation:

- service account name selected
- secret accessor permission reviewed
- DB network permission reviewed
- owner/reviewer identified
- rollback/revoke access path documented

Current status:

- planning only
- no service account created
- no IAM change

No-Go:

- do not create service account in 32J-4
- do not grant IAM in 32J-4

## Environment Separation

Environments:

- local
- staging or production-like clone
- production

Rules:

- local DB URL stays local only
- staging DB URL is separate from production DB URL
- production DB URL is never used for local dry-run
- staging data must be safe and non-sensitive unless explicitly approved
- production secret must not be copied into local files
- frontend env must not contain DB secret in any environment

Current status:

- planning only

No-Go:

- do not reuse local dry-run URL as production secret
- do not store production DB URL in local repo files

## Secret Rotation Plan

Required before production:

- rotation owner identified
- rotation procedure documented
- rollback to previous secret version understood
- backend restart/revision behavior understood
- audit trail for secret version changes
- incident response procedure if secret leaks

Recommended:

- support secret versioning
- avoid logging secret values
- verify backend can reload or restart safely after rotation
- test rotation in staging before production

Current status:

- planning only
- no rotation executed

No-Go:

- no rotation command in 32J-4

## No-leak Verification Checklist

Before any production secret is introduced:

- search repo for actual connection strings
- search docs for raw postgres URLs
- search frontend env for DB secrets
- search Firebase config for DB secrets
- search Dockerfile/cloudbuild for DB secrets
- ensure .env files are ignored
- ensure logs do not print DATABASE_URL
- ensure error responses do not leak raw DB errors

Search patterns:

- postgres://
- postgresql://
- DATABASE_URL
- password
- SUPABASE_SERVICE_ROLE_KEY
- FIREBASE_ADMIN
- GOOGLE_APPLICATION_CREDENTIALS

Rules:

- variable names are allowed in docs
- actual secret values are not allowed
- "password recorded: No" type wording is allowed
- raw URLs are never allowed

Current status:

- planning only

## Secret Failure Modes

Expected failures:

- secret missing
- secret version disabled
- service account cannot access secret
- malformed DATABASE_URL
- DB host unreachable
- DB credentials invalid

Required behavior:

- backend should fail safely
- no raw secret printed
- no raw SQL error leaked
- health/readiness should expose safe failure only
- requestId preserved where applicable

Current status:

- planning only
- no implementation

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-4 Judgment |
| --- | --- | --- | --- |
| Production DATABASE_URL | Secret Manager or equivalent | Not created | Plan only |
| Staging DATABASE_URL | Separate secret | Not created | Plan only |
| Runtime service account | Least-privilege secret access | Not created | Plan only |
| Frontend DB secrets | Forbidden | Not present by design | Keep blocked |
| Dockerfile secrets | Forbidden | No Dockerfile | Keep blocked |
| Firebase Hosting DB secrets | Forbidden | None | Keep blocked |
| Secret rotation | Versioned/owned rotation | Not implemented | Plan only |
| Production admin_memo write | Requires secret gates | Blocked | No-Go |

## Recommended Next Phases

### 32J-5

Firebase Auth admin verification plan:

- Firebase Admin SDK runtime strategy
- ID token verification
- users.auth_uid mapping
- admin bootstrap boundary

### 32J-6

Admin bootstrap plan:

- controlled first admin
- disable/rollback
- no public signup

### 32J-7

Staging or production-like admin_memo dry-run plan:

- staging DB
- staging secret
- auth strategy
- safe sample data

### 32J-8

Firebase Hosting /api rewrite plan:

- target check
- backend URL
- rollback

Important:

- Do not create secrets before backend runtime and DB provider decisions are approved.
- Do not enable production write before secret, Auth, DB, runtime, and staging gates are satisfied.

## 32J-5 Admin Firebase Auth Verification Plan Follow-up

- Firebase Auth admin verification planning is documented in `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`.
- Firebase Admin runtime credential strategy is planned.
- No Firebase credential, service account JSON, Secret Manager secret, or runtime injection was created in 32J-5.

## 32J-6 Admin Bootstrap Plan Follow-up

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- Future bootstrap must not expose secrets and must use the approved secret/runtime path later.
- No secret creation, secret value recording, runtime injection, bootstrap script, DB write, Firebase Auth integration, rewrite, or deploy was added in 32J-6.

## 32J-7 Admin Staging Memo Dry-run Plan Follow-up

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- Staging secret must be separate from production secret and must not be written to docs/GitHub/chat/frontend.
- No Secret Manager secret, secret value, runtime injection, DB connection, rewrite, or deploy was added in 32J-7.
