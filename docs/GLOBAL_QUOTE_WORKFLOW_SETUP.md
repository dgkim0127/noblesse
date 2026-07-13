# Global Quote Workflow Setup

## Scope

Noblesse is a B2B catalog and quotation service. It does not create a cart
checkout, payment, order confirmation, or inventory deduction when a buyer
accepts a quotation.

The frontend remains on Firebase Hosting. Supabase supplies authentication and
the quotation data model.

## 1. Create the data layer

Create a Supabase project, then apply:

```text
supabase/migrations/20260713_global_quote_workflow.sql
```

Use the Supabase CLI connected to the intended project, or apply the migration
through the project's approved migration workflow. The migration creates buyer
profiles, products, market prices, requests, official quotations, line items,
documents, and status history. It also enables row-level security and provides
the buyer request/response RPCs.

Do not replace the migration with direct SQL edits in production.

## 2. Configure the frontend

Set these public build variables in the Firebase Hosting build environment:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
```

Use `.env.example` only as a variable-name template. Never put a Supabase
service-role key, database URL, password, or other privileged credential in
Vite variables, source code, or committed files.

Without both variables, the app keeps its local demo fallback so the catalog UI
can be reviewed, but no production account or quotation is persisted.

## 3. Seed catalog and price data

Before enabling buyer access, import the approved catalog into `products` and
set `is_visible` only for public products. Each product needs its `image_set`
with WebP URLs at these intended widths:

| Use | Width |
| --- | ---: |
| `thumb` | 300px |
| `card` | 600px |
| `detail` | 1200px |
| `zoom` | 1800px |

Add market-specific rows to `product_prices` for every approved buyer market.
Prices remain invisible until a buyer profile has `approval_status = approved`.

## 4. Prepare accounts and admin roles

1. A new Supabase Auth user receives a pending `buyer_profiles` row through the
   migration trigger.
2. An approved operator updates only the intended buyer profile to
   `approval_status = approved`, and sets the buyer's market, currency, and
   language preference.
3. An approved operator sets `role = admin` only for explicitly authorized
   staff. Admins can issue quotations and review all quote requests.

The browser never assigns approvals or administrator roles. Use the approved
server-side operations workflow for those changes.

## 5. Deploy and verify

After the migration, seed, and environment configuration are complete:

1. Run `npm.cmd run lint`.
2. Run `npm.cmd run build`.
3. Deploy the static frontend to Firebase Hosting through the approved release
   workflow.
4. Verify as each role: guest, pending buyer, approved buyer, and admin.
5. Confirm an approved buyer can request a quote, an admin can issue it, the
   buyer can view/download the quotation PDF, and buyer acceptance only records
   follow-up status.

The current PDF is generated in the buyer's browser from the issued quotation.
The `quote_documents` table is reserved for a later server-generated,
access-controlled document-storage workflow.
