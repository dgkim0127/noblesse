# Admin FX Job Deployment Plan

## Purpose

The FX workflow includes guarded scripts for future Cloud Run Job packaging. This plan documents the intended deployment without executing it.

## Scripts

- `backend/src/scripts/fetchFxRateSnapshots.js`
- `backend/src/scripts/generateFxPriceDrafts.js`

Package scripts:

- `npm run fx:fetch-rate-snapshots`
- `npm run fx:generate-price-drafts`

Guards:

- `ALLOW_FX_RATE_FETCH_JOB=true`
- `ALLOW_FX_REVIEW_JOB=true`

The scripts fail closed without their explicit allow flags.

## Schedule Draft

Rate snapshot:

- Cron: `10 9 * * 1-5`
- Timezone: `Asia/Seoul`
- Meaning: weekdays 09:10 KST

Review run:

- Cron: `0 10 * * 1,3,5`
- Timezone: `Asia/Seoul`
- Meaning: Monday, Wednesday, Friday 10:00 KST

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
