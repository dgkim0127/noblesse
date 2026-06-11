# Supabase / PostgreSQL Scaffold

This folder is a PostgreSQL/Supabase planning and migration scaffold for Noblesse Piercing.

It is not connected to the React frontend yet. Do not run these files against production without review.

These SQL files are scaffold files for local/dev validation first. Review `docs/SUPABASE_MIGRATION_CHECKLIST.md` before applying them to any shared environment.

## Direction

- PostgreSQL/Supabase is the required production business database for Noblesse.
- Firebase may remain for Hosting and optionally Storage.
- The frontend must not use privileged server keys.
- Browser-side price calculation is display-only.
- Production Request Quote must use Edge Function, API, or trusted RPC validation.
- Firebase Hosting remains separate and should use hosting target `noblesse` only.

## Recommended Execution Order

Before SQL execution, complete the static review documented in `supabase/STATIC_REVIEW_REPORT.md`.

For a manual dev Supabase SQL Editor run, follow `docs/DEV_SUPABASE_SQL_EDITOR_RUNBOOK.md`. The short copy order is also available in `supabase/SQL_EDITOR_COPY_ORDER.md`.

1. `schema.sql`
2. `rls_policies.sql`
3. `analytics_views.sql`
4. `seed_mock_data.sql` only for local/dev

Production execution requires separate review and an approved migration strategy. The seed file must not be used in production.

The 21C dry-run was not executed because a non-production Supabase connection was not available without entering or recording secrets. The next runner should use a separate dev project or local Supabase, keep secrets out of this repo, and record only execution results in `supabase/VALIDATION_NOTES.md`.

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

Before production registration is enabled, required consent and active agreement versions must be validated through a trusted registration API/RPC. Browser direct writes to `buyer_agreements` are intentionally not part of the first-version frontend.

## Local Review

Use pgAdmin4, Supabase SQL editor, or another PostgreSQL client to inspect tables and views.

Do not run the seed file against production. The seed file is only for development verification.

For validation, use local Supabase or a separate dev Supabase project that can be reset safely. Run the SQL files in the recommended order, then confirm RLS behavior and analytics view output.

Do not treat SQL Editor execution with privileged bypass credentials as proof that RLS behavior works. Policy creation can be checked in SQL Editor, but buyer/admin behavior requires a separate Auth-context smoke test.

## Security Boundary

- Do not expose service role credentials to the frontend.
- Do not add service role values to `.env.example`.
- Do not connect browser code directly for admin writes.
- Future public client usage may use an anon key, but admin write operations must go through trusted API/RPC.
- Request Quote and Admin Quote totals must be recalculated server-side.
- See `docs/SUPABASE_MIGRATION_CHECKLIST.md` for Go / No-Go criteria.
- Do not start production migration until the checklist and `supabase/VALIDATION_NOTES.md` show a passing local/dev dry-run.

## Validation Expectations

Before production writes are allowed:

- Buyer status must be validated server-side.
- Market-specific `product_prices` must be reloaded server-side.
- MOQ and minimum amount rules must be validated server-side.
- `price_snapshot` and item subtotal values must be recalculated server-side.
- `inquiries` and `inquiry_items` must be inserted in one trusted transaction.
