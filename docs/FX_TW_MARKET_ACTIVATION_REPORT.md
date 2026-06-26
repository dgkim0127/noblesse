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

- Status: stopped before production FX activation.
- Code commit: `f442a0392fc0487165d714d3a38d91d286ba6005`.
- Final no-write image digest: `sha256:b9685b25793613e40241ce5376dda31238ef911ccaa80d855ad3648af97edf63`.
- Final no-write build ID: `22d4ceae-c750-4f4f-9078-433f49262675`.
- Final TWD no-write canary execution: `noblesse-fx-provider-check-prod-g2wpv`.
- TWD no-write canary result: passed.
- Provider request count: 1.
- Required currencies: `KRW`, `JPY`, `USD`, `TWD`.
- DB client initialized: No.
- Snapshot write: No.
- Product or price mutation: No.
- Production migration Job: `noblesse-production-tw-market-migration`.
- Production migration execution: `noblesse-production-tw-market-migration-vbl5k`.
- Production migration result: failed.
- Production migration Job cleanup: deleted after failed execution to prevent accidental rerun.
- Safe failure category: production schema prerequisite missing.
- First safe error signal: required FX snapshot relation missing.
- Production FX Job creation: No.
- Production FX manual run: No.
- Scheduler creation: No.
- Provider credential secret payload access: No.
- Production DB direct connection: No.
- Manual SQL outside migration runner: No.
- Cloud Run backend deploy: No.

## Stop Decision

Decision: `STOPPED_TW_MIGRATION_VALIDATION_FAILED`.

The production migration runner started the N48 migration but exited non-zero before commit because the production database does not currently expose the FX snapshot relation required by the N48 trigger guard and later FX snapshot write path. The activation did not continue to production FX Job creation, manual FX execution, or Scheduler creation.

Next gate:

```text
APPROVE_PRODUCTION_FX_SCHEMA_PREREQUISITE_RECOVERY = YES
```
