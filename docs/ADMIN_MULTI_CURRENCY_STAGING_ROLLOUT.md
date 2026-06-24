# Admin Multi-Currency Staging Rollout

## Current Code Readiness

- Four-currency price book mapping exists for KR/KRW, JP/JPY, US/USD, CN/CNY, and GLOBAL/USD.
- Buyer price reads require exact assigned market and currency.
- Admin price reads use admin routes.
- Managed FX review API, UI, scripts, and migration draft exist.
- Migration files are drafted but not executed.

## Staging Rollout Gate

Required approval:

```text
APPROVE_STAGING_MULTI_CURRENCY_FX_MIGRATION_AND_JOBS = YES
```

Before this gate, do not:

- run migration
- deploy backend
- execute Cloud Run Jobs
- create Cloud Scheduler jobs
- fetch a live FX provider
- mutate real product prices

## Staging Rollout Order

1. Confirm clean branch and migration artifact parity.
2. Apply migration once in staging.
3. Deploy backend image that includes FX code and packaged migration.
4. Verify `/api/admin/fx/status`.
5. Import a sanitized manual FX payload.
6. Run review job once.
7. Verify drafts.
8. Approve and reject synthetic draft data only.
9. Confirm quote and inquiry snapshots are unchanged.
10. Decide whether to enable scheduler.

## Rollback

The migration is additive and keeps existing data. If staging verification fails, stop writes, keep existing published product prices, and diagnose from audit logs and draft status.
