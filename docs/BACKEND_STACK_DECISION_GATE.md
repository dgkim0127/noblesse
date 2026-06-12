# Backend Stack Decision Gate

## Purpose

This document defines the provider, auth, and database decision gate that must pass before Noblesse starts backend implementation.

It records the current default stack candidate and the operator checks required before creating cloud resources, connecting Auth, or writing backend route code.

This document does not create resources, implement code, connect to a database, run SQL, add dependencies, or change Firebase configuration.

Human/operator choices are recorded in `docs/BACKEND_HUMAN_DECISION_RECORD.md`.

Implementation must not start while any required human decision remains unchecked.

## Default Stack Candidate

- Frontend hosting: Firebase Hosting
- API hosting: Cloud Run behind Firebase Hosting `/api/**` rewrite
- Auth provider: Firebase Auth
- Business authorization: PostgreSQL `users` / `buyers` status loaded by backend API
- PostgreSQL provider primary candidate: Cloud SQL PostgreSQL
- PostgreSQL provider fallback candidate: Neon
- Audit trail: PostgreSQL `audit_logs`

## Decision Status

| Area | Candidate | Status | Gate Before Implementation |
| --- | --- | --- | --- |
| Frontend hosting | Firebase Hosting | Already used | Keep hosting target `noblesse` |
| API hosting | Cloud Run | Provisional default | Confirm Google Cloud billing, IAM, and region |
| Auth | Firebase Auth | Provisional default | Confirm login method and admin bootstrap |
| Business auth | PostgreSQL `users` / `buyers` | Required | Confirm backend lookup strategy |
| PostgreSQL primary | Cloud SQL | Provisional primary | Confirm cost, region, backup, and connection model |
| PostgreSQL fallback | Neon | Fallback | Confirm pooling, region, backup, and cost |
| Audit | `audit_logs` | Scaffolded | Backend must write audit logs transactionally |

## Implementation Gate Checklist

Before writing backend code, confirm the following items.

### Google Cloud / Cloud Run

- Google Cloud billing is enabled and acceptable
- Cloud Run region selected
- Cloud Run service naming convention selected
- Service account and IAM owner confirmed
- Logging and monitoring responsibility confirmed
- Firebase Hosting rewrite strategy approved

### PostgreSQL Provider

If Cloud SQL:

- Cloud SQL cost accepted
- PostgreSQL version selected
- Region selected
- Backup policy selected
- Connection method from Cloud Run selected
- Migration process planned

If Neon:

- Neon account/provider accepted
- Region selected
- Pooling strategy reviewed
- Backup/branch policy reviewed
- Cloud Run to Neon connection strategy reviewed

### Firebase Auth

- Login method selected:
  - Email/password
  - Google login
  - Both
- Admin bootstrap method selected
- Buyer registration flow selected
- Backend ID token verification required
- PostgreSQL status lookup required

### Security

- No DB credentials in frontend
- No admin authorization from client `viewerState`
- No direct React-to-PostgreSQL access
- All sensitive writes go through backend API
- `audit_logs` written in the same transaction
- Server recalculates totals

### Operations

- Error logging plan
- Backup ownership
- Environment variable ownership
- Deployment rollback plan
- Local dev API strategy

## Recommended Path

Recommended implementation path if the operator accepts Google Cloud setup:

1. Firebase Auth as identity provider
2. Cloud Run Node API
3. Cloud SQL PostgreSQL
4. Firebase Hosting `/api/**` rewrite
5. PostgreSQL business authorization
6. `audit_logs` for admin/sensitive writes

Fallback path if Cloud SQL setup or cost is too heavy:

1. Firebase Auth
2. Cloud Run or Render/Railway API
3. Neon PostgreSQL
4. Strict server-side environment handling only
5. PostgreSQL business authorization
6. `audit_logs`

Decision:

- This document does not create resources.
- This document does not implement code.
- Human/operator approval is required before backend implementation starts.
- Unresolved checkboxes in `docs/BACKEND_HUMAN_DECISION_RECORD.md` block backend implementation.

## Admin Bootstrap Decision Needed

Before real admin API:

- Decide how the first admin user is created.
- Possible options:
  1. Manual SQL insert in production migration
  2. One-time backend bootstrap endpoint disabled after use
  3. Firebase Auth UID allowlist during initial setup

Recommendation:

- Use a manual controlled insert during initial production migration.
- Do not create public admin signup.
- Always verify admin role from PostgreSQL.

This step does not implement admin bootstrap.

## Not Implemented In This Step

- No backend API code
- No Firebase Auth connection
- No Cloud Run service creation
- No Cloud SQL or Neon project creation
- No production PostgreSQL database creation
- No SQL execution
- No package dependency
- No Firebase configuration change
- No deploy action
