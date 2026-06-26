# Admin FX Job Deployment Plan

## Purpose

The FX workflow includes guarded scripts for future Cloud Run Job packaging. This plan documents intended deployment without executing it.

## Scripts

- `backend/src/scripts/fetchFxRateSnapshots.js`
- `backend/src/scripts/evaluateFxAutoPrices.js`

Package scripts:

- `npm run fx:fetch-rate-snapshots`
- `npm run fx:evaluate-auto-prices`

Guards:

- `ALLOW_FX_RATE_FETCH_JOB=true`
- `ALLOW_FX_AUTO_PRICE_JOB=true`

The scripts fail closed without their explicit allow flags.

## Schedule Draft

Rate snapshot and automatic evaluation:

- Cron: `10 10 * * 1-5`
- Timezone: `Asia/Seoul`
- Meaning: weekdays 10:10 KST

## Runtime Policy

- Import or fetch a complete KRW / JPY / USD / TWD rate bundle.
- Store the rate snapshots idempotently.
- Evaluate `fx_auto` policies after snapshot import.
- Keep `manual_fixed` prices unchanged.
- Apply the 5% deadband, 15% circuit breaker, and 72h stale-rate protection.
- Record sanitized run and event history.

## Provider State

Manual JSON import is implemented for controlled operation. ExchangeRate-API adapter code is implemented with mock transport tests only. Production provider activation remains disabled until credential provisioning and deployment are separately approved.

Provider selection decision:

- ADR: `docs/adr/ADR-0040-fx-provider-selection.md`
- Selected provider: `ExchangeRate-API`
- Provider identifier: `exchange_rate_api`
- Secret variable name: `EXCHANGE_RATE_API_KEY`
- Required plan: Pro plan basis, 60 minute updates and 30,000 requests per month as checked on 2026-06-25
- Expected scheduled volume: about 22 requests per month from the current weekday 10:10 Asia/Seoul draft
- Contract shape: request KRW as the provider base, require KRW/JPY/USD/TWD, convert provider target-per-KRW rates into Noblesse canonical `KRW_PER_UNIT`
- Auth preference: server-side Bearer authorization through Secret Manager after a separate approval gate

Next credential gate:

```text
APPROVE_FX_PROVIDER_CREDENTIAL_PROVISIONING = YES
```

## Deployment Status

- Job deploy: No
- Job execution: No
- Scheduler creation: No
- External provider fetch: No
- Provider credential creation: Secret container created, secret version pending operator input
- Production activation: No
- DB migration execution: No
- Secret/IAM mutation: Dedicated FX secret container and secret-level accessor prepared

## N45/N46 Infrastructure Status

N45 added a no-write provider canary script and built an immutable backend image for it. The dedicated production FX runtime service account and Secret Manager container exist.

N46 confirmed secret version 1 is enabled, created the no-write Cloud Run Job, and executed it once. The execution failed with sanitized provider authentication status. No DB write, price mutation, Scheduler creation, or retry was performed.

N47 checked for corrected secret version 2 before updating the existing Job. Version 2 was not found, so the Job was not updated and no new execution was started.

N47B confirmed secret version 2 is enabled, updated only the existing no-write Job secret binding to version 2, and executed the provider canary once. The execution succeeded with one provider request, KRW/JPY/USD/TWD validation, timestamp validation, and rate-direction validation. No DB write, snapshot write, price mutation, Scheduler creation, image rebuild, service account change, or IAM change was performed.

Report:

- `docs/FX_INFRA_NO_WRITE_CANARY_REPORT.md`

Next gate:

```text
APPROVE_FX_PRODUCTION_ACTIVATION = YES
```

## N48 Taiwan Market Activation Plan

The activation gate changes the active fourth market from `CN` / `CNY` to `TW` / `TWD`.

- Required provider bundle: `KRW`, `JPY`, `USD`, `TWD`.
- Production FX schedule: `10 10 * * 1-5` in `Asia/Seoul`.
- Expected request volume: about 22 scheduled provider requests per month.
- `CN` / `CNY` rows remain historical read-only.
- New `CN` / `CNY` writes are blocked by the N48 migration.
- Production no-write TWD canary must pass before production DB writes.
- Production Scheduler creation remains blocked until migration and one manual production FX execution pass.

Activation evidence is tracked in `docs/FX_TW_MARKET_ACTIVATION_REPORT.md`.

## N48 Taiwan Market Activation Result

- Code commit: `f442a0392fc0487165d714d3a38d91d286ba6005`.
- TWD no-write canary: passed.
- No-write canary execution: `noblesse-fx-provider-check-prod-g2wpv`.
- Production migration execution: `noblesse-production-tw-market-migration-vbl5k`.
- Production migration result: failed before commit.
- Production migration Job cleanup: deleted after failed execution to prevent accidental rerun.
- Safe failure category: production schema prerequisite missing.
- Production FX Job deploy: No.
- Production FX Job execution: No.
- Scheduler creation: No.
- Secret payload access: No.
- Direct DB connection or manual SQL: No.

Current decision:

```text
STOPPED_TW_MIGRATION_VALIDATION_FAILED
```

Next gate:

```text
APPROVE_PRODUCTION_FX_SCHEMA_PREREQUISITE_RECOVERY = YES
```

## N49 Production Deployment Result

- Recovery commit: `c91403ea4bee030f9634038396cbdfc41779c109`.
- Safe code fix: legacy `CN` / `CNY` policies are excluded from automatic evaluation write paths.
- Production prerequisite migration execution: `noblesse-production-fx-schema-prereq-migration-9cwkd`.
- Production TW migration retry execution: `noblesse-production-tw-market-migration-28rzp`.
- Production FX Job: `noblesse-fx-auto-prod`.
- Production FX image build ID: `689a5000-2788-4004-8348-e365b07139d2`.
- Production FX image digest: `sha256:cd40d5bed3e61e1ff46d2f9105f7f171edc8029f09664b6d36c578ded1336280`.
- Runtime service account: `noblesse-fx-job-prod@pors-piercing-pos.iam.gserviceaccount.com`.
- FX secret version: numeric version `2`.
- DB secret version: numeric version `1`.
- Successful manual execution: `noblesse-fx-auto-prod-sqv98`.
- Manual execution count after image recovery: 1.
- Successful run aggregate: snapshot writes 4; evaluated 4; created 0; updated 0; held 3; blocked 0; errors 0.
- Scheduler: `noblesse-fx-auto-prod-weekdays`.
- Scheduler cron: `10 10 * * 1-5`.
- Scheduler timezone: `Asia/Seoul`.
- Scheduler service account: `noblesse-fx-scheduler-prod@pors-piercing-pos.iam.gserviceaccount.com`.
- Invoker scope: Job-level `roles/run.invoker` only.
- Direct DB connection or manual SQL: No.
- Secret payload access: No.

Current state:

```text
TW_FX_PRODUCTION_ACTIVE_FREE_DAILY
```
