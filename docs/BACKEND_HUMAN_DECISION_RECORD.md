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

- Not final until human/operator approves.
- No implementation in this step.
- No provider resource creation in this step.
- No DB credential handling in this step.

## Human Decisions Required

### 1. PostgreSQL Production Provider

Choose one:

- [ ] Cloud SQL
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

Current recommendation:

- Cloud SQL if Google Cloud operations are acceptable
- Neon if simpler managed PostgreSQL operations are preferred

### 2. Firebase Auth Login Methods

Choose one:

- [ ] Email/password only
- [ ] Google login only
- [ ] Email/password + Google login

Decision criteria:

- Buyer convenience
- Overseas buyer accessibility
- Admin account management
- Password reset support
- Support burden

Current recommendation:

- Email/password first
- Google login can be added later if needed

### 3. Admin Bootstrap Method

Choose one:

- [ ] Manual SQL insert during production migration
- [ ] One-time backend bootstrap endpoint, then disabled
- [ ] Firebase UID allowlist during initial setup

Current recommendation:

- Manual controlled insert during initial production migration
- No public admin signup
- Admin role always verified from PostgreSQL

### 4. API Framework

Choose one:

- [ ] Express
- [ ] Fastify
- [ ] Other: ______

Current recommendation:

- Express for MVP clarity

Reason:

- Easier onboarding
- Wide documentation
- Enough for first backend API
- Can still be deployed on Cloud Run

### 5. DB Library

Choose one:

- [ ] `pg` direct
- [ ] Prisma
- [ ] Drizzle
- [ ] Other: ______

Current recommendation:

- `pg` direct for first backend scaffold

Reason:

- Current schema is raw SQL
- Local PostgreSQL dry-run already validated raw SQL
- Fewer moving parts before production architecture is stable

### 6. Migration Strategy

Choose one:

- [ ] Raw SQL files first
- [ ] Migration tool before implementation

Current recommendation:

- Raw SQL files first
- Migration tool later after API shape stabilizes

Important:

- Production migration still requires separate review.
- No production migration in this step.

### 7. API Rewrite Strategy

Choose one:

- [ ] Firebase Hosting `/api/**` rewrite to Cloud Run
- [ ] Separate API domain with CORS
- [ ] Other: ______

Current recommendation:

- Firebase Hosting `/api/**` rewrite to Cloud Run

Reason:

- Keeps frontend and API under one site boundary
- Avoids unnecessary CORS complexity for first version
- Keeps existing Noblesse Hosting strategy

### 8. Secret Storage Method

Choose one later:

- [ ] Google Secret Manager
- [ ] Cloud Run environment variables
- [ ] Other: ______

Current recommendation:

- Google Secret Manager preferred for production
- Cloud Run environment variables may be acceptable for early controlled staging only

Important:

- No secrets in frontend
- No secrets in GitHub
- No secrets in `.env.example`
- No secrets in docs
- No secrets in Codex prompt/output

## Implementation Approval Gate

Backend implementation may start only after all are selected:

- PostgreSQL provider selected
- Auth login method selected
- Admin bootstrap method selected
- API framework selected
- DB library selected
- Migration strategy selected
- API rewrite strategy selected
- Secret storage approach selected
- Production migration approach selected
- Initial API phase selected
- Rollback plan owner selected

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
