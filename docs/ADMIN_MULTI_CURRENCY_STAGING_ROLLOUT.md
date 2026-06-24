# Admin Multi-Currency Staging Rollout

## Current Code Readiness

- Four-currency price book mapping exists for KR/KRW, JP/JPY, US/USD, CN/CNY, and GLOBAL/USD.
- Buyer price reads require exact assigned market and currency.
- Admin price reads use admin routes.
- Automatic FX price policy API, UI, guarded script, and migration draft exist.
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
3. Deploy backend image that includes automatic FX code and packaged migration.
4. Verify `/api/admin/fx/status`.
5. Import a sanitized manual FX payload.
6. Run automatic evaluation once.
7. Verify `product_price_policies`, `fx_auto_price_runs`, and `fx_auto_price_events`.
8. Verify `manual_fixed` prices stay unchanged.
9. Verify `fx_auto` prices respect 5% deadband, 15% circuit breaker, and 72h stale protection.
10. Confirm quote and inquiry snapshots are unchanged.
11. Decide whether to enable scheduler.

## Rollback

The migration is additive and keeps existing data. If staging verification fails, stop writes, keep existing published product prices, and diagnose from audit logs, policy state, run records, and auto price events.
