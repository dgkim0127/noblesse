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

- Cron: `10 9,13,17 * * 1-5`
- Timezone: `Asia/Seoul`
- Meaning: weekdays 09:10, 13:10, and 17:10 KST

## Runtime Policy

- Import or fetch a complete KRW / JPY / USD / CNY rate bundle.
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
- Expected scheduled volume: about 66 requests per month from the current weekday 09:10, 13:10, and 17:10 Asia/Seoul draft
- Contract shape: request KRW as the provider base, require KRW/JPY/USD/CNY, convert provider target-per-KRW rates into Noblesse canonical `KRW_PER_UNIT`
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

N47B confirmed secret version 2 is enabled, updated only the existing no-write Job secret binding to version 2, and executed the provider canary once. The execution succeeded with one provider request, KRW/JPY/USD/CNY validation, timestamp validation, and rate-direction validation. No DB write, snapshot write, price mutation, Scheduler creation, image rebuild, service account change, or IAM change was performed.

Report:

- `docs/FX_INFRA_NO_WRITE_CANARY_REPORT.md`

Next gate:

```text
APPROVE_FX_PRODUCTION_ACTIVATION = YES
```
