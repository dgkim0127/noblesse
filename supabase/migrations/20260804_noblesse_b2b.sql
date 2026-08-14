-- Noblesse B2B canonical data. This migration is intentionally independent of
-- the generic retail-admin draft and is accessed only by Firebase Functions.

begin;

create or replace function public.noblesse_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.noblesse_buyers (
  firebase_uid text primary key check (char_length(firebase_uid) between 1 and 128),
  email text not null,
  company_name text not null check (char_length(company_name) between 1 and 160),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  country text not null check (char_length(country) between 2 and 80),
  preferred_language text not null default 'en' check (preferred_language in ('kr', 'en', 'jp', 'cn')),
  phone text not null default '',
  messenger_type text not null default '',
  messenger_id text not null default '',
  sales_channel text not null default '',
  business_number text not null default '',
  request_memo text not null default '',
  status text not null default 'email_verification_pending' check (status in ('email_verification_pending', 'pending', 'approved', 'blocked')),
  assigned_market text,
  currency char(3),
  discount_rate integer not null default 0 check (discount_rate between 0 and 100),
  min_order_amount_minor bigint not null default 0 check (min_order_amount_minor >= 0),
  approved_by text,
  approved_at timestamptz,
  agreements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists noblesse_buyers_email_lower_uq on public.noblesse_buyers (lower(email));
create index if not exists noblesse_buyers_status_idx on public.noblesse_buyers (status, created_at desc);

create table if not exists public.noblesse_categories (
  category_id text primary key check (category_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name_ko text not null default '',
  name_en text not null,
  name_ja text not null default '',
  name_zh text not null default '',
  cover_url text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.noblesse_collections (
  collection_id text primary key check (collection_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title_ko text not null default '',
  title_en text not null,
  title_ja text not null default '',
  title_zh text not null default '',
  cover_url text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.noblesse_products (
  product_id text primary key check (product_id ~ '^[A-Z0-9][A-Z0-9-]{1,79}$'),
  code text not null unique,
  category_id text not null references public.noblesse_categories(category_id) on update cascade,
  collection_ids text[] not null default '{}',
  name_ko text not null default '',
  name_en text not null,
  name_ja text not null default '',
  name_zh text not null default '',
  description_ko text not null default '',
  description_en text not null default '',
  description_ja text not null default '',
  description_zh text not null default '',
  material text not null default '',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  lead_time text not null default '',
  origin text not null default 'KR',
  image_set jsonb not null default '{}'::jsonb,
  image_paths jsonb not null default '{}'::jsonb,
  image_alt jsonb not null default '{}'::jsonb,
  tone text not null default '',
  badge text not null default '',
  is_new boolean not null default false,
  is_best boolean not null default false,
  is_export_available boolean not null default true,
  is_visible boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists noblesse_products_visible_idx on public.noblesse_products (is_visible, sort_order, product_id);
create index if not exists noblesse_products_category_idx on public.noblesse_products (category_id, is_visible, sort_order);

create table if not exists public.noblesse_product_prices (
  product_id text not null references public.noblesse_products(product_id) on delete cascade,
  market text not null check (market in ('KR', 'JP', 'US', 'CN', 'GLOBAL')),
  currency char(3) not null,
  wholesale_price_minor bigint not null check (wholesale_price_minor >= 0),
  retail_price_minor bigint check (retail_price_minor is null or retail_price_minor >= 0),
  moq integer not null check (moq > 0 and moq <= 100000),
  min_order_amount_minor bigint not null default 0 check (min_order_amount_minor >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (product_id, market)
);

create index if not exists noblesse_product_prices_market_idx on public.noblesse_product_prices (market, is_active, product_id);

create table if not exists public.noblesse_banners (
  banner_id text primary key check (banner_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title_ko text not null default '',
  title_en text not null default '',
  title_ja text not null default '',
  title_zh text not null default '',
  image_url text not null,
  link_path text not null default '/',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.noblesse_catalog_files (
  file_id text primary key check (file_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title text not null,
  storage_path text not null unique check (storage_path like 'noblesse/catalogs/%'),
  allowed_markets text[] not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.noblesse_inquiries (
  inquiry_id text primary key check (inquiry_id ~ '^INQ-[0-9]{8}-[A-Z0-9]{6}$'),
  buyer_uid text not null references public.noblesse_buyers(firebase_uid) on delete restrict,
  buyer_company_name text not null,
  buyer_country text not null,
  buyer_language text not null,
  currency char(3) not null,
  status text not null default 'requested' check (status in ('requested', 'checking', 'quoted', 'confirmed', 'cancelled')),
  estimated_total_minor bigint not null check (estimated_total_minor >= 0),
  final_total_minor bigint check (final_total_minor is null or final_total_minor >= 0),
  total_items integer not null check (total_items > 0),
  total_quantity integer not null check (total_quantity > 0),
  request_memo text not null default '',
  admin_memo text not null default '',
  quoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists noblesse_inquiries_buyer_idx on public.noblesse_inquiries (buyer_uid, created_at desc);
create index if not exists noblesse_inquiries_status_idx on public.noblesse_inquiries (status, created_at desc);

create table if not exists public.noblesse_inquiry_items (
  inquiry_id text not null references public.noblesse_inquiries(inquiry_id) on delete cascade,
  line_no integer not null check (line_no > 0),
  product_id text not null,
  product_code text not null,
  product_name text not null,
  thumbnail_url text not null default '',
  material text not null default '',
  color text not null default '',
  size text not null default '',
  moq integer not null check (moq > 0),
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  primary key (inquiry_id, line_no)
);

create table if not exists public.noblesse_admin_audit_logs (
  audit_id uuid primary key default gen_random_uuid(),
  actor_uid text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists noblesse_admin_audit_logs_entity_idx on public.noblesse_admin_audit_logs (entity_type, entity_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'noblesse_buyers', 'noblesse_categories', 'noblesse_collections',
    'noblesse_products', 'noblesse_product_prices', 'noblesse_banners',
    'noblesse_catalog_files', 'noblesse_inquiries', 'noblesse_inquiry_items'
  ] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.noblesse_set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
  alter table public.noblesse_admin_audit_logs enable row level security;
  revoke all on public.noblesse_admin_audit_logs from anon, authenticated;
end $$;

commit;
