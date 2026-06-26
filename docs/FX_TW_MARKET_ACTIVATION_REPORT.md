# FX Taiwan Market Activation Report

## Scope

- Activate Taiwan market for new pricing and FX operations.
- Active markets: `KR`, `JP`, `US`, `TW`, `GLOBAL`.
- Active currencies: `KRW`, `JPY`, `USD`, `TWD`.
- Deprecated for new writes: `CN`, `CNY`.
- Historical `CN` / `CNY` rows remain read-only and are not deleted or copied.

## Code And Schema

- Runtime pricing config now uses `TW` / `TWD` instead of `CN` / `CNY`.
- ExchangeRate-API adapter requires `KRW`, `JPY`, `USD`, and `TWD`.
- FX complete-bundle lookup requires `KRW`, `JPY`, `USD`, and `TWD`.
- Admin catalog entry and FX pages expose `TW` / `TWD` as the active fourth market.
- Taiwan flag asset: `public/flags/tw.svg`.
- Migration files:
  - `supabase/migrations/20260626_tw_market_fx_activation.sql`
  - `backend/migrations/20260626_tw_market_fx_activation.sql`

## Migration Safety

- Migration is additive and runner-transaction-managed.
- Existing `CN` / `CNY` constraints are widened only to preserve historical rows.
- New `TW` / `TWD` FX policies are seeded from existing `KR` / `KRW` source rows without copying `CNY` numeric values.
- Legacy `CN` / `CNY` `manual_fixed` policies create `TW` / `TWD` `manual_fixed` policies with no published price and `needs_input` status, so operators can enter TWD manually.
- New `CN` / `CNY` writes are blocked by trigger guards.
- No historical inquiry, quote, audit, or snapshot mutation is performed.
- No secret value is recorded.

## Local Verification

- Backend tests: `322 passed`.
- Frontend tests: `104 passed`.
- Lint: passed.
- Build: passed with Vite chunk-size warning only.

## Cloud Activation

- Status: pending execution in this report revision.
- Provider credential secret payload access: No.
- Production DB direct connection: No.
- Manual SQL outside migration runner: No.
- Scheduler creation: pending.
