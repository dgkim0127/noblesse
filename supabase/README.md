# Supabase / PostgreSQL Scaffold

This folder contains PostgreSQL-compatible SQL scaffold files for Noblesse Piercing.

It is not connected to the React frontend yet. Do not run these files against production without review.

Supabase is no longer required for the primary architecture. The current direction is PostgreSQL-only with a future backend API layer. Review `docs/POSTGRES_ONLY_ARCHITECTURE.md` and `docs/POSTGRES_DEV_DRY_RUN_RUNBOOK.md` before running these files in any dev database.

## Direction

- PostgreSQL is the required production business database for Noblesse.
- Supabase is optional and historical for this plan.
- Firebase may remain for Hosting and optionally Storage.
- The frontend must not use privileged server keys.
- Browser-side price calculation is display-only.
- Production Request Quote must use backend API validation.
- Firebase Hosting remains separate and should use hosting target `noblesse` only.
- Supabase-specific RLS and `auth.uid()` assumptions are not final for the PostgreSQL-only architecture.
- Production PostgreSQL migration requires a backend API and revised security model.
- The folder name may still be `supabase`, but these files are now treated as PostgreSQL-compatible scaffold files.

## Recommended Execution Order

Before SQL execution, complete the static review documented in `supabase/STATIC_REVIEW_REPORT.md`.

For the primary PostgreSQL-only dry-run, follow `docs/POSTGRES_DEV_DRY_RUN_RUNBOOK.md`.

For historical Supabase compatibility review, `docs/DEV_SUPABASE_SQL_EDITOR_RUNBOOK.md` and `supabase/SQL_EDITOR_COPY_ORDER.md` remain available but are no longer the primary path.

1. `schema.sql`
2. `analytics_views.sql`
3. `seed_mock_data.sql` only for local/dev

`rls_policies.sql` is Supabase-specific because it depends on `auth.uid()`. In a plain PostgreSQL dry-run, exclude it from the primary sequence and replace access control with backend API authorization planning.

Production execution requires separate review and an approved migration strategy. The seed file must not be used in production.

The 21C dry-run was not executed because a non-production Supabase connection was not available without entering or recording secrets. The next runner should use a dev PostgreSQL database, keep secrets out of this repo, and record only execution results in `supabase/VALIDATION_NOTES.md`.

`schema.sql` includes draft `terms_versions` and `buyer_agreements` tables for future Buyer Access Request consent persistence.

`seed_mock_data.sql` includes development-only agreement version samples:

- `terms_of_service` / `terms-v1.0`
- `buyer_terms` / `buyer-terms-v1.0`
- `privacy_collection_use` / `privacy-v1.0`
- `marketing_updates` / `marketing-v1.0`
- `privacy_policy` / `privacy-policy-v1.0`

## Agreement Tables

`terms_versions` is the agreement version management table. It stores active and historical text for service terms, B2B Buyer terms, privacy consent, optional marketing consent, and the privacy policy reference document.

`buyer_agreements` is the Buyer agreement history table. It should store the exact agreement key and version accepted by a Buyer when Buyer Access Request is submitted.

The seed file is for local development only. Do not run development seed data against production.

Before production registration is enabled, required consent and active agreement versions must be validated through a trusted registration API. Browser direct writes to `buyer_agreements` are intentionally not part of the first-version frontend.

## Local Review

Use pgAdmin4, psql, a provider SQL console, or another PostgreSQL client to inspect tables and views.

Do not run the seed file against production. The seed file is only for development verification.

For validation, use local PostgreSQL or a separate dev PostgreSQL provider database that can be reset safely. Run the SQL files in the PostgreSQL-only order, then confirm analytics view output.

Do not treat Supabase policy creation as the PostgreSQL-only security model. Plain PostgreSQL production access control must be handled by backend API authorization plus a reviewed database role strategy.

## Security Boundary

- Do not expose database credentials to the frontend.
- Do not add privileged server values to `.env.example`.
- Do not connect browser code directly for admin writes.
- Admin write operations must go through trusted backend API.
- Request Quote and Admin Quote totals must be recalculated server-side.
- See `docs/POSTGRES_DEV_DRY_RUN_RUNBOOK.md` for the current dry-run path.
- Do not start production migration until the checklist and `supabase/VALIDATION_NOTES.md` show a passing local/dev dry-run.

## Validation Expectations

Before production writes are allowed:

- Buyer status must be validated server-side.
- Market-specific `product_prices` must be reloaded server-side.
- MOQ and minimum amount rules must be validated server-side.
- `price_snapshot` and item subtotal values must be recalculated server-side.
- `inquiries` and `inquiry_items` must be inserted in one trusted transaction.
