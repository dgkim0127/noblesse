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

## N49 Recovery And Production Activation

- Decision: `ACTIVE`.
- Schema recovery code fix: `c91403ea4bee030f9634038396cbdfc41779c109`.
- Safe root cause: production was missing the prerequisite FX snapshot workflow relation before the TW activation migration.
- Prerequisite migration Job: `noblesse-production-fx-schema-prereq-migration`.
- Prerequisite migration execution: `noblesse-production-fx-schema-prereq-migration-9cwkd`.
- Prerequisite migration result: succeeded and committed.
- Prerequisite migration cleanup: one-time Job deleted after success.
- TW migration retry Job: `noblesse-production-tw-market-migration`.
- TW migration retry execution: `noblesse-production-tw-market-migration-28rzp`.
- TW migration retry result: succeeded and committed.
- TW migration cleanup: one-time Job deleted after success.
- Direct SQL outside the approved migration runner: No.
- Secret payload access: No.

## N49 Production FX Job

- Production FX image build ID: `689a5000-2788-4004-8348-e365b07139d2`.
- Production FX image digest: `sha256:cd40d5bed3e61e1ff46d2f9105f7f171edc8029f09664b6d36c578ded1336280`.
- Production FX Job: `noblesse-fx-auto-prod`.
- Runtime service account: `noblesse-fx-job-prod@pors-piercing-pos.iam.gserviceaccount.com`.
- FX secret version: `noblesse-production-exchange-rate-api-key:2`.
- DB secret version: numeric production DB secret version `1`.
- Job generation after image-only recovery: `2`.
- Manual execution after recovery: `noblesse-fx-auto-prod-sqv98`.
- Manual execution result: succeeded, exit 0.
- Snapshot writes: 4 active currencies.
- Evaluation aggregate: evaluated 4, created 0, updated 0, held 3, blocked 0, error 0.
- Legacy `CN` / `CNY` changed: 0.
- Manual records changed: 0.
- Unexpected mutations: 0.

The first production FX Job execution before the code fix stopped safely with the category `CN/CNY writes are deprecated`. The follow-up code fix excludes legacy `CN` / `CNY` policies from automatic evaluation write paths while preserving historical read compatibility.

## N49 Scheduler

- Cloud Scheduler API: enabled after the successful manual production run.
- Scheduler name: `noblesse-fx-auto-prod-weekdays`.
- State: `ENABLED`.
- Cron: `10 10 * * 1-5`.
- Timezone: `Asia/Seoul`.
- Next scheduled run at creation time: `2026-06-29T01:10:00Z`.
- Scheduler service account: `noblesse-fx-scheduler-prod@pors-piercing-pos.iam.gserviceaccount.com`.
- Invoker scope: `roles/run.invoker` on `noblesse-fx-auto-prod` only.
- Retry max duration: `0s`.
- Project-wide `run.invoker` grant: No.
- Project-wide `secretAccessor` grant: No.

Final production state:

```text
TW_FX_PRODUCTION_ACTIVE_FREE_DAILY
```

## N52 First Scheduled FX Execution Check

- Decision: `PASS`.
- Check time: 2026-06-29 after the 10:10 KST Scheduler window.
- Scheduler: `noblesse-fx-auto-prod-weekdays`, state `ENABLED`.
- Scheduler invocation: found at `2026-06-29T01:10:00.803251Z`, HTTP status 200.
- Scheduled execution: `noblesse-fx-auto-prod-fwx4l`.
- Trigger source: `noblesse-fx-scheduler-prod@pors-piercing-pos.iam.gserviceaccount.com`.
- Execution result: completed successfully, task count 1, succeeded count 1, failed count 0, task attempt 0.
- Runtime service account: `noblesse-fx-job-prod@pors-piercing-pos.iam.gserviceaccount.com`.
- FX image digest: `sha256:cd40d5bed3e61e1ff46d2f9105f7f171edc8029f09664b6d36c578ded1336280`.
- FX secret version: `noblesse-production-exchange-rate-api-key:2`.
- Snapshot result: completed, inserted count 4, audit log returned.
- Evaluation result: completed, evaluated 4, created 0, updated 0, held 3, blocked 0, errors 0, audit log returned.
- Legacy CN/CNY changed: 0.
- Manual records changed: 0.
- Unexpected mutations: 0.
- Security check: no API key value, secret payload, DB credential, service account credential JSON, authorization header, or raw provider response was copied into repo/docs.
- Scheduler action: remained enabled; no pause was required.
- Observability follow-up: scheduled execution logs expose aggregate write counts but do not emit explicit `sourceEffectiveAt`, `fetchedAt`, skipped/noop/legacy-excluded counts, or a provider request count field.

## N53 FX Observability Hardening

- Decision: `PASS`.
- Source SHA: `40779df5e7338d72a8885beb4495dfb9200bc364`.
- Build ID: `ec67fad5-ec6f-442e-a25e-4fb8d6de4cd7`.
- Image digest: `sha256:8ade166e8b17d3351f870520fb1214d702d2ad42b602f06fa17357e2a8519da1`.
- Updated Jobs: `noblesse-fx-provider-check-prod`, `noblesse-fx-auto-prod`.
- Changed Cloud Run field: image digest only.
- Structured provider fields: `providerRequestCount`, `sourceEffectiveAt`, `fetchedAt`, `sourceAgeSeconds`, `requiredCurrencies`, validation statuses, runtime job metadata.
- Structured evaluation fields: `skipped`, `noop`, `legacyExcluded`, `aggregateSum`, `aggregateMatchesEvaluated`, and mutation guard counters.
- Aggregate equation: `evaluated = created + updated + held + blocked + skipped + noop + legacyExcluded + error`.
- No-write validation execution: `noblesse-fx-provider-check-prod-dfncj`.
- No-write validation result: passed, one provider request, required currencies `KRW`, `JPY`, `USD`, `TWD`, DB initialization false, no snapshot/product/price mutation.
- Production FX manual execution: No.
- Scheduler: `noblesse-fx-auto-prod-weekdays` remained enabled and unchanged.
- Secret payload access: No.
- Direct DB connection or manual SQL: No.
- Credential or raw provider payload recorded in docs: No.
- Follow-up: verify the new production aggregate fields after the next scheduled execution.
