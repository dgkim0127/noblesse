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
- No production DB connection
- No backend API yet

## Non-goals

- No Supabase client
- No direct DB connection from browser
- No service key in frontend
- No production migration yet
- No POS/APK changes
