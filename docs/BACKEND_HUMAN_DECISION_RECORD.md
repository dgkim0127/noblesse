# Backend Human Decision Record

## Purpose

This document records the choices a human/operator must confirm before Noblesse backend implementation begins.

It provides the final decision checklist before provider resources are created.

This step does not implement code, create cloud resources, connect Auth, connect to a database, run SQL, add package dependencies, change Firebase configuration, or handle database credentials.

## Current Recommended Stack

Proposed default:

- Frontend hosting: Firebase Hosting
- API hosting: Cloud Run behind Firebase Hosting `/api/**` rewrite
- Auth provider: Firebase Auth
- Business authorization: PostgreSQL `users` / `buyers`
- PostgreSQL provider primary: Cloud SQL
- PostgreSQL provider fallback: Neon
- API framework candidate: Express
- DB library candidate: `pg` direct
- Migration strategy: Raw SQL files first
- Admin bootstrap: Manual controlled insert during initial production migration
- Audit trail: PostgreSQL `audit_logs`

Status:

- Human/operator choices are recorded for planning in 25B.
- This is not implementation permission.
- No implementation in this step.
- No provider resource creation in this step.
- No DB credential handling in this step.

## Human Decisions Required

### 1. PostgreSQL Production Provider

Choose one:

- [x] Cloud SQL
- [ ] Neon
- [ ] Other: ______

Decision criteria:

- Cost
- Setup complexity
- Backup
- Region
- Connection from Cloud Run
- Operational comfort
- Future migration/rollback expectations

Decision note:

- Cloud SQL is selected as the primary production PostgreSQL candidate because the default API candidate is Cloud Run.
- Neon remains a fallback if Cloud SQL cost/setup becomes too heavy before implementation.

### 2. Firebase Auth Login Methods

Choose one:

- [x] Email/password only
- [ ] Google login only
- [ ] Email/password + Google login

Decision criteria:

- Buyer convenience
- Overseas buyer accessibility
- Admin account management
- Password reset support
- Support burden

Decision note:

- Email/password first keeps buyer onboarding simple.
- Google login can be added later if needed.

### 3. Admin Bootstrap Method

Choose one:

- [x] Manual SQL insert during production migration
- [ ] One-time backend bootstrap endpoint, then disabled
- [ ] Firebase UID allowlist during initial setup

Decision note:

- Manual controlled insert during initial production migration
- No public admin signup
- Admin role always verified from PostgreSQL

### 4. API Framework

Choose one:

- [x] Express
- [ ] Fastify
- [ ] Other: ______

Decision note:

- Express for MVP clarity

Reason:

- Easier onboarding
- Wide documentation
- Enough for first backend API
- Can still be deployed on Cloud Run

### 5. DB Library

Choose one:

- [x] `pg` direct
- [ ] Prisma
- [ ] Drizzle
- [ ] Other: ______

Decision note:

- `pg` direct for first backend scaffold

Reason:

- Current schema is raw SQL
- Local PostgreSQL dry-run already validated raw SQL
- Fewer moving parts before production architecture is stable

### 6. Migration Strategy

Choose one:

- [x] Raw SQL files first
- [ ] Migration tool before implementation

Decision note:

- Raw SQL files first
- Migration tool later after API shape stabilizes

Important:

- Production migration still requires separate review.
- No production migration in this step.

### 7. API Rewrite Strategy

Choose one:

- [x] Firebase Hosting `/api/**` rewrite to Cloud Run
- [ ] Separate API domain with CORS
- [ ] Other: ______

Decision note:

- Firebase Hosting `/api/**` rewrite to Cloud Run

Reason:

- Keeps frontend and API under one site boundary
- Avoids unnecessary CORS complexity for first version
- Keeps existing Noblesse Hosting strategy
- Firebase config change is not made in this step.

### 8. Secret Storage Method

Choose one later:

- [x] Google Secret Manager
- [ ] Cloud Run environment variables
- [ ] Other: ______

Decision note:

- Google Secret Manager preferred for production
- No secrets are added in this step.

Important:

- No secrets in frontend
- No secrets in GitHub
- No secrets in `.env.example`
- No secrets in docs
- No secrets in Codex prompt/output

### 9. Initial API Phase

- [x] Phase 1 only

Phase 1:

- `GET /api/health`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:productCode`
- `GET /api/buyer/me`

Do not start:

- Request Quote write
- Admin approval write
- Admin Quote write
- Price update write

### 10. Rollback Plan Owner

- [x] Operator / maintainer

Decision note:

- Rollback ownership must be confirmed again before production deployment.

## Implementation Approval Gate

Human choices are recorded for planning.

Selected items:

- [x] PostgreSQL provider selected: Cloud SQL
- [x] Auth login method selected: Email/password first
- [x] Admin bootstrap method selected: Manual SQL insert during production migration
- [x] API framework selected: Express
- [x] DB library selected: `pg` direct
- [x] Migration strategy selected: Raw SQL files first
- [x] API rewrite strategy selected: Firebase Hosting `/api/**` rewrite to Cloud Run
- [x] Secret storage approach selected: Google Secret Manager for production
- [x] Production migration approach selected: Separate reviewed production migration using raw SQL files first
- [x] Initial API phase selected: Phase 1 only
- [x] Rollback plan owner selected: Operator / maintainer

Implementation is still blocked until provider resources, secret storage, and local API scaffold plan are created.

This is not approval to create Cloud Run, Cloud SQL, Firebase Auth integration, or production migration.

Backend Phase 1 scaffold planning is documented in `docs/BACKEND_PHASE1_SCAFFOLD_PLAN.md`.

Human decisions are recorded, but implementation still waits for scaffold plan approval.

Until then:

- No backend code
- No package dependency
- No DB credentials
- No Firebase Auth integration
- No Cloud Run resource
- No Cloud SQL / Neon production DB
- No Firebase rewrite change
- No production migration
- No deploy

## Initial Implementation Phase Candidate

Recommended first implementation phase after approval:

Phase 1 only:

- `GET /api/health`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:productCode`
- `GET /api/buyer/me`

Do not start with:

- Request Quote write
- Admin approval write
- Admin Quote write
- Price update write

Reason:

- Phase 1 validates backend hosting/auth boundary with low write risk.
- Sensitive write APIs require `audit_logs` and transaction helpers.
- Buyer/admin status authorization must be proven before write APIs.

## Not Implemented In This Step

- No backend API code
- No Auth connection
- No DB connection
- No SQL execution
- No package dependency
- No provider resource creation
- No Firebase rewrite change
- No deploy
