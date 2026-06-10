# PostgreSQL Schema Plan

This document defines a draft PostgreSQL/Supabase schema for the Noblesse Piercing B2B catalog and Request Quote workflow.

It is a planning document only. Version 1 remains mock-first and does not add runtime database connection code.

## Design Goals

- Keep public product metadata separate from protected Buyer pricing.
- Store Inquiry item snapshots so historical records do not change when product data changes.
- Store final admin-confirmed quote data separately from the Buyer request.
- Support market, category, product, and Buyer analytics with SQL.
- Make pgAdmin4 inspection straightforward during local development.

## Production Direction

- PostgreSQL is mandatory for production business data.
- Supabase can be used as managed PostgreSQL.
- pgAdmin4 can be used to inspect and manage PostgreSQL data.
- Firebase may remain for Hosting and optionally Storage.
- Client-side writes must be limited by RLS or routed through Edge Functions/API.
- Request Quote creation should be server-validated.
- Browser-side price values are display-only and must not be trusted.

## Tables

## `users`

### Purpose

Stores authenticated account identity and system role.

### Important Columns

- `id uuid primary key`
- `auth_uid text unique`
- `email text unique not null`
- `role text not null` (`buyer`, `admin`)
- `status text not null` (`pending`, `approved`, `blocked`)
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- One `users` row can have one `buyers` profile.
- Admin users can be referenced by quote confirmation fields.

### Indexes

- `unique(auth_uid)`
- `unique(email)`
- `index(role, status)`

### Analytics Use

Used to segment approved Buyers and admin activity.

## `buyers`

### Purpose

Stores Buyer company profile, approval status, assigned market, and pricing conditions.

### Important Columns

- `id uuid primary key`
- `user_id uuid references users(id)`
- `company_name text not null`
- `contact_name text`
- `country text`
- `preferred_language text`
- `phone text`
- `messenger_type text`
- `messenger_id text`
- `sales_channel text`
- `business_number text`
- `assigned_market text not null`
- `currency text not null`
- `discount_rate numeric(5,2) default 0`
- `min_order_amount numeric(14,2) default 0`
- `approved_at timestamptz`
- `approved_by uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- Belongs to `users`.
- Referenced by `inquiries`.

### Indexes

- `index(user_id)`
- `index(assigned_market)`
- `index(country)`
- `index(company_name)`

### Analytics Use

Used for Buyer activity, market reporting, country reporting, and Buyer-level Inquiry totals.

## `categories`

### Purpose

Stores product category metadata.

### Important Columns

- `id uuid primary key`
- `category_id text unique not null`
- `name_ko text`
- `name_en text`
- `name_ja text`
- `slug text unique not null`
- `cover_url text`
- `is_visible boolean default true`
- `sort_order integer default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- Referenced by `products`.
- Referenced in `inquiry_items` snapshots through `category_id`.

### Indexes

- `unique(category_id)`
- `unique(slug)`
- `index(is_visible, sort_order)`

### Analytics Use

Supports category-level Inquiry amount and product performance reporting.

## `products`

### Purpose

Stores public product metadata. Pricing is stored separately.

### Important Columns

- `id uuid primary key`
- `code text unique not null`
- `name_ko text`
- `name_en text not null`
- `name_ja text`
- `category_id uuid references categories(id)`
- `material text`
- `colors jsonb`
- `sizes jsonb`
- `moq_default integer`
- `lead_time text`
- `origin text`
- `image_set jsonb`
- `image_alt jsonb`
- `is_visible boolean default true`
- `is_export_available boolean default true`
- `is_new boolean default false`
- `is_best boolean default false`
- `sort_order integer default 0`
- `description_ko text`
- `description_en text`
- `description_ja text`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- Belongs to `categories`.
- Has many `product_prices`.
- Has many `product_collections`.
- Referenced by `inquiry_items` and `admin_quote_items`.

### Indexes

- `unique(code)`
- `index(category_id)`
- `index(is_visible, sort_order)`
- `index(is_new)`
- `index(is_best)`
- `gin(colors)`
- `gin(sizes)`

### Analytics Use

Supports product performance, category reporting, and popular option analysis.

## `product_prices`

### Purpose

Stores market-specific protected pricing and MOQ rules.

### Important Columns

- `id uuid primary key`
- `product_id uuid references products(id)`
- `market text not null`
- `currency text not null`
- `wholesale_price numeric(14,2) not null`
- `retail_price numeric(14,2)`
- `moq integer not null`
- `min_order_amount numeric(14,2) default 0`
- `visible_to text default 'approved_only'`
- `is_active boolean default true`
- `updated_at timestamptz`

### Relationships

- Belongs to `products`.
- Used when creating `inquiry_items.price_snapshot`.

### Indexes

- `unique(product_id, market)`
- `index(market, is_active)`
- `index(currency)`

### Analytics Use

Used to compare requested prices, market-specific product availability, and pricing coverage by market.

## `collections`

### Purpose

Stores editorial product groupings.

### Important Columns

- `id uuid primary key`
- `collection_id text unique not null`
- `title_ko text`
- `title_en text not null`
- `title_ja text`
- `slug text unique not null`
- `cover_url text`
- `is_visible boolean default true`
- `sort_order integer default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- Many-to-many with `products` through `product_collections`.

### Indexes

- `unique(collection_id)`
- `unique(slug)`
- `index(is_visible, sort_order)`

### Analytics Use

Supports curated collection performance analysis.

## `product_collections`

### Purpose

Joins products and collections.

### Important Columns

- `product_id uuid references products(id)`
- `collection_id uuid references collections(id)`
- `sort_order integer default 0`
- `created_at timestamptz`

### Relationships

- Belongs to `products`.
- Belongs to `collections`.

### Indexes

- `primary key(product_id, collection_id)`
- `index(collection_id, sort_order)`

### Analytics Use

Supports collection-level Inquiry and product trend analysis.

## `inquiries`

### Purpose

Stores Buyer Request Quote submissions.

### Important Columns

- `id uuid primary key`
- `inquiry_number text unique not null`
- `buyer_id uuid references buyers(id)`
- `market text not null`
- `currency text not null`
- `status text not null` (`requested`, `checking`, `quoted`, `confirmed`, `cancelled`)
- `total_items integer default 0`
- `total_quantity integer default 0`
- `estimated_total numeric(14,2) default 0`
- `request_memo text`
- `admin_memo text`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- Belongs to `buyers`.
- Has many `inquiry_items`.
- Can have one or more `admin_quotes`.

### Indexes

- `unique(inquiry_number)`
- `index(buyer_id, created_at)`
- `index(status, created_at)`
- `index(market, created_at)`
- `index(currency, created_at)`

### Analytics Use

Supports Buyer Inquiry totals, monthly Inquiry trends, status conversion, and market reporting.

## `inquiry_items`

### Purpose

Stores requested item snapshots at Inquiry time.

### Important Columns

- `id uuid primary key`
- `inquiry_id uuid references inquiries(id)`
- `product_id uuid references products(id)`
- `product_code text not null`
- `product_name text not null`
- `category_id uuid references categories(id)`
- `material text`
- `color text`
- `size text`
- `quantity integer not null`
- `moq integer not null`
- `price_snapshot numeric(14,2) not null`
- `subtotal numeric(14,2) not null`
- `created_at timestamptz`

### Relationships

- Belongs to `inquiries`.
- References `products` when possible.
- References `categories` when possible.

### Indexes

- `index(inquiry_id)`
- `index(product_id)`
- `index(category_id)`
- `index(product_code)`
- `index(color, size)`

### Analytics Use

Supports top requested products, category totals, option popularity, and product-level trend reporting.

## `admin_quotes`

### Purpose

Stores admin-confirmed quote results separately from the Buyer request.

### Important Columns

- `id uuid primary key`
- `inquiry_id uuid references inquiries(id)`
- `status text not null` (`draft`, `sent`, `accepted`, `cancelled`)
- `confirmed_total numeric(14,2) default 0`
- `currency text not null`
- `lead_time text`
- `shipping_note text`
- `admin_memo text`
- `quoted_by uuid references users(id)`
- `quoted_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- Belongs to `inquiries`.
- Has many `admin_quote_items`.
- References admin `users`.

### Indexes

- `index(inquiry_id)`
- `index(status, quoted_at)`
- `index(quoted_by)`

### Analytics Use

Supports requested-to-confirmed conversion and admin quote workflow reporting.

## `admin_quote_items`

### Purpose

Stores admin-confirmed item quantities and final unit prices.

### Important Columns

- `id uuid primary key`
- `admin_quote_id uuid references admin_quotes(id)`
- `product_id uuid references products(id)`
- `product_code text not null`
- `requested_quantity integer`
- `confirmed_quantity integer`
- `requested_price_snapshot numeric(14,2)`
- `confirmed_unit_price numeric(14,2)`
- `confirmed_subtotal numeric(14,2)`
- `created_at timestamptz`

### Relationships

- Belongs to `admin_quotes`.
- References `products` when possible.

### Indexes

- `index(admin_quote_id)`
- `index(product_id)`
- `index(product_code)`

### Analytics Use

Supports requested versus confirmed quantity, price change review, and quote conversion analysis.

## `banners`

### Purpose

Stores public banner metadata.

### Important Columns

- `id uuid primary key`
- `banner_id text unique not null`
- `title_ko text`
- `title_en text`
- `title_ja text`
- `subtitle_ko text`
- `subtitle_en text`
- `subtitle_ja text`
- `desktop_image_url text`
- `mobile_image_url text`
- `link_type text`
- `link_value text`
- `is_visible boolean default true`
- `sort_order integer default 0`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### Relationships

- May link to products, categories, or collections by `link_type` and `link_value`.

### Indexes

- `unique(banner_id)`
- `index(is_visible, sort_order)`
- `index(starts_at, ends_at)`

### Analytics Use

Can later support banner exposure and Inquiry attribution if event tracking is added.

## `catalog_files`

### Purpose

Stores downloadable catalog PDF metadata.

### Important Columns

- `id uuid primary key`
- `file_id text unique not null`
- `title_ko text`
- `title_en text`
- `title_ja text`
- `file_url text not null`
- `market text not null`
- `price_included boolean default false`
- `visible_to text not null` (`public`, `approved_only`)
- `uploaded_at timestamptz`
- `version text`

### Relationships

- May be market-specific through `market`.

### Indexes

- `unique(file_id)`
- `index(market, visible_to)`
- `index(uploaded_at)`

### Analytics Use

Can later support catalog download reporting by market.

## `terms_versions`

### Purpose

Stores versioned agreement documents for Buyer Access Request consent.

These records are planning data for future production. Version 1 only shows placeholder agreement text in `RegisterPage`.

### Important Columns

- `id uuid primary key`
- `agreement_key text not null` (`terms_of_service`, `privacy_collection_use`, `marketing_updates`)
- `version text not null`
- `title_ko text`
- `title_en text`
- `content_ko text`
- `content_en text`
- `required boolean default true`
- `is_active boolean default true`
- `effective_at timestamptz`
- `created_at timestamptz`

### Relationships

- Referenced by `buyer_agreements`.

### Indexes

- `unique(agreement_key, version)`
- `index(agreement_key, is_active)`

### Production Notes

- Legal and privacy text must be reviewed before launch.
- Only active agreement versions should be shown to Buyers.
- Admin changes should create a new version instead of mutating historical consent meaning.

## `buyer_agreements`

### Purpose

Stores which Buyer accepted which agreement version and when.

### Important Columns

- `id uuid primary key`
- `buyer_id uuid references buyers(id)`
- `terms_version_id uuid references terms_versions(id)`
- `agreement_key text not null`
- `version text not null`
- `required boolean default true`
- `accepted boolean not null`
- `accepted_at timestamptz`
- `ip_address text`
- `user_agent text`
- `created_at timestamptz`

### Relationships

- Belongs to `buyers`.
- References `terms_versions`.

### Indexes

- `index(buyer_id)`
- `index(agreement_key, version)`
- `index(accepted_at)`

### Production Notes

- Version 1 does not persist agreements.
- Future registration should store agreement snapshots through a trusted API/RPC.
- Browser-provided consent values must be validated server-side.
- IP address and user agent collection should be handled by the server/API layer, not directly trusted from the browser.
- Pending Buyer application storage before a `buyers` row exists should be finalized during API design.

## Analytics SQL Examples

### Top Requested Products In Last 30 Days

```sql
select
  ii.product_code,
  ii.product_name,
  sum(ii.quantity) as requested_quantity,
  sum(ii.subtotal) as requested_amount
from inquiry_items ii
join inquiries i on i.id = ii.inquiry_id
where i.created_at >= now() - interval '30 days'
group by ii.product_code, ii.product_name
order by requested_quantity desc
limit 20;
```

### Top Requested Products By Market

```sql
select
  i.market,
  ii.product_code,
  ii.product_name,
  sum(ii.quantity) as requested_quantity,
  sum(ii.subtotal) as requested_amount
from inquiry_items ii
join inquiries i on i.id = ii.inquiry_id
group by i.market, ii.product_code, ii.product_name
order by i.market, requested_quantity desc;
```

### Inquiry Amount By Buyer

```sql
select
  b.id as buyer_id,
  b.company_name,
  i.currency,
  count(i.id) as inquiry_count,
  sum(i.estimated_total) as inquiry_amount
from inquiries i
join buyers b on b.id = i.buyer_id
group by b.id, b.company_name, i.currency
order by inquiry_amount desc;
```

### Inquiry Amount By Category

```sql
select
  c.category_id,
  c.name_en,
  i.currency,
  sum(ii.subtotal) as inquiry_amount,
  sum(ii.quantity) as requested_quantity
from inquiry_items ii
join inquiries i on i.id = ii.inquiry_id
left join categories c on c.id = ii.category_id
group by c.category_id, c.name_en, i.currency
order by inquiry_amount desc;
```

### Conversion From Requested To Confirmed

```sql
select
  date_trunc('month', i.created_at)::date as month,
  count(distinct i.id) as requested_count,
  count(distinct aq.inquiry_id) filter (where aq.status in ('sent', 'accepted')) as quoted_count,
  count(distinct aq.inquiry_id) filter (where aq.status = 'accepted') as accepted_count
from inquiries i
left join admin_quotes aq on aq.inquiry_id = i.id
group by month
order by month;
```

### Popular Color/Size Combinations

```sql
select
  ii.product_code,
  ii.product_name,
  ii.color,
  ii.size,
  sum(ii.quantity) as requested_quantity
from inquiry_items ii
group by ii.product_code, ii.product_name, ii.color, ii.size
order by requested_quantity desc
limit 30;
```

### Monthly Inquiry Trend

```sql
select
  date_trunc('month', created_at)::date as month,
  market,
  currency,
  count(*) as inquiry_count,
  sum(total_quantity) as total_quantity,
  sum(estimated_total) as estimated_total
from inquiries
group by month, market, currency
order by month, market;
```
