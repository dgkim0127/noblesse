# Backend Provider and Auth Decision

## Purpose

This document compares backend API hosting, auth provider, and PostgreSQL production provider candidates before Noblesse implements real backend writes.

The goal is to decide where the trusted backend API should live between the Noblesse React frontend and the PostgreSQL business database.

The React frontend must not connect directly to PostgreSQL.

## Current Confirmed Facts

- Firebase Hosting is already used for the Noblesse frontend.
- PostgreSQL-only local dry-run passed with `audit_logs`.
- Backend API is required before real writes.
- Auth provider is not selected yet.
- PostgreSQL production provider is not selected yet.
- No production DB migration has been run.
- No frontend DB connection exists.

## API Hosting Options

### Option A. Cloud Run Behind Firebase Hosting Rewrite

Description:

- Firebase Hosting keeps serving the frontend.
- `/api/**` requests can be rewritten to a Cloud Run service.
- The API server keeps PostgreSQL credentials in server-side environment settings.

Pros:

- Fits the current Firebase Hosting setup.
- Container-based runtime can run Express, Fastify, or another Node API.
- Natural path if Cloud SQL PostgreSQL is selected.
- Keeps frontend and API boundaries clear.

Cons:

- Requires Cloud Run, IAM, deployment, and networking setup.
- Initial Google Cloud configuration is more complex than a single managed app host.

### Option B. Render/Railway API Service

Description:

- Managed Node API service.
- Can be paired with a managed PostgreSQL provider.

Pros:

- Relatively simple setup.
- Fast MVP API path.
- Provider dashboards are often easier for early operations.

Cons:

- Provider lock-in, cost, region, backup, and cold-start behavior must be reviewed.
- Firebase Hosting and API domain/CORS design must be handled separately.

### Option C. Vercel Serverless API

Description:

- Serverless API route model.

Pros:

- Convenient if frontend and API are managed together.
- Good for small stateless API surfaces.

Cons:

- Current frontend is already on Firebase Hosting.
- Transaction-heavy workloads need careful design.
- PostgreSQL connection pooling must be planned carefully.

### Option D. Self-managed Node.js Server

Description:

- API server on a VPS or directly managed server.

Pros:

- Maximum control.

Cons:

- Higher operations, security, backup, monitoring, and deployment burden.
- Too heavy for the current stage unless there is a strong operational reason.

## API Hosting Recommendation

Default candidate:

- Cloud Run behind Firebase Hosting rewrite

Reason:

- Keeps the current Firebase Hosting deployment.
- Allows a clear `/api/**` backend boundary.
- Keeps DB credentials out of the frontend.
- Gives a natural path to Cloud SQL if Google Cloud is chosen for PostgreSQL.

Confirm before final selection:

- Whether the operator can manage Google Cloud setup.
- Whether Cloud SQL, Neon, or another PostgreSQL provider will be used.
- Cost, region, backup, and monitoring expectations.

## Auth Provider Options

### Option A. Firebase Auth

Description:

- Natural candidate because Firebase is already used for Hosting.
- `users.auth_uid` can store the Firebase UID.

Pros:

- Fits Firebase Hosting.
- Supports buyer/admin identity.
- Frontend login flow is relatively straightforward.
- Backend can verify Firebase ID tokens before loading business authorization from PostgreSQL.

Cons:

- PostgreSQL role/status synchronization is still required.
- Admin role and custom claims require careful server-side design.
- Business authorization must remain in PostgreSQL `users` and `buyers`.

### Option B. Custom Session Auth

Description:

- Backend API owns login, session, cookie, and account flows.

Pros:

- Full control.

Cons:

- Higher security burden.
- Password reset, email verification, session hardening, and account recovery must be built and maintained.

### Option C. Third-party Auth Provider

Examples:

- Auth0
- Clerk
- Other managed auth providers

Pros:

- Advanced managed auth features.

Cons:

- Cost and vendor lock-in.
- Separate integration work with the existing Firebase Hosting deployment.

## Auth Recommendation

Default candidate:

- Firebase Auth as identity provider
- PostgreSQL `users.auth_uid` stores Firebase UID
- PostgreSQL `users.role`, `users.status`, and `buyers.status` remain the business authorization source
- Backend API verifies Firebase ID token, then loads PostgreSQL user/buyer/admin status

Important:

- Firebase Auth identity alone must not grant price access or admin access.
- Backend API must re-check PostgreSQL `users` and `buyers`.
- Admin access must be server-side verified.

## PostgreSQL Provider Options

### Option A. Local PostgreSQL

- Local/dev only.
- Not a production option.

### Option B. Cloud SQL PostgreSQL

Pros:

- Strong fit with Cloud Run.
- Google Cloud internal operations path.

Cons:

- Cost, networking, backup, and IAM setup must be planned.

### Option C. Neon

Pros:

- Managed PostgreSQL.
- Dev branch and serverless-friendly workflow.
- Connection pooling support is useful for serverless or bursty API patterns.

Cons:

- Cloud Run connectivity, pooling mode, and region choices need review.

### Option D. Railway / Render PostgreSQL

Pros:

- Quick MVP path when paired with their API services.

Cons:

- Cost, backup, region, scaling, and operations reliability must be reviewed.

## PostgreSQL Provider Recommendation

Default stance:

- Development: local PostgreSQL is already validated.
- Production candidate 1: Cloud SQL if Cloud Run is selected.
- Production candidate 2: Neon if simpler managed PostgreSQL is preferred.

Conclusion:

- PostgreSQL provider is not final yet.
- Final choice should be made together with backend API hosting.

## Proposed v1 Architecture

Recommended candidate:

```text
Firebase Hosting
-> React frontend
-> /api/** rewrite
-> Cloud Run backend API
-> PostgreSQL provider
-> audit_logs for admin/sensitive writes
```

Auth candidate:

```text
Firebase Auth
-> frontend obtains ID token
-> backend verifies token
-> backend loads users/buyers/admin status from PostgreSQL
-> backend authorizes operation
```

This step is documentation only. Do not implement provider/auth code yet.

## API Hosting Decision Matrix

| Option | Setup complexity | Security fit | Firebase Hosting integration | PostgreSQL fit | Cost predictability | MVP speed | Long-term operations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cloud Run | Medium | Strong | Strong | Strong with Cloud SQL, workable with other providers | Medium | Medium | Strong |
| Render/Railway | Low to medium | Good with careful env handling | Medium | Good | Medium | Strong | Medium |
| Vercel Serverless | Low to medium | Good with careful pooling | Medium because frontend is on Firebase | Good with pooling design | Medium | Medium | Medium |
| Self-managed server | High | Depends on operations maturity | Low to medium | Strong if operated well | Variable | Low | Heavy |

## Auth Decision Matrix

| Option | Setup complexity | Security fit | Firebase Hosting integration | PostgreSQL business auth fit | Cost predictability | MVP speed | Long-term operations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Firebase Auth | Low to medium | Strong when backend verifies tokens and PostgreSQL status | Strong | Strong with `users.auth_uid` mapping | Good | Strong | Good |
| Custom session | High | Depends on implementation quality | Medium | Strong if built well | Variable | Low | Heavy |
| Third-party auth | Medium | Strong if integrated correctly | Medium | Good with mapping layer | Vendor-dependent | Medium | Medium |

## Current Recommendation

Use this as the selected candidate for the first backend scaffold plan:

- API hosting: Cloud Run behind Firebase Hosting rewrite
- Auth: Firebase Auth identity plus PostgreSQL business authorization
- Login method: Email/password first
- PostgreSQL: Cloud SQL primary
- Fallback PostgreSQL provider: Neon
- API framework: Express
- DB library: `pg` direct
- Migration strategy: Raw SQL files first

See `docs/BACKEND_IMPLEMENTATION_READINESS.md` for the pre-implementation checklist, route priority, and Cloud SQL versus Neon readiness notes.

See `docs/BACKEND_STACK_DECISION_GATE.md` for the final implementation gate.

See `docs/BACKEND_HUMAN_DECISION_RECORD.md` for the human/operator decision checklist.

See `docs/BACKEND_PHASE1_SCAFFOLD_PLAN.md` for the plan-only Phase 1 scaffold structure before code is added.

This is still documentation only. Provider resources, backend code, database connections, and Firebase rewrites must wait for the backend scaffold plan.

## Not Implemented In This Step

- No backend API code
- No auth integration
- No DB connection
- No package dependency
- No production migration
- No Firebase Hosting config change

## Official Reference Notes

- Firebase Hosting can rewrite requests to Cloud Run for dynamic content and APIs.
- Firebase Admin SDK can verify Firebase ID tokens on a trusted backend.
- Cloud Run has an official path for connecting services to Cloud SQL for PostgreSQL.
- Neon supports pooled and direct PostgreSQL connections; pooling needs review if Neon is selected for serverless-style workloads.
