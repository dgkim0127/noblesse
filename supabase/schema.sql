-- Noblesse Piercing PostgreSQL/Supabase schema draft.
-- This file is a planning and migration scaffold. Review before production use.
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
  assigned_market text not null check (assigned_market in ('KR', 'JP', 'US', 'GLOBAL')),
  currency text not null check (currency in ('KRW', 'JPY', 'USD')),
  discount_rate numeric(5,2) default 0,
  min_order_amount numeric(14,2) default 0,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  category_id text unique not null,
  name_ko text,
  name_en text,
  name_ja text,
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
  name_en text not null,
  name_ja text,
  category_id uuid references public.categories(id),
  material text,
  colors jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  moq_default integer default 1 check (moq_default > 0),
  lead_time text,
  origin text default 'KR',
  image_set jsonb default '{}'::jsonb,
  image_alt jsonb default '{}'::jsonb,
  is_visible boolean default true,
  is_export_available boolean default true,
  is_new boolean default false,
  is_best boolean default false,
  sort_order integer default 0,
  description_ko text,
  description_en text,
  description_ja text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  market text not null check (market in ('KR', 'JP', 'US', 'GLOBAL')),
  currency text not null check (currency in ('KRW', 'JPY', 'USD')),
  wholesale_price numeric(14,2) not null check (wholesale_price >= 0),
  retail_price numeric(14,2) check (retail_price is null or retail_price >= 0),
  moq integer not null default 1 check (moq > 0),
  min_order_amount numeric(14,2) default 0 check (min_order_amount >= 0),
  visible_to text default 'approved_only' check (visible_to in ('approved_only')),
  is_active boolean default true,
  updated_at timestamptz default now(),
  unique(product_id, market)
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
  market text not null check (market in ('KR', 'JP', 'US', 'GLOBAL')),
  currency text not null check (currency in ('KRW', 'JPY', 'USD')),
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
  status text not null check (status in ('draft', 'sent', 'accepted', 'cancelled')),
  confirmed_total numeric(14,2) default 0 check (confirmed_total >= 0),
  currency text not null check (currency in ('KRW', 'JPY', 'USD')),
  lead_time text,
  shipping_note text,
  admin_memo text,
  quoted_by uuid references public.users(id),
  quoted_at timestamptz,
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
  created_at timestamptz default now()
);

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

create table if not exists public.catalog_files (
  id uuid primary key default gen_random_uuid(),
  file_id text unique not null,
  title_ko text,
  title_en text,
  title_ja text,
  file_url text not null,
  market text not null check (market in ('KR', 'JP', 'US', 'GLOBAL')),
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

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_buyers_updated_at on public.buyers;
create trigger trg_buyers_updated_at before update on public.buyers
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
create index if not exists idx_buyers_user_id on public.buyers(user_id);
create index if not exists idx_buyers_assigned_market on public.buyers(assigned_market);
create index if not exists idx_buyers_country on public.buyers(country);
create index if not exists idx_buyers_company_name on public.buyers(company_name);
create index if not exists idx_categories_visible_sort on public.categories(is_visible, sort_order);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_visible_sort on public.products(is_visible, sort_order);
create index if not exists idx_products_is_new on public.products(is_new);
create index if not exists idx_products_is_best on public.products(is_best);
create index if not exists idx_products_colors_gin on public.products using gin(colors);
create index if not exists idx_products_sizes_gin on public.products using gin(sizes);
create index if not exists idx_product_prices_product_market on public.product_prices(product_id, market);
create index if not exists idx_product_prices_market_active on public.product_prices(market, is_active);
create index if not exists idx_product_prices_currency on public.product_prices(currency);
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
create index if not exists idx_admin_quote_items_admin_quote_id on public.admin_quote_items(admin_quote_id);
create index if not exists idx_admin_quote_items_product_id on public.admin_quote_items(product_id);
create index if not exists idx_admin_quote_items_product_code on public.admin_quote_items(product_code);
create index if not exists idx_banners_visible_sort on public.banners(is_visible, sort_order);
create index if not exists idx_banners_starts_ends on public.banners(starts_at, ends_at);
create index if not exists idx_catalog_files_market_visible on public.catalog_files(market, visible_to);
create index if not exists idx_catalog_files_uploaded_at on public.catalog_files(uploaded_at);
create index if not exists idx_terms_versions_key_version on public.terms_versions(agreement_key, version);
create index if not exists idx_terms_versions_active on public.terms_versions(agreement_key, is_active);
create index if not exists idx_terms_versions_is_active on public.terms_versions(is_active);
create index if not exists idx_buyer_agreements_buyer_id on public.buyer_agreements(buyer_id);
create index if not exists idx_buyer_agreements_key_version on public.buyer_agreements(agreement_key, version);
create index if not exists idx_buyer_agreements_accepted_at on public.buyer_agreements(accepted_at);
