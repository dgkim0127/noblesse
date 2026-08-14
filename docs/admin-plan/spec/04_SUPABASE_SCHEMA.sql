-- 피어싱 자사몰 관리자 v2
-- Supabase/PostgreSQL baseline migration
-- Review in a staging project before production deployment.

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- enums ----------

do $$ begin
  create type public.member_role as enum (
    'OWNER', 'ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CS_MANAGER', 'ANALYST', 'VIEWER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.display_status as enum ('VISIBLE', 'HIDDEN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tax_type as enum ('TAXABLE', 'TAX_EXEMPT', 'ZERO_RATED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('NONE', 'FIXED', 'PERCENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shipping_fee_type as enum ('FREE', 'FLAT', 'CONDITIONAL_FREE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_kind as enum ('IMAGE', 'VIDEO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_media_role as enum ('MAIN', 'GALLERY', 'DETAIL', 'OPTION', 'VIDEO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.relation_type as enum ('SIMILAR', 'CROSS_SELL', 'UP_SELL', 'ACCESSORY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.template_type as enum (
    'SHIPPING', 'RETURN_EXCHANGE', 'OPTION', 'LEGAL_NOTICE', 'DESCRIPTION'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.import_job_status as enum (
    'UPLOADED', 'VALIDATING', 'READY', 'IMPORTING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.import_row_status as enum ('PENDING', 'VALID', 'INVALID', 'IMPORTED', 'FAILED', 'SKIPPED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum (
    'INITIAL', 'PURCHASE', 'SALE', 'SALE_CANCEL', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'RESERVATION', 'RELEASE'
  );
exception when duplicate_object then null; end $$;

-- ---------- shared functions ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- ---------- identity and tenancy ----------

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  timezone text not null default 'Asia/Seoul',
  currency char(3) not null default 'KRW',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
  );
$$;

create or replace function public.has_store_role(target_store_id uuid, allowed_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
      and sm.role = any(allowed_roles)
  );
$$;

-- ---------- product reference data ----------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  depth smallint not null default 1 check (depth between 1 and 4),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  legal_notice_schema jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists categories_store_slug_uq
  on public.categories(store_id, slug) where deleted_at is null;
create index if not exists categories_parent_idx on public.categories(store_id, parent_id, sort_order);

create table if not exists public.shipping_profiles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  fee_type public.shipping_fee_type not null,
  base_fee bigint not null default 0 check (base_fee >= 0),
  free_over_amount bigint check (free_over_amount is null or free_over_amount >= 0),
  jeju_surcharge bigint not null default 0 check (jeju_surcharge >= 0),
  island_surcharge bigint not null default 0 check (island_surcharge >= 0),
  carrier_code text,
  dispatch_days_min smallint not null default 1 check (dispatch_days_min between 0 and 365),
  dispatch_days_max smallint not null default 3 check (dispatch_days_max between 0 and 365),
  bundle_shipping boolean not null default true,
  origin_address jsonb not null default '{}'::jsonb,
  return_address jsonb not null default '{}'::jsonb,
  return_fee bigint not null default 0 check (return_fee >= 0),
  exchange_fee bigint not null default 0 check (exchange_fee >= 0),
  unavailable_regions text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (dispatch_days_max >= dispatch_days_min),
  check (
    (fee_type = 'CONDITIONAL_FREE' and free_over_amount is not null)
    or fee_type <> 'CONDITIONAL_FREE'
  )
);

create unique index if not exists shipping_profiles_store_name_uq
  on public.shipping_profiles(store_id, lower(name)) where deleted_at is null;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  kind public.media_kind not null,
  bucket text not null,
  object_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(10,3) check (duration_seconds is null or duration_seconds >= 0),
  checksum_sha256 text,
  alt_text text not null default '',
  tags text[] not null default '{}',
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(store_id, bucket, object_path)
);

create index if not exists media_assets_store_created_idx on public.media_assets(store_id, created_at desc);
create index if not exists media_assets_tags_gin on public.media_assets using gin(tags);

-- ---------- products ----------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete restrict,
  shipping_profile_id uuid references public.shipping_profiles(id) on delete restrict,
  product_code text,
  name text not null default '' check (char_length(name) <= 100),
  slug text,
  summary text not null default '' check (char_length(summary) <= 300),
  description_json jsonb not null default '{}'::jsonb,
  description_html text not null default '',
  brand_name text not null default '',
  manufacturer_name text not null default '',
  model_name text not null default '',
  origin_country text not null default '',
  status public.product_status not null default 'DRAFT',
  display_status public.display_status not null default 'HIDDEN',
  tax_type public.tax_type not null default 'TAXABLE',
  base_price bigint not null default 0 check (base_price >= 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price >= 0),
  discount_type public.discount_type not null default 'NONE',
  discount_value bigint not null default 0 check (discount_value >= 0),
  discount_start_at timestamptz,
  discount_end_at timestamptz,
  sale_start_at timestamptz,
  sale_end_at timestamptz,
  min_purchase_qty integer not null default 1 check (min_purchase_qty >= 1),
  max_purchase_qty integer check (max_purchase_qty is null or max_purchase_qty >= 1),
  preorder_enabled boolean not null default false,
  preorder_start_at timestamptz,
  preorder_end_at timestamptz,
  expected_ship_start_at date,
  expected_ship_end_at date,
  preorder_max_qty integer check (preorder_max_qty is null or preorder_max_qty >= 1),
  preorder_notice text not null default '',
  shipping_override jsonb not null default '{}'::jsonb,
  return_exchange_override jsonb not null default '{}'::jsonb,
  after_service_info jsonb not null default '{}'::jsonb,
  legal_notice_type text,
  legal_notice_data jsonb not null default '{}'::jsonb,
  seo_title text not null default '' check (char_length(seo_title) <= 120),
  seo_description text not null default '' check (char_length(seo_description) <= 300),
  search_keywords text[] not null default '{}',
  published_at timestamptz,
  version integer not null default 1 check (version >= 1),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (compare_at_price is null or compare_at_price >= base_price),
  check (discount_type <> 'PERCENT' or discount_value between 1 and 99),
  check (discount_end_at is null or discount_start_at is null or discount_end_at > discount_start_at),
  check (sale_end_at is null or sale_start_at is null or sale_end_at > sale_start_at),
  check (max_purchase_qty is null or max_purchase_qty >= min_purchase_qty),
  check (preorder_end_at is null or preorder_start_at is null or preorder_end_at > preorder_start_at),
  check (expected_ship_end_at is null or expected_ship_start_at is null or expected_ship_end_at >= expected_ship_start_at)
);

create unique index if not exists products_store_code_uq
  on public.products(store_id, product_code) where deleted_at is null and product_code is not null;
create unique index if not exists products_store_slug_uq
  on public.products(store_id, slug) where deleted_at is null and slug is not null;
create index if not exists products_store_status_idx on public.products(store_id, status, updated_at desc) where deleted_at is null;
create index if not exists products_store_category_idx on public.products(store_id, category_id, updated_at desc) where deleted_at is null;
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);


create table if not exists public.product_status_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  from_status public.product_status,
  to_status public.product_status not null,
  reason text not null default '',
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists product_status_history_product_idx
  on public.product_status_history(store_id, product_id, created_at desc);

create table if not exists public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name)
);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  option_group_id uuid not null references public.product_option_groups(id) on delete cascade,
  value text not null check (char_length(value) between 1 and 100),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(option_group_id, value)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  combination_key text not null,
  sku text not null,
  barcode text,
  display_name text not null default '',
  price bigint not null default 0 check (price >= 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price >= 0),
  cost_price bigint check (cost_price is null or cost_price >= 0),
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (compare_at_price is null or compare_at_price >= price)
);

create unique index if not exists product_variants_store_sku_uq
  on public.product_variants(store_id, sku) where deleted_at is null;
create unique index if not exists product_variants_store_barcode_uq
  on public.product_variants(store_id, barcode) where deleted_at is null and barcode is not null;
create unique index if not exists product_variants_combination_uq
  on public.product_variants(product_id, combination_key) where deleted_at is null;
create index if not exists product_variants_product_idx
  on public.product_variants(store_id, product_id, sort_order) where deleted_at is null;

create table if not exists public.variant_option_values (
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  option_group_id uuid not null references public.product_option_groups(id) on delete cascade,
  option_value_id uuid not null references public.product_option_values(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (variant_id, option_group_id),
  unique(variant_id, option_value_id)
);

create table if not exists public.inventory_stocks (
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  check (reserved <= on_hand)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  on_hand_delta integer not null default 0,
  reserved_delta integer not null default 0,
  on_hand_after integer not null check (on_hand_after >= 0),
  reserved_after integer not null check (reserved_after >= 0),
  reason text not null default '',
  reference_type text,
  reference_id uuid,
  idempotency_key text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(store_id, idempotency_key),
  check (on_hand_delta <> 0 or reserved_delta <> 0)
);

create index if not exists inventory_movements_variant_idx
  on public.inventory_movements(store_id, variant_id, created_at desc);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  role public.product_media_role not null,
  sort_order integer not null default 0,
  alt_text text not null default '',
  created_at timestamptz not null default now(),
  unique(product_id, role, sort_order)
);

create unique index if not exists product_single_main_media_uq
  on public.product_media(product_id) where role = 'MAIN';
create index if not exists product_media_product_idx
  on public.product_media(store_id, product_id, role, sort_order);

-- ---------- merchandising ----------

create table if not exists public.product_relations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  source_product_id uuid not null references public.products(id) on delete cascade,
  target_product_id uuid not null references public.products(id) on delete cascade,
  relation_type public.relation_type not null,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (source_product_id <> target_product_id),
  unique(source_product_id, target_product_id, relation_type)
);

create table if not exists public.product_series (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null,
  summary text not null default '',
  description_json jsonb not null default '{}'::jsonb,
  description_html text not null default '',
  main_media_asset_id uuid references public.media_assets(id) on delete restrict,
  display_status public.display_status not null default 'HIDDEN',
  display_start_at timestamptz,
  display_end_at timestamptz,
  seo_title text not null default '',
  seo_description text not null default '',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (display_end_at is null or display_start_at is null or display_end_at > display_start_at)
);

create unique index if not exists product_series_store_slug_uq
  on public.product_series(store_id, slug) where deleted_at is null;

create table if not exists public.product_series_items (
  store_id uuid not null references public.stores(id) on delete cascade,
  series_id uuid not null references public.product_series(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  is_representative boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (series_id, product_id)
);

create unique index if not exists product_series_one_representative_uq
  on public.product_series_items(series_id) where is_representative = true;

create table if not exists public.product_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  template_type public.template_type not null,
  name text not null check (char_length(name) between 1 and 100),
  payload jsonb not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists product_templates_store_name_uq
  on public.product_templates(store_id, template_type, lower(name)) where deleted_at is null;

create table if not exists public.product_notices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notice_type text not null default 'GENERAL',
  content_json jsonb not null default '{}'::jsonb,
  content_html text not null default '',
  display_status public.display_status not null default 'HIDDEN',
  display_start_at timestamptz,
  display_end_at timestamptz,
  priority integer not null default 0,
  applies_to_all_products boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (display_end_at is null or display_start_at is null or display_end_at > display_start_at)
);

create table if not exists public.product_notice_assignments (
  store_id uuid not null references public.stores(id) on delete cascade,
  notice_id uuid not null references public.product_notices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (notice_id, product_id)
);

-- ---------- imports and audit ----------

create table if not exists public.product_import_jobs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  mode text not null check (mode in ('CREATE', 'UPDATE')),
  status public.import_job_status not null default 'UPLOADED',
  original_filename text not null,
  storage_path text not null,
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  result_storage_path text,
  error_message text,
  idempotency_key text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(store_id, idempotency_key)
);

create table if not exists public.product_import_rows (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  job_id uuid not null references public.product_import_jobs(id) on delete cascade,
  row_number integer not null check (row_number >= 1),
  raw_data jsonb not null,
  normalized_data jsonb,
  status public.import_row_status not null default 'PENDING',
  errors jsonb not null default '[]'::jsonb,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, row_number)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx
  on public.audit_logs(store_id, entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx
  on public.audit_logs(store_id, actor_user_id, created_at desc);

-- ---------- updated_at triggers ----------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'stores', 'profiles', 'store_members', 'categories', 'shipping_profiles',
    'products', 'product_option_groups', 'product_option_values', 'product_variants',
    'inventory_stocks', 'product_series', 'product_templates', 'product_notices',
    'product_import_jobs', 'product_import_rows'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

-- ---------- RLS ----------

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.store_members enable row level security;

create policy stores_select_member on public.stores
  for select using (public.is_store_member(id));

create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy store_members_select_member on public.store_members
  for select using (public.is_store_member(store_id));
create policy store_members_write_owner on public.store_members
  for all
  using (public.has_store_role(store_id, array['OWNER']::public.member_role[]))
  with check (public.has_store_role(store_id, array['OWNER']::public.member_role[]));

-- Generic business-table policies. The application must still perform server-side authorization.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories', 'shipping_profiles', 'media_assets', 'products', 'product_status_history',
    'product_option_groups', 'product_option_values', 'product_variants', 'variant_option_values',
    'inventory_stocks', 'inventory_movements', 'product_media', 'product_relations',
    'product_series', 'product_series_items', 'product_templates', 'product_notices',
    'product_notice_assignments', 'product_import_jobs', 'product_import_rows', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I_select_member on public.%I for select using (public.is_store_member(store_id))',
      table_name, table_name
    );
    execute format(
      'create policy %I_write_product_roles on public.%I for all using (public.has_store_role(store_id, array[''OWNER'',''ADMIN'',''PRODUCT_MANAGER'']::public.member_role[])) with check (public.has_store_role(store_id, array[''OWNER'',''ADMIN'',''PRODUCT_MANAGER'']::public.member_role[]))',
      table_name, table_name
    );
  end loop;
end $$;

-- Prevent clients from modifying audit history after insert.
drop policy if exists audit_logs_write_product_roles on public.audit_logs;
create policy audit_logs_insert_product_roles on public.audit_logs
  for insert
  with check (
    public.has_store_role(
      store_id,
      array['OWNER','ADMIN','PRODUCT_MANAGER']::public.member_role[]
    )
  );

commit;

-- Post-migration notes:
-- 1. Enable pg_trgm before using the name trigram index if not already enabled.
-- 2. Create Storage policies for the product-media bucket; never expose the service-role key.
-- 3. Run RLS isolation tests with two stores before production.
-- 4. Product publish, variant generation and stock adjustment should be transactional RPCs or server operations.
