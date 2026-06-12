# PostgreSQL-only Architecture

## Decision

- Noblesse will use PostgreSQL as the production business database.
- Supabase is not required.
- Supabase-specific Auth, RLS, and SQL Editor workflow is no longer the primary plan.
- PostgreSQL may be hosted later on Cloud SQL, Neon, Railway Postgres, Render Postgres, AWS RDS, a local server, or another managed PostgreSQL provider.

## Why PostgreSQL

- B2B buyer records
- Market-specific product prices
- Request Quote records
- Admin Quote records
- Agreement history
- Analytics views
- Relational data and SQL reporting

## Why Not Supabase For Now

- No current need for Supabase Auth.
- No current need for Supabase Storage.
- No current need for direct browser-to-DB access.
- No current need for Supabase SQL Editor workflow.
- Avoid mixing the Noblesse web architecture with old POS or Supabase assumptions.

## Required Backend API Layer

- React frontend must not connect directly to PostgreSQL.
- `DATABASE_URL` must only exist on the server.
- API server must validate:
  - buyer identity
  - admin role
  - agreement acceptance
  - market/currency
  - `product_prices`
  - MOQ
  - final totals
- `priceSnapshot` is reference only.
- Admin Quote totals must be recalculated server-side.

## Candidate Backend Options

- Cloud Run plus Firebase Hosting rewrite
- Render/Railway API service
- Vercel serverless API
- Node.js Express/Fastify server
- Other controlled backend

## Current Status

- Frontend mock preview
- Admin mock preview
- SQL scaffold exists
- PostgreSQL-only local clean retry dry-run passed for schema, analytics views, seed data, and `audit_logs`
- Backend provider/auth decision document created
- Backend implementation readiness document created
- Backend stack decision gate created
- Backend human decision record created
- Proposed v1 candidate is Firebase Hosting + Cloud Run API + PostgreSQL + Firebase Auth
- Human backend choices recorded: Cloud Run, Firebase Auth email/password first, Cloud SQL primary, Neon fallback, Express, `pg` direct, and raw SQL files first
- No production DB connection
- No backend API yet
- Production migration remains blocked until backend scaffold plan and provider resource plan are reviewed

## SQL Scaffold Location

- The folder name may still be `supabase`, but the SQL files are treated as PostgreSQL-compatible scaffold files.
- Supabase is optional/historical.
- PostgreSQL-only primary dry-run excludes `supabase/rls_policies.sql`.
- Backend API is mandatory before frontend writes.
- Direct React-to-PostgreSQL access is prohibited.
- Audit logs are required before real admin writes.
- Production DB migration must not run before provider confirmation.
- Production migration must wait for provider and stack gate approval.
- Production implementation remains blocked until the backend scaffold plan and provider resource plan are reviewed.

## Non-goals

- No Supabase client
- No direct DB connection from browser
- No service key in frontend
- No production migration yet
- No POS/APK changes
