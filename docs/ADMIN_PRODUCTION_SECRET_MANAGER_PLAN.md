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

- inventory planning plus one approved staging metadata container
- staging secret container `noblesse-staging-database-url` exists with no value/version
- no production secret created
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

- staging name created as a value-less container: `noblesse-staging-database-url`
- production name remains planning only
- no secret value/version added

32L-2 update:

- The staging secret container remains intentionally value-less.
- Cloud SQL connection architecture was documented before DB creation.
- Do not add a secret version until the staging DB and DB user exist and the value handoff is separately approved.

No-Go:

- do not create additional Secret Manager secrets without explicit approval
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

- planning plus one approved staging metadata container
- provider container exists for staging DB URL only
- no secret value/version created
- no IAM modified

No-Go:

- do not add secret versions without explicit approval
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

## 32J-8 Admin Firebase API Rewrite Plan Follow-up

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Rewrite must not be added until backend runtime receives secrets through the approved server-side path.
- No secret creation, runtime injection, Firebase config change, rewrite, or deploy was added in 32J-8.

## 32J-9 Admin Production Rollout Checklist Follow-up

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- The secret management gate remains No-Go in the rollout checklist.
- No secret creation, IAM change, runtime injection, Firebase config change, rewrite, or deploy was added in 32J-9.

## 32L-8 Staging DB User / Secret Follow-up

- Staging DB user and secret handoff is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- The staging DB user exists, but no staging secret version was added.
- The password and DB URL were not recorded.
- Secret Manager version addition remains blocked pending recovery approval.
- Production secrets remain No-Go.

## 32L-8R Staging DB User Secret Recovery Follow-up

- Recovery is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_RECOVERY_REPORT.md`.
- First staging database URL secret version: Go.
- Secret value was not read back or recorded.
- Runtime Secret IAM remains No-Go.
- Production secrets remain No-Go.

## 32L-11 Runtime Secret IAM Follow-up

- Runtime secret IAM grant is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- Secret-level access was granted only for the staging DB URL secret and the dedicated Noblesse runtime identity.
- Secret value was not accessed/read.
- Secret version count remains 1.
- Production secrets, Cloud Run DB update, migration execution, Firebase rewrite, and production write remain No-Go.

## N38-B5 Staging Runtime Secret Separation Follow-up

- Runtime privilege hardening report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING_REPORT.md`.
- Migration DB secret access was moved away from the staging application identity and retained on the DB Job identity.
- The DB Job identity was not granted runtime DB secret access.
- Runtime DB secret creation did not proceed because the hardening Job failed.
- Secret payloads were not accessed/read or recorded.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS = YES`.

## N38-B5R Runtime Privilege Recovery Diagnosis Follow-up

- Recovery diagnosis report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS.md`.
- Diagnostic Job used the existing migration DB URL secret reference; secret payload was not accessed/read by the operator.
- Runtime DB secret creation: No.
- Production secret creation: No.
- Classification: B - database/schema ownership or runtime role setup failure.
- Runtime group role exists: No.
- Next gate: `APPROVE_STAGING_RUNTIME_PRIVILEGE_HARDENER_FIX_AND_RERUN = YES`.

## N38-B5F Runtime Privilege Hardener Recovery Follow-up

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_PRIVILEGE_HARDENER_RECOVERY_REPORT.md`.
- Hardening Job used the existing migration DB URL secret reference; secret payload was not accessed/read by the operator.
- Runtime DB privilege hardening: Go.
- Runtime DB secret creation: No.
- Production secret creation: No.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_AND_SECRET_CREATE = YES`.

## N38-B6 Staging Runtime DB Secret Follow-up

- Runtime DB user/secret handoff report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_REPORT.md`.
- Dedicated staging runtime DB secret container created: Yes.
- Runtime secret version added: No.
- Runtime DB login user created: No.
- Secret value, DB URL, and password recorded: No.
- Application identity secretAccessor grant: No.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

## N38-B6R3 Staging Runtime DB Password Wrapper Recovery Follow-up

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_PASSWORD_WRAPPER_RECOVERY_REPORT.md`.
- Password reset command executed exactly once.
- Cloud SQL server-side operation result: Success.
- Runtime secret version add result: Not completed; enabled version count remains 0.
- Application identity secretAccessor grant: No.
- Secret value, DB URL, and password recorded: No.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

## N38-B6R4 Staged Runtime Credential Handoff Follow-up

- Follow-up report: `docs/ADMIN_STAGING_RUNTIME_DB_STAGED_CREDENTIAL_HANDOFF_REPORT.md`.
- Secret version add invocation count: 1.
- Staged version add result: Failed by server-state verification; runtime secret version count remains 0.
- Password reset command count: 0.
- Application identity secretAccessor grant: No.
- Secret value, DB URL, and password recorded: No.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_SECRET_STAGING_RECOVERY = YES`.

## N38-B6S Runtime Secret Version Add Diagnosis Follow-up

- Follow-up report: `docs/ADMIN_STAGING_RUNTIME_SECRET_VERSION_ADD_DIAGNOSIS.md`.
- Diagnosis scope: Read-only.
- AddSecretVersion audit event found: No.
- Parser/path result: explicit-project add-version help shape failed before API reachability.
- Secret version add retry, password reset, IAM mutation, secret access, DB login/query, Job execution, app/Firebase deploy, and production mutation: No.
- Classification: A - LOCAL_WRAPPER_OR_PATH_FAILURE.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_SECRET_WRAPPER_FIX = YES`.

## N38-B6R2 Staging Runtime DB Secret Recovery Follow-up

- Completion report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_COMPLETION_REPORT.md`.
- Password reset attempted: Yes, exactly once.
- Password reset result: Failed.
- Runtime secret version added: No.
- Runtime secret enabled version count: 0.
- Secret value, DB URL, and password recorded: No.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_DIAGNOSIS = YES`.

## N38-B6D Staging Runtime DB Password Reset Diagnosis Follow-up

- Diagnosis report: `docs/ADMIN_STAGING_RUNTIME_DB_PASSWORD_RESET_DIAGNOSIS.md`.
- Diagnosis only; no password reset retry, secret version, IAM change, DB login/query, Job execution, app/Firebase deploy, or production mutation.
- Category: A - API_SUCCEEDED_LOCAL_WRAPPER_FAILED.
- Password likely changed by prior attempt: Yes.
- Runtime secret version remains 0.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_PASSWORD_RESET_WRAPPER_RECOVERY = YES`.

## N38-B6R Staging Runtime DB Secret Recovery Follow-up

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_REPORT.md`.
- Runtime DB login user created: Yes.
- Runtime secret version added: No.
- Runtime secret enabled version count: 0.
- Secret value, DB URL, and password recorded: No.
- Application identity secretAccessor grant: No.
- Production secret creation remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.
