# Supabase / PostgreSQL Scaffold

This folder is a PostgreSQL/Supabase planning and migration scaffold for Noblesse Piercing.

It is not connected to the React frontend yet. Do not run these files against production without review.

## Direction

- PostgreSQL/Supabase is the required production business database for Noblesse.
- Firebase may remain for Hosting and optionally Storage.
- The frontend must not use privileged server keys.
- Browser-side price calculation is display-only.
- Production Request Quote must use Edge Function, API, or trusted RPC validation.
- Firebase Hosting remains separate and should use hosting target `noblesse` only.

## Recommended Execution Order

1. `schema.sql`
2. `rls_policies.sql`
3. `analytics_views.sql`
4. `seed_mock_data.sql` only for local/dev

`schema.sql` includes draft `terms_versions` and `buyer_agreements` tables for future Buyer Access Request consent persistence.

`seed_mock_data.sql` includes development-only agreement version samples:

- `terms_of_service` / `terms-v1.0`
- `privacy_collection_use` / `privacy-v1.0`
- `marketing_updates` / `marketing-v1.0`

## Local Review

Use pgAdmin4, Supabase SQL editor, or another PostgreSQL client to inspect tables and views.

Do not run the seed file against production. The seed file is only for development verification.

Before production registration is enabled, agreement snapshots should be written through a trusted API/RPC. Browser direct writes to `buyer_agreements` are intentionally not part of the first-version frontend.

## Validation Expectations

Before production writes are allowed:

- Buyer status must be validated server-side.
- Market-specific `product_prices` must be reloaded server-side.
- MOQ and minimum amount rules must be validated server-side.
- `price_snapshot` and item subtotal values must be recalculated server-side.
- `inquiries` and `inquiry_items` must be inserted in one trusted transaction.
