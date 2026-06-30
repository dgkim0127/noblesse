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

## N52 First Scheduled Execution

- First scheduled run after activation was observed on 2026-06-29 at the 10:10 KST Scheduler window.
- Scheduler invocation returned HTTP 200 and created execution `noblesse-fx-auto-prod-fwx4l`.
- Execution completed successfully with one task, zero failed tasks, and task attempt 0.
- Snapshot import completed with 4 active currency rows inserted.
- Auto evaluation completed with evaluated 4, created 0, updated 0, held 3, blocked 0, errors 0.
- No legacy CN/CNY, manual, ownership mismatch, or unexpected mutation signal was observed in the available aggregate logs.
- No sensitive credential value or raw provider payload was recorded in docs.
- Scheduler remained enabled; no pause or rollback was performed.
- Follow-up: add richer scheduled-run observability for explicit provider request count, `sourceEffectiveAt`, `fetchedAt`, and skipped/noop/legacy-excluded counters.

## N53 Observability Hardening Deployment

- Source SHA: `40779df5e7338d72a8885beb4495dfb9200bc364`.
- Build ID: `ec67fad5-ec6f-442e-a25e-4fb8d6de4cd7`.
- Image digest: `sha256:8ade166e8b17d3351f870520fb1214d702d2ad42b602f06fa17357e2a8519da1`.
- No-write Job image update: `noblesse-fx-provider-check-prod`, image digest only.
- Production FX Job image update: `noblesse-fx-auto-prod`, image digest only.
- Preserved settings: service accounts, command/args, secret versions, DB secret binding, Cloud SQL attachment, task count, retries, timeout, and Scheduler.
- Scheduler state: `ENABLED`, `10 10 * * 1-5`, `Asia/Seoul`, retry max duration `0s`.
- No-write execution after update: `noblesse-fx-provider-check-prod-dfncj`.
- No-write validation: provider request count `1`, source and fetch timestamps emitted, required currencies `KRW`, `JPY`, `USD`, `TWD`, timestamp/completeness/rate-direction validations passed, DB initialized false.
- Production FX manual execution: No.
- Next production validation: inspect the next scheduled `noblesse-fx-auto-prod` execution for `fx_provider_result` and `fx_evaluation_summary`.
- Security: no API key value, secret payload, DB URL, authorization header value, raw provider response, full rate bundle, or product/price dump is recorded.

## N60 Scheduled Production Verification

- Latest scheduled production run verified after N53 observability hardening: Yes.
- Execution: `noblesse-fx-auto-prod-gzrkh`.
- Trigger source: Cloud Scheduler service account.
- Result: succeeded with one task and zero failed tasks.
- Image digest matched N53 observability image: Yes.
- Provider request count: 1.
- Required currencies: `KRW`, `JPY`, `USD`, `TWD`.
- Evaluation aggregate matched terminal counters: Yes.
- Manual, legacy CN/CNY, ownership mismatch, and unexpected mutation counters: 0.
- Scheduler paused: No.
- FX Job, Scheduler, Secret Manager, IAM, DB schema, product catalog data, product prices, and catalog permissions changed in N60: No.

## N69 Manual Product Detail Price Finalization

- Date: 2026-06-30 KST
- Reason: finalize product detail route verification after the N68 product seed and confirm FX auto path remains operational.
- Manual execution count in N69: 1
- Job: `noblesse-fx-auto-prod`
- Execution: `noblesse-fx-auto-prod-w9znl`
- Result: succeeded with one task and zero failed tasks observed.
- Command/env overrides: No
- Scheduler invocation or configuration change: No
- Secret Manager change: No
- IAM change: No
- Direct DB connection or manual SQL: No
- Public product API behavior after run: approved-only JP/US/TW prices remain hidden from guest detail responses.
- Legacy CN/CNY activation signal: absent.
- Follow-up: scheduled-run observability remains the source for provider request and aggregate counter evidence when logs emit `fx_provider_result` and `fx_evaluation_summary`.
