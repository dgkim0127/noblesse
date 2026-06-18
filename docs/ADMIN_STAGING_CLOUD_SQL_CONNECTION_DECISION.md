# Admin Staging Cloud SQL Connection Decision

## Purpose

- Decide Cloud SQL staging topology before resource creation.
- Prevent premature DB creation before API, connection, IAM, pool, reset, and migration decisions.
- Keep actual cloud mutations blocked.

## Current State

- health-only Cloud Run runtime: Go
- staging Secret Manager container: exists, zero versions
- Cloud SQL instance: not created
- Cloud SQL Admin API: Missing
- runtime Cloud SQL IAM: not granted
- DB pool socket support: not implemented
- production write: No-Go

## Read-only Preflight

- gcloud CLI available: Yes
- active account present: Yes
- active project configured: Yes
- raw project/account values recorded: No
- Cloud Run service exists in `asia-northeast3`: Yes
- dedicated runtime identity assigned: Yes
- Cloud SQL instances present: Unknown because Cloud SQL Admin API is missing
- Noblesse staging-named instance present: Unknown because Cloud SQL Admin API is missing
- actual Cloud SQL instance name, IP, or connection name recorded: No

No API enablement, DB creation, IAM change, deploy, or DB connection was executed.

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
- `backend/src/db/pool.js` creates `pg` Pool with `connectionString`.
- Production mode currently applies SSL options to the connection-string pool.
- Health-only startup can run without DB/Auth secrets.
- `backend/package.json` already uses `pg`; no dependency change is required for this decision.

Required before Option A implementation:

- explicit DB connection mode setting, such as `tcp` or `cloudsql-socket`
- socket host/path handling without recording exact instance connection name in docs
- TLS disabled or separated for socket mode
- verifiable TLS policy for TCP mode
- safe DB unavailable errors
- pool max, idle timeout, and connection timeout settings
- strict no-logging rule for secret values

This step does not implement those changes.

## Proposed Staging DB Spec

- provider: Cloud SQL PostgreSQL
- environment: staging only
- region: `asia-northeast3`
- instance name candidate: `noblesse-staging-pg`
- database name candidate: `noblesse_staging`
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

- Cloud SQL Admin API is missing.
- connection mode is not implemented.
- current pool assumes `DATABASE_URL` and production TLS behavior.
- runtime Cloud SQL IAM is not granted.
- reset/backup/schema plan is not executed.
- staging secret container intentionally has zero versions.
- production/Firebase rollout remains blocked.

## Approval Gates

1. `APPROVE_CLOUD_SQL_ADMIN_API_ENABLEMENT = YES`
2. `APPROVE_DB_POOL_SOCKET_SUPPORT = YES`
3. backend pool socket-mode implementation/test
4. `APPROVE_STAGING_DB_CREATE = YES`
5. staging Cloud SQL instance/database/user creation
6. `APPROVE_CLOUD_SQL_CLIENT_IAM = YES`
7. runtime service account Cloud SQL client IAM grant
8. `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`
9. staging schema application
10. `APPROVE_SECRET_MANAGER_VERSION_ADD = YES`
11. staging DB connection value added to the existing staging secret
12. `APPROVE_RUNTIME_SECRET_IAM = YES`
13. secret-specific accessor IAM grant
14. `APPROVE_CLOUD_RUN_DB_SECRET_UPDATE = YES`
15. Cloud Run socket connection and Secret Manager reference update
16. staging DB read smoke
17. Firebase Auth stage

Secret value addition is forbidden until the staging DB and DB user are ready.

## Go / No-Go

- Connection architecture decision: Go
- Cloud SQL Admin API enablement: No-Go
- backend socket implementation: No-Go
- staging DB creation: No-Go
- IAM change: No-Go
- migration: No-Go
- secret version addition: No-Go
- Cloud Run DB update: No-Go
- Firebase Auth/rewrite/production write: No-Go
