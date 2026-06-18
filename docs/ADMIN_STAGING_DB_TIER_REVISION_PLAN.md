# Admin Staging DB Tier Revision Plan

## Purpose

- Revise the staging Cloud SQL tier/version candidate after the approved `db-f1-micro` creation path was blocked.
- Prevent automatic tier substitution without user approval.
- Keep Cloud SQL instance creation blocked until the revised tier is approved.
- This step is docs-only.

## Current Status

- Cloud SQL Admin API: Enabled
- backend socket-mode support: Implemented
- staging secret container: exists with zero versions
- `db-f1-micro` create path: blocked
- staging DB creation: No-Go
- DB user/password: No-Go
- schema migration: No-Go
- Secret Manager version: No-Go
- Cloud Run DB update: No-Go

## Revised Candidates

| Option | Candidate | Use | Judgment |
| --- | --- | --- | --- |
| A | `db-g1-small` | first revised staging candidate | Recommended |
| B | `db-custom-1-3840` | fallback if shared-core blocked | Conditional |
| C | `db-custom-N4-2-4096` or supported equivalent | later hardening | Defer |

## Recommended Revised Spec

- instance name: `noblesse-staging-pg`
- database name: `noblesse_staging`
- region: `asia-northeast3`
- database version: `POSTGRES_16` unless blocked
- tier: `db-g1-small`
- availability: `ZONAL`
- storage: 10GB candidate
- deletion protection: disabled for staging candidate
- staging only
- synthetic data only
- no DB user/password in this step
- no schema migration in this step

## Fallback Rule

If `db-g1-small` is blocked:

- do not auto-switch
- stop
- report safe blocker
- ask for approval for `db-custom-1-3840`

If `POSTGRES_16` is blocked:

- do not auto-switch
- stop
- report safe blocker
- ask for approved version revision

Cloud SQL machine type availability can depend on edition, region, and database version. Do not infer or record actual pricing in this plan.

## Explicit No-Go

- no gcloud sql instances create in 32L-5R
- no DB creation
- no DB user/password
- no SQL/migration
- no Secret Manager version
- no IAM
- no Cloud Run update
- no Firebase rewrite/deploy
- no production write

## Next Approval Gate

- `APPROVE_STAGING_DB_CREATE_REVISED = YES`

Approved revised candidate:

- tier: `db-g1-small`
- database version: `POSTGRES_16`
- region: `asia-northeast3`
- instance: `noblesse-staging-pg`
- database: `noblesse_staging`

## 32L-6 Result

- Revised staging Cloud SQL resource creation is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- `noblesse-staging-pg` was created with the approved revised candidate.
- `noblesse_staging` was created as the staging database.
- DB user/password creation remains No-Go.
- schema migration remains No-Go.
- Secret Manager version addition remains No-Go.
- Cloud SQL Client IAM remains No-Go.
- Cloud Run DB update remains No-Go.
