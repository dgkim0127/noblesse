# Admin Staging Cloud SQL Connection Decision

## Purpose

- Decide Cloud SQL staging topology before resource creation.
- Prevent premature DB creation before API, connection, IAM, pool, reset, and migration decisions.
- Keep actual cloud mutations blocked.

## Current State

- health-only Cloud Run runtime: Go
- staging Secret Manager container: exists, zero versions
- Cloud SQL instance: not created; 32L-5 create attempt blocked by approved tier/machine type availability
- Cloud SQL Admin API: Enabled
- runtime Cloud SQL IAM: not granted
- DB pool socket support: implemented in backend config only
- production write: No-Go

## Read-only Preflight

- gcloud CLI available: Yes
- active account present: Yes
- active project configured: Yes
- raw project/account values recorded: No
- Cloud Run service exists in `asia-northeast3`: Yes
- dedicated runtime identity assigned: Yes
- Cloud SQL Admin API before 32L-3: Missing
- Cloud SQL Admin API after 32L-3: Enabled
- Cloud SQL instances present: Yes
- Noblesse staging-named instance present: No
- actual Cloud SQL instance name, IP, or connection name recorded: No

Only Cloud SQL Admin API enablement was executed in 32L-3. No DB creation, IAM change, deploy, or DB connection was executed.

32L-4 implementation update:

- Backend config now supports `DB_CONNECTION_MODE=tcp` and `DB_CONNECTION_MODE=cloudsql-socket`.
- `CLOUD_SQL_INSTANCE_CONNECTION_NAME` is parsed as server-only config for socket mode.
- Pool max, connection timeout, and idle timeout settings are parsed.
- Socket-mode pool config is covered by backend tests only.
- No actual Cloud SQL instance, DB connection, IAM, Secret Manager version, Cloud Run update, or Firebase rewrite was added.

32L-5 resource attempt:

- Staging Cloud SQL resource attempt is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- Instance creation was attempted with the approved staging spec and blocked by approved tier/machine type availability.
- The target staging instance does not exist after the attempt.
- The staging database was not created.
- No DB user/password, IAM, schema migration, Secret Manager version, Cloud Run update, Firebase rewrite, or production write was performed.
- Do not retry with a different tier or version until a revised staging spec is explicitly approved.

32L-5R revision plan:

- Revised tier plan is documented in `docs/ADMIN_STAGING_DB_TIER_REVISION_PLAN.md`.
- First revised candidate is `db-g1-small`.
- Fallback candidate is `db-custom-1-3840` if shared-core is blocked.
- N4 custom candidate is deferred for later hardening.
- No automatic tier/version substitution is allowed.
- No Cloud SQL instance, database, user, IAM, Secret Manager version, Cloud Run update, Firebase rewrite, or production write was performed in 32L-5R.

## Connection Options Reviewed

### Option A - Cloud Run Native Cloud SQL Connection + Unix Socket

Structure:

- Cloud SQL instance
- Cloud Run service with Cloud SQL connection attached
- Unix socket path used by backend runtime
- runtime service account granted Cloud SQL client access only after approval
- DB password or URI stored through Secret Manager only after DB creation

Pros:

- avoids static outbound IP and authorized network management
- keeps Cloud Run and Cloud SQL connectivity inside Google Cloud controls
- fits the existing health-only Cloud Run staging path
- gives a clearer boundary than direct public TCP

Cons:

- current backend pool is not socket-aware
- current production SSL handling is designed around connection-string TCP mode
- requires a future Cloud Run revision update

### Option B - Cloud SQL Private IP + Direct VPC Egress

Pros:

- stronger private network boundary
- minimizes public DB endpoint exposure

Cons:

- adds VPC, connector/egress, and shared-project resource review complexity
- may be too heavy for the first staging MVP path
- needs stricter review so POS/default resources are not affected

### Option C - Direct Public TCP Database URL

Pros:

- closest to the current connection-string based pool

Cons:

- requires careful authorized network, static egress, and TLS handling
- current production SSL policy would need hardening before real use
- lower recommended priority for Noblesse staging

## Recommended Architecture

- Cloud SQL PostgreSQL
- `asia-northeast3`
- Cloud Run native Cloud SQL connection
- Unix socket path
- dedicated runtime identity
- Cloud SQL client IAM only after approval
- Secret Manager DB value only after DB creation
- staging only
- synthetic data only
- no production data

Recommendation:

- Use Option A as the default staging connection architecture.
- Keep Option B as a later production hardening candidate.
- Avoid Option C unless a separate security review approves direct public TCP.

## Backend Compatibility Gap

Current backend shape:

- `backend/src/config/env.js` reads server-only `DATABASE_URL`.
- `backend/src/config/env.js` reads server-only `DB_CONNECTION_MODE` and `CLOUD_SQL_INSTANCE_CONNECTION_NAME`.
- `backend/src/db/pool.js` can build TCP or Cloud SQL Unix socket pool config.
- Production mode currently applies SSL options to the connection-string pool.
- Health-only startup can run without DB/Auth secrets.
- `backend/package.json` already uses `pg`; no dependency change is required for this decision.

Implemented in 32L-4:

- explicit DB connection mode setting: `tcp` or `cloudsql-socket`
- socket host/path config support without recording exact instance connection name in docs
- TLS separated so socket mode does not set SSL
- TCP mode keeps the existing production SSL behavior
- pool max, idle timeout, and connection timeout settings
- strict no-logging rule for secret values

Still required before staging DB rollout:

- actual staging Cloud SQL instance/database/user approval and creation
- Cloud SQL client IAM approval
- schema migration approval
- Secret Manager version approval
- Cloud Run DB secret/socket update approval

This step does not implement those changes.

## Proposed Staging DB Spec

- provider: Cloud SQL PostgreSQL
- environment: staging only
- region: `asia-northeast3`
- instance name candidate: `noblesse-staging-pg`
- database name candidate: `noblesse_staging`
- approved tier candidate `db-f1-micro` was blocked in 32L-5
- revised first candidate: `db-g1-small`
- fallback candidate: `db-custom-1-3840`
- production DB: fully separate
- data: synthetic only
- high availability: disabled for initial staging candidate
- deletion protection: pending explicit decision
- backup/reset strategy: required before schema/write
- storage and machine tier: smallest approved staging tier after availability/cost review
- PostgreSQL major version: supported stable version, exact version pending read-only confirmation
- direct public TCP access: not recommended
- broad authorized networks: not allowed
- production data: not allowed

No tier, version, storage, price, project id, instance connection name, IP address, DB user, password, or connection string is recorded.

## Why DB Creation Is Not Yet Approved

- Backend pool socket-mode support is implemented in config/tests only and has not been connected to real Cloud SQL.
- approved staging tier requires revision before a new create attempt.
- runtime Cloud SQL IAM is not granted.
- reset/backup/schema plan is not executed.
- staging secret container intentionally has zero versions.
- production/Firebase rollout remains blocked.

## Approval Gates

1. `APPROVE_CLOUD_SQL_ADMIN_API_ENABLEMENT = YES` - completed in 32L-3
2. `APPROVE_DB_POOL_SOCKET_SUPPORT = YES` - completed in 32L-4
3. backend pool socket-mode implementation/test
4. `APPROVE_STAGING_DB_TIER_REVISION = YES` - completed in 32L-5R
5. `APPROVE_STAGING_DB_CREATE_REVISED = YES`
6. staging Cloud SQL instance/database/user creation
7. `APPROVE_CLOUD_SQL_CLIENT_IAM = YES`
8. runtime service account Cloud SQL client IAM grant
9. `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`
10. staging schema application
11. `APPROVE_SECRET_MANAGER_VERSION_ADD = YES`
12. staging DB connection value added to the existing staging secret
13. `APPROVE_RUNTIME_SECRET_IAM = YES`
14. secret-specific accessor IAM grant
15. `APPROVE_CLOUD_RUN_DB_SECRET_UPDATE = YES`
16. Cloud Run socket connection and Secret Manager reference update
17. staging DB read smoke
18. Firebase Auth stage

Secret value addition is forbidden until the staging DB and DB user are ready.

## Go / No-Go

- Connection architecture decision: Go
- Cloud SQL Admin API enablement: Go
- backend socket implementation: Go
- staging DB creation: Go for approved staging instance/database only, documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`
- DB user/password creation: No-Go
- IAM change: No-Go
- migration: No-Go
- secret version addition: No-Go
- Cloud Run DB update: No-Go
- Firebase Auth/rewrite/production write: No-Go
