-- Noblesse Piercing PostgreSQL schema draft.
-- This file is a planning and migration scaffold. Review before production use.
-- Supabase-specific usage is optional/historical; PostgreSQL-only architecture requires a backend API before real writes.
-- Browser-side price calculation is display-only and must never be trusted.

create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_uid text unique,
  email text unique not null,
  role text not null check (role in ('buyer', 'admin')),
  status text not null check (status in ('pending', 'approved', 'blocked')),
  account_status text not null default 'active' check (account_status in ('active', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete cascade,
  company_name text not null,
  contact_name text,
  country text,
  preferred_language text,
  phone text,
  messenger_type text,
  messenger_id text,
  sales_channel text,
  business_number text,
  assigned_market text not null check (assigned_market in ('KR', 'JP', 'US', 'TW', 'GLOBAL')),
  currency text not null check (currency in ('KRW', 'JPY', 'USD', 'TWD')),
  discount_rate numeric(5,2) default 0,
  min_order_amount numeric(14,2) default 0,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  verification_status text not null default 'draft' check (verification_status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id),
  rejection_reason text,
  suspension_reason text,
  assigned_admin_id uuid references public.users(id),
  internal_memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  admin_role text not null default 'operator' check (admin_role in ('operator', 'manager', 'owner')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null,
  effect text not null check (effect in ('allow', 'deny')),
  reason text not null,
  granted_by uuid references public.users(id),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, permission_key)
);

create table if not exists public.app_schema_migrations (
  migration_name text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  category_id text unique not null,
  name_ko text,
  name_en text,
  name_ja text,
  name_zh_tw text,
  slug text unique not null,
  cover_url text,
  is_visible boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ko text,
  name_en text,
  name_ja text,
  name_zh_tw text,
  category_id uuid references public.categories(id),
  material text,
  colors jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  moq_default integer default 1 check (moq_default > 0),
  lead_time text,
  origin text default 'KR',
  image_set jsonb default '{}'::jsonb,
  image_alt jsonb default '{}'::jsonb,
  taxonomy jsonb not null default '{}'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  detail_content jsonb not null default '{}'::jsonb,
  home_placement jsonb not null default '{}'::jsonb,
  badge text,
  is_visible boolean default true,
  is_export_available boolean default true,
  is_new boolean default false,
  is_best boolean default false,
  sort_order integer default 0,
  description_ko text,
  description_en text,
  description_ja text,
  description_zh_tw text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  market text not null check (market in ('KR', 'JP', 'US', 'TW', 'GLOBAL')),
  currency text not null check (currency in ('KRW', 'JPY', 'USD', 'TWD')),
  wholesale_price numeric(14,2) not null check (wholesale_price >= 0),
  retail_price numeric(14,2) check (retail_price is null or retail_price >= 0),
  moq integer not null default 1 check (moq > 0),
  min_order_amount numeric(14,2) default 0 check (min_order_amount >= 0),
  visible_to text default 'approved_only' check (visible_to in ('approved_only')),
  is_active boolean default true,
  updated_at timestamptz default now(),
  unique(product_id, market)
);

create table if not exists public.fx_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  base_currency text not null default 'KRW' check (base_currency = 'KRW'),
  quote_currency text not null check (quote_currency in ('KRW', 'JPY', 'USD', 'TWD')),
  krw_per_unit numeric(20,8) not null check (krw_per_unit > 0),
  rate_scaled bigint not null check (rate_scaled > 0),
  source_effective_at timestamptz not null,
  fetched_at timestamptz not null,
  payload_hash text not null,
  created_at timestamptz default now(),
  unique(provider, quote_currency, source_effective_at, payload_hash)
);

create table if not exists public.product_price_policies (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  target_market text not null check (target_market in ('KR', 'JP', 'US', 'TW', 'GLOBAL')),
  target_currency text not null check (target_currency in ('KRW', 'JPY', 'USD', 'TWD')),
  pricing_mode text not null check (pricing_mode in ('manual_fixed', 'fx_auto')),
  source_price_id uuid references public.product_prices(id) on delete set null,
  published_price_id uuid references public.product_prices(id) on delete set null,
  status text not null default 'pending_rate' check (status in ('pending_rate', 'active', 'held_deadband', 'updated', 'created', 'needs_input', 'blocked_stale', 'blocked_spike', 'paused', 'error')),
  latest_reference_wholesale_price numeric(14,2),
  latest_reference_retail_price numeric(14,2),
  latest_reference_min_order_amount numeric(14,2),
  latest_reference_rate_snapshot_id uuid references public.fx_rate_snapshots(id) on delete set null,
  last_applied_rate_snapshot_id uuid references public.fx_rate_snapshots(id) on delete set null,
  latest_source_price_updated_at timestamptz,
  last_applied_source_price_updated_at timestamptz,
  last_evaluated_at timestamptz,
  last_applied_at timestamptz,
  paused_at timestamptz,
  pause_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id, target_market, target_currency),
  constraint product_price_policies_market_currency_pair check (
    (target_market = 'KR' and target_currency = 'KRW') or
    (target_market = 'JP' and target_currency = 'JPY') or
    (target_market = 'US' and target_currency = 'USD') or
    (target_market = 'TW' and target_currency = 'TWD') or
    (target_market = 'GLOBAL' and target_currency = 'USD')
  ),
  constraint product_price_policies_auto_market_check check (
    pricing_mode = 'manual_fixed'
    or (pricing_mode = 'fx_auto' and target_market in ('JP', 'US', 'TW') and source_price_id is not null)
  ),
  constraint product_price_policies_manual_only_market_check check (
    target_market not in ('KR', 'GLOBAL') or pricing_mode = 'manual_fixed'
  )
);

create table if not exists public.fx_auto_price_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('rate_snapshot', 'base_price_change', 'manual_recheck', 'mode_change')),
  provider text,
  source_effective_at timestamptz,
  payload_hash text,
  idempotency_key text,
  update_threshold_bps integer not null default 500 check (update_threshold_bps > 0),
  circuit_breaker_bps integer not null default 1500 check (circuit_breaker_bps > 0),
  max_rate_age_hours integer not null default 72 check (max_rate_age_hours > 0),
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'skipped')),
  evaluated_count integer not null default 0 check (evaluated_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  held_count integer not null default 0 check (held_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  failure_category text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.fx_auto_price_events (
  id uuid primary key default gen_random_uuid(),
  event_key text,
  run_id uuid references public.fx_auto_price_runs(id) on delete set null,
  policy_id uuid references public.product_price_policies(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  target_market text not null check (target_market in ('KR', 'JP', 'US', 'TW', 'GLOBAL')),
  target_currency text not null check (target_currency in ('KRW', 'JPY', 'USD', 'TWD')),
  pricing_mode text not null check (pricing_mode in ('manual_fixed', 'fx_auto')),
  action text not null check (action in ('reference_updated', 'initial_created', 'auto_updated', 'held_deadband', 'manual_fixed', 'blocked_stale', 'blocked_spike', 'paused', 'error')),
  previous_wholesale_price numeric(14,2),
  reference_wholesale_price numeric(14,2),
  applied_wholesale_price numeric(14,2),
  divergence_bps integer check (divergence_bps is null or divergence_bps >= 0),
  rate_change_bps integer check (rate_change_bps is null or rate_change_bps >= 0),
  rate_snapshot_id uuid references public.fx_rate_snapshots(id) on delete set null,
  source_price_updated_at timestamptz,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  collection_id text unique not null,
  title_ko text,
  title_en text not null,
  title_ja text,
  slug text unique not null,
  cover_url text,
  is_visible boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_collections (
  product_id uuid references public.products(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  sort_order integer default 0,
  created_at timestamptz default now(),
  primary key(product_id, collection_id)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text unique not null,
  buyer_id uuid references public.buyers(id),
  market text not null check (market in ('KR', 'JP', 'US', 'TW', 'GLOBAL')),
  currency text not null check (currency in ('KRW', 'JPY', 'USD', 'TWD')),
  status text not null check (status in ('requested', 'checking', 'quoted', 'confirmed', 'cancelled')),
  total_items integer default 0 check (total_items >= 0),
  total_quantity integer default 0 check (total_quantity >= 0),
  estimated_total numeric(14,2) default 0 check (estimated_total >= 0),
  request_memo text,
  admin_memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  product_id uuid references public.products(id),
  product_code text not null,
  product_name text not null,
  category_id uuid references public.categories(id),
  material text,
  color text,
  size text,
  quantity integer not null check (quantity > 0),
  moq integer not null check (moq > 0),
  price_snapshot numeric(14,2) not null check (price_snapshot >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  created_at timestamptz default now()
);

create table if not exists public.admin_quotes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  quote_number text,
  status text not null check (status in ('draft', 'sent', 'accepted', 'rejected', 'cancelled')),
  confirmed_total numeric(14,2) default 0 check (confirmed_total >= 0),
  currency text not null check (currency in ('KRW', 'JPY', 'USD', 'TWD')),
  lead_time text,
  shipping_note text,
  valid_until date,
  document_locale text not null default 'en' check (document_locale in ('kr', 'en', 'jp', 'zh-TW')),
  customer_note text,
  admin_memo text,
  quoted_by uuid references public.users(id),
  quoted_at timestamptz,
  current_document_id uuid,
  accepted_document_id uuid,
  decision_note text,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_quote_items (
  id uuid primary key default gen_random_uuid(),
  admin_quote_id uuid references public.admin_quotes(id) on delete cascade,
  product_id uuid references public.products(id),
  product_code text not null,
  requested_quantity integer check (requested_quantity is null or requested_quantity >= 0),
  confirmed_quantity integer check (confirmed_quantity is null or confirmed_quantity >= 0),
  requested_price_snapshot numeric(14,2) check (requested_price_snapshot is null or requested_price_snapshot >= 0),
  confirmed_unit_price numeric(14,2) check (confirmed_unit_price is null or confirmed_unit_price >= 0),
  confirmed_subtotal numeric(14,2) check (confirmed_subtotal is null or confirmed_subtotal >= 0),
  product_name text,
  color text,
  size text,
  item_note text,
  created_at timestamptz default now()
);

create table if not exists public.admin_quote_documents (
  id uuid primary key default gen_random_uuid(),
  admin_quote_id uuid not null references public.admin_quotes(id) on delete cascade,
  revision integer not null check (revision > 0),
  document_locale text not null check (document_locale in ('kr', 'en', 'jp', 'zh-TW')),
  snapshot jsonb not null,
  pdf_object_key text not null,
  pdf_sha256 text not null,
  issued_by uuid references public.users(id),
  issued_at timestamptz not null default now(),
  unique(admin_quote_id, revision)
);

create table if not exists public.admin_quote_status_history (
  id uuid primary key default gen_random_uuid(),
  admin_quote_id uuid not null references public.admin_quotes(id) on delete cascade,
  document_id uuid references public.admin_quote_documents(id) on delete set null,
  from_status text,
  to_status text not null,
  actor_user_id uuid references public.users(id),
  actor_type text not null check (actor_type in ('admin', 'buyer', 'system')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_quotes
  add constraint admin_quotes_current_document_id_fkey
  foreign key (current_document_id) references public.admin_quote_documents(id) on delete set null;

alter table public.admin_quotes
  add constraint admin_quotes_accepted_document_id_fkey
  foreign key (accepted_document_id) references public.admin_quote_documents(id) on delete set null;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  banner_id text unique not null,
  title_ko text,
  title_en text,
  title_ja text,
  subtitle_ko text,
  subtitle_en text,
  subtitle_ja text,
  desktop_image_url text,
  mobile_image_url text,
  link_type text,
  link_value text,
  is_visible boolean default true,
  sort_order integer default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.home_showcase_slides (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  label text,
  title jsonb not null default '{}'::jsonb,
  eyebrow jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  target_url text not null default '/products',
  image_set jsonb not null default '{}'::jsonb,
  image_alt jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_showcase_slides_target_url_check
    check (target_url like '/%' and target_url not like '//%')
);

create table if not exists public.catalog_files (
  id uuid primary key default gen_random_uuid(),
  file_id text unique not null,
  title_ko text,
  title_en text,
  title_ja text,
  file_url text not null,
  market text not null check (market in ('KR', 'JP', 'US', 'TW', 'GLOBAL')),
  price_included boolean default false,
  visible_to text not null check (visible_to in ('public', 'approved_only')),
  uploaded_at timestamptz default now(),
  version text
);

create table if not exists public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_key text not null check (agreement_key in ('terms_of_service', 'buyer_terms', 'privacy_collection_use', 'marketing_updates', 'privacy_policy')),
  version text not null,
  title_ko text,
  title_en text,
  content_ko text,
  content_en text,
  required boolean default true,
  is_active boolean default true,
  effective_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(agreement_key, version)
);

create table if not exists public.buyer_agreements (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.buyers(id) on delete cascade,
  terms_version_id uuid references public.terms_versions(id),
  agreement_key text not null check (agreement_key in ('terms_of_service', 'buyer_terms', 'privacy_collection_use', 'marketing_updates', 'privacy_policy')),
  version text not null,
  required boolean default true,
  accepted boolean not null,
  accepted_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text check (actor_role in ('admin', 'buyer', 'system', 'anonymous')),
  action text not null,
  target_table text,
  target_id text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  ip_address text,
  user_agent text,
  request_id text,
  created_at timestamptz default now()
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_buyers_updated_at on public.buyers;
create trigger trg_buyers_updated_at before update on public.buyers
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at before update on public.admin_profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_admin_permission_overrides_updated_at on public.admin_permission_overrides;
create trigger trg_admin_permission_overrides_updated_at before update on public.admin_permission_overrides
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_product_prices_updated_at on public.product_prices;
create trigger trg_product_prices_updated_at before update on public.product_prices
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_collections_updated_at on public.collections;
create trigger trg_collections_updated_at before update on public.collections
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_inquiries_updated_at on public.inquiries;
create trigger trg_inquiries_updated_at before update on public.inquiries
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_admin_quotes_updated_at on public.admin_quotes;
create trigger trg_admin_quotes_updated_at before update on public.admin_quotes
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_banners_updated_at on public.banners;
create trigger trg_banners_updated_at before update on public.banners
for each row execute function public.update_updated_at_column();

create index if not exists idx_users_role_status on public.users(role, status);
create index if not exists idx_users_account_status on public.users(account_status);
create index if not exists idx_buyers_user_id on public.buyers(user_id);
create index if not exists idx_buyers_assigned_market on public.buyers(assigned_market);
create index if not exists idx_buyers_country on public.buyers(country);
create index if not exists idx_buyers_company_name on public.buyers(company_name);
create index if not exists idx_buyers_verification_status on public.buyers(verification_status);
create index if not exists idx_buyers_assigned_admin_id on public.buyers(assigned_admin_id);
create index if not exists idx_admin_permission_overrides_user on public.admin_permission_overrides(user_id);
create index if not exists idx_admin_permission_overrides_active on public.admin_permission_overrides(user_id, permission_key)
  where expires_at is null;
create index if not exists idx_categories_visible_sort on public.categories(is_visible, sort_order);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_visible_sort on public.products(is_visible, sort_order);
create index if not exists idx_products_is_new on public.products(is_new);
create index if not exists idx_products_is_best on public.products(is_best);
create index if not exists idx_products_colors_gin on public.products using gin(colors);
create index if not exists idx_products_sizes_gin on public.products using gin(sizes);
create index if not exists idx_products_taxonomy_gin on public.products using gin(taxonomy);
create index if not exists idx_products_home_placement_gin on public.products using gin(home_placement);
create index if not exists idx_product_prices_product_market on public.product_prices(product_id, market);
create index if not exists idx_product_prices_market_active on public.product_prices(market, is_active);
create index if not exists idx_product_prices_currency on public.product_prices(currency);
create index if not exists idx_fx_rate_snapshots_quote_effective on public.fx_rate_snapshots(quote_currency, source_effective_at desc);
create index if not exists idx_product_price_policies_product_market on public.product_price_policies(product_id, target_market, target_currency);
create index if not exists idx_product_price_policies_status on public.product_price_policies(status, pricing_mode, target_market);
create index if not exists idx_fx_auto_price_runs_created_at on public.fx_auto_price_runs(created_at desc);
create unique index if not exists idx_fx_auto_price_runs_idempotency_key on public.fx_auto_price_runs(idempotency_key) where idempotency_key is not null;
create index if not exists idx_fx_auto_price_events_policy_created_at on public.fx_auto_price_events(policy_id, created_at desc);
create index if not exists idx_fx_auto_price_events_product_created_at on public.fx_auto_price_events(product_id, created_at desc);
create unique index if not exists idx_fx_auto_price_events_event_key on public.fx_auto_price_events(event_key) where event_key is not null;
create index if not exists idx_collections_visible_sort on public.collections(is_visible, sort_order);
create index if not exists idx_product_collections_collection_sort on public.product_collections(collection_id, sort_order);
create index if not exists idx_inquiries_buyer_created on public.inquiries(buyer_id, created_at);
create index if not exists idx_inquiries_status_created on public.inquiries(status, created_at);
create index if not exists idx_inquiries_market_created on public.inquiries(market, created_at);
create index if not exists idx_inquiries_currency_created on public.inquiries(currency, created_at);
create index if not exists idx_inquiry_items_inquiry_id on public.inquiry_items(inquiry_id);
create index if not exists idx_inquiry_items_product_id on public.inquiry_items(product_id);
create index if not exists idx_inquiry_items_category_id on public.inquiry_items(category_id);
create index if not exists idx_inquiry_items_product_code on public.inquiry_items(product_code);
create index if not exists idx_inquiry_items_color_size on public.inquiry_items(color, size);
create index if not exists idx_admin_quotes_inquiry_id on public.admin_quotes(inquiry_id);
create index if not exists idx_admin_quotes_status_quoted on public.admin_quotes(status, quoted_at);
create index if not exists idx_admin_quotes_quoted_by on public.admin_quotes(quoted_by);
create unique index if not exists idx_admin_quotes_quote_number on public.admin_quotes(quote_number) where quote_number is not null;
create index if not exists idx_admin_quote_items_admin_quote_id on public.admin_quote_items(admin_quote_id);
create index if not exists idx_admin_quote_items_product_id on public.admin_quote_items(product_id);
create index if not exists idx_admin_quote_items_product_code on public.admin_quote_items(product_code);
create index if not exists idx_admin_quote_documents_quote_revision on public.admin_quote_documents(admin_quote_id, revision desc);
create index if not exists idx_admin_quote_status_history_quote_created on public.admin_quote_status_history(admin_quote_id, created_at asc);
create index if not exists idx_banners_visible_sort on public.banners(is_visible, sort_order);
create index if not exists idx_banners_starts_ends on public.banners(starts_at, ends_at);
create index if not exists idx_home_showcase_slides_public_order on public.home_showcase_slides(is_active, sort_order, created_at);
create index if not exists idx_catalog_files_market_visible on public.catalog_files(market, visible_to);
create index if not exists idx_catalog_files_uploaded_at on public.catalog_files(uploaded_at);
create index if not exists idx_terms_versions_key_version on public.terms_versions(agreement_key, version);
create index if not exists idx_terms_versions_active on public.terms_versions(agreement_key, is_active);
create index if not exists idx_terms_versions_is_active on public.terms_versions(is_active);
create index if not exists idx_buyer_agreements_buyer_id on public.buyer_agreements(buyer_id);
create index if not exists idx_buyer_agreements_key_version on public.buyer_agreements(agreement_key, version);
create index if not exists idx_buyer_agreements_accepted_at on public.buyer_agreements(accepted_at);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_target on public.audit_logs(target_table, target_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_request_id on public.audit_logs(request_id);
