-- Noblesse POS analytics schema draft.
-- This file is additive only. Do not add destructive migrations here.
-- TODO: Add production RLS policies after access roles are finalized.

create extension if not exists pgcrypto;

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  source_store_id text,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pos_devices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id),
  source_device_id text,
  device_name text,
  platform text,
  app_version text,
  last_seen_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists buyers (
  id uuid primary key default gen_random_uuid(),
  source_customer_id text,
  noblesse_buyer_id text,
  customer_name text,
  company_name text,
  contact_name text,
  phone text,
  country text,
  market text,
  currency text,
  discount_rate numeric(5,2) not null default 0,
  vat_enabled boolean not null default true,
  status text not null default 'active',
  raw_customer_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  source_item_id text,
  noblesse_product_id text,
  product_code text,
  item_name text,
  product_name text,
  category_id text,
  category_name text,
  unit_price bigint,
  is_official boolean not null default false,
  is_active boolean not null default true,
  raw_item_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pos_sales (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_sale_id text not null,
  store_id uuid references stores(id),
  buyer_id uuid references buyers(id),
  source_customer_id text,
  customer_name text,
  sale_date timestamptz not null,
  currency text,
  subtotal_amount bigint not null default 0,
  discount_amount bigint not null default 0,
  supply_amount bigint not null default 0,
  vat_amount bigint not null default 0,
  total_amount bigint not null default 0,
  total_quantity integer not null default 0,
  line_count integer not null default 0,
  writer_name text,
  raw_sale_json jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_sales_source_unique unique (source_system, source_sale_id)
);

create table if not exists pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  pos_sale_id uuid not null references pos_sales(id),
  source_line_id text,
  source_item_id text,
  product_id uuid references products(id),
  product_code text,
  item_name text,
  category_id text,
  category_name text,
  quantity integer not null default 0,
  unit_price bigint not null default 0,
  original_unit_price bigint,
  line_total_amount bigint not null default 0,
  discountable boolean,
  raw_line_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists buyer_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references buyers(id),
  month date not null,
  purchase_count integer not null default 0,
  total_purchase_amount bigint not null default 0,
  total_quantity integer not null default 0,
  average_purchase_amount bigint not null default 0,
  latest_purchase_date timestamptz,
  repeat_interval_days numeric(10,2),
  top_product_id uuid,
  top_product_name text,
  top_category_id text,
  amount_change_rate numeric(10,2),
  quantity_change_rate numeric(10,2),
  inactive_buyer_flag boolean not null default false,
  calculated_at timestamptz not null default now(),
  constraint buyer_monthly_metrics_unique unique (buyer_id, month)
);

create table if not exists product_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  month date not null,
  sale_count integer not null default 0,
  total_quantity integer not null default 0,
  total_amount bigint not null default 0,
  buyer_count integer not null default 0,
  repeat_buyer_count integer not null default 0,
  amount_change_rate numeric(10,2),
  quantity_change_rate numeric(10,2),
  calculated_at timestamptz not null default now(),
  constraint product_monthly_metrics_unique unique (product_id, month)
);

create table if not exists pos_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_project_id text,
  import_type text not null,
  status text not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  imported_sales_count integer not null default 0,
  imported_lines_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists pos_source_mappings (
  id uuid primary key default gen_random_uuid(),
  mapping_type text not null,
  source_system text not null,
  source_id text not null,
  target_table text not null,
  target_id uuid,
  confidence text not null default 'manual_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pos_sales_source on pos_sales(source_system, source_sale_id);
create index if not exists idx_pos_sales_buyer_date on pos_sales(buyer_id, sale_date desc);
create index if not exists idx_pos_sales_sale_date on pos_sales(sale_date);
create index if not exists idx_pos_sale_items_sale on pos_sale_items(pos_sale_id);
create index if not exists idx_pos_sale_items_product on pos_sale_items(product_id);
create index if not exists idx_pos_sale_items_source_item on pos_sale_items(source_item_id);
create index if not exists idx_pos_sale_items_category on pos_sale_items(category_id);
create index if not exists idx_buyer_monthly_metrics_buyer_month on buyer_monthly_metrics(buyer_id, month);
create index if not exists idx_product_monthly_metrics_product_month on product_monthly_metrics(product_id, month);
create index if not exists idx_products_product_code on products(product_code);
create index if not exists idx_buyers_source_customer on buyers(source_customer_id);
create index if not exists idx_pos_source_mappings_lookup on pos_source_mappings(mapping_type, source_system, source_id);

-- TODO: Enable RLS and define admin-only analytics policies before production use.
-- TODO: Add buyer-scoped read policies only if buyer-facing analytics are explicitly approved.
