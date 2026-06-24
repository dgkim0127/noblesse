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

Manual JSON import is implemented for controlled operation. Official provider integration is disabled until provider selection is approved.

Next provider gate:

```text
APPROVE_FX_PROVIDER_SELECTION = YES
```

## Deployment Status

- Job deploy: No
- Job execution: No
- Scheduler creation: No
- External provider fetch: No
- DB migration execution: No
- Secret/IAM mutation: No
