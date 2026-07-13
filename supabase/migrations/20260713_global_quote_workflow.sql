-- Noblesse quote-only sales workflow. This migration intentionally creates no
-- payment, order, settlement, or inventory deduction tables.

create extension if not exists pgcrypto;

create table if not exists public.buyer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text not null default '',
  contact_name text not null default '',
  country text not null default '',
  preferred_language text not null default 'en' check (preferred_language in ('ko', 'en', 'ja', 'zh')),
  phone text not null default '',
  role text not null default 'buyer' check (role in ('buyer', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  assigned_market text not null default 'GLOBAL',
  currency text not null default 'USD',
  discount_rate numeric(5,2) not null default 0,
  min_order_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  product_id text primary key,
  code text not null unique,
  name_ko text not null default '',
  name_en text not null,
  name_ja text not null default '',
  name_zh text not null default '',
  category_id text not null default '',
  material text not null default '',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  moq_default integer not null default 1 check (moq_default > 0),
  lead_time text not null default '',
  origin text not null default 'KR',
  image_set jsonb not null default '{}'::jsonb,
  image_alt jsonb not null default '{}'::jsonb,
  description_ko text not null default '',
  description_en text not null default '',
  description_ja text not null default '',
  description_zh text not null default '',
  is_visible boolean not null default true,
  is_export_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(product_id) on delete cascade,
  market text not null,
  currency text not null,
  wholesale_price numeric(14,2) not null check (wholesale_price >= 0),
  retail_price numeric(14,2),
  moq integer not null check (moq > 0),
  min_order_amount numeric(14,2) not null default 0,
  visible_to text not null default 'approved_only',
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(product_id, market)
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  buyer_id uuid not null references public.buyer_profiles(id),
  buyer_company_name text not null,
  buyer_language text not null,
  shipping_country text not null,
  contact_name text not null,
  contact_email text not null,
  currency text not null,
  status text not null default 'requested' check (status in ('requested', 'checking', 'quoted', 'accepted', 'rejected', 'cancelled')),
  total_items integer not null check (total_items > 0),
  total_quantity integer not null check (total_quantity > 0),
  estimated_total numeric(14,2) not null check (estimated_total >= 0),
  request_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  product_id text not null,
  product_code text not null,
  product_name text not null,
  thumbnail_url text not null default '',
  material text not null default '',
  color text not null default '',
  size text not null default '',
  moq integer not null check (moq > 0),
  quantity integer not null check (quantity > 0),
  price_snapshot numeric(14,2) not null check (price_snapshot >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'accepted', 'rejected', 'cancelled')),
  currency text not null,
  shipping_amount numeric(14,2) not null default 0 check (shipping_amount >= 0),
  quoted_total numeric(14,2) not null default 0 check (quoted_total >= 0),
  lead_time text not null default '',
  valid_until date,
  terms text not null default '',
  admin_note text not null default '',
  published_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id text not null,
  product_code text not null,
  product_name text not null,
  thumbnail_url text not null default '',
  material text not null default '',
  color text not null default '',
  size text not null default '',
  moq integer not null check (moq > 0),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  unique(quote_id, product_id, color, size)
);

create table if not exists public.quote_documents (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text not null default 'application/pdf',
  created_at timestamptz not null default now(),
  unique(quote_id, storage_path)
);

create table if not exists public.quote_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  actor_id uuid references public.buyer_profiles(id),
  event_type text not null,
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);

create index if not exists quote_requests_buyer_created_idx on public.quote_requests(buyer_id, created_at desc);
create index if not exists quote_requests_status_created_idx on public.quote_requests(status, created_at desc);
create index if not exists quote_request_items_request_idx on public.quote_request_items(request_id);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);
create index if not exists quote_documents_quote_idx on public.quote_documents(quote_id);

create or replace function public.is_quote_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.buyer_profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create or replace function public.create_buyer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.buyer_profiles (id, email, company_name, contact_name, country, preferred_language, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'companyName', ''),
    coalesce(new.raw_user_meta_data->>'contactName', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    coalesce(new.raw_user_meta_data->>'preferredLanguage', 'en'),
    coalesce(new.raw_user_meta_data->>'phone', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_created_buyer_profile on auth.users;
create trigger auth_user_created_buyer_profile after insert on auth.users for each row execute function public.create_buyer_profile();

-- Buyers submit only product/options/quantity. The server reads the current
-- approved-market price and writes every displayed amount as an immutable snapshot.
create or replace function public.create_quote_request(
  p_shipping_country text,
  p_contact_name text,
  p_contact_email text,
  p_request_memo text,
  p_items jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_buyer public.buyer_profiles%rowtype;
  v_product public.products%rowtype;
  v_price public.product_prices%rowtype;
  v_item jsonb;
  v_quantity integer;
  v_unit_price numeric(14,2);
  v_subtotal numeric(14,2);
  v_total numeric(14,2) := 0;
  v_quantity_total integer := 0;
  v_request_id uuid;
begin
  select * into v_buyer from public.buyer_profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'Approved buyer access is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one quote item is required'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where product_id = v_item->>'product_id' and is_visible = true;
    if not found then raise exception 'Requested product is unavailable'; end if;
    select * into v_price from public.product_prices where product_id = v_product.product_id and market = v_buyer.assigned_market and is_active = true;
    if not found then raise exception 'No active market price is available'; end if;
    if v_quantity < v_price.moq or mod(v_quantity, v_price.moq) <> 0 then raise exception 'Quantity must meet MOQ'; end if;
    v_unit_price := round(v_price.wholesale_price * (1 - v_buyer.discount_rate / 100), 2);
    v_subtotal := v_unit_price * v_quantity;
    v_total := v_total + v_subtotal;
    v_quantity_total := v_quantity_total + v_quantity;
  end loop;

  insert into public.quote_requests (
    reference, buyer_id, buyer_company_name, buyer_language, shipping_country,
    contact_name, contact_email, currency, status, total_items, total_quantity,
    estimated_total, request_memo
  ) values (
    'INQ-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_buyer.id, v_buyer.company_name, v_buyer.preferred_language, p_shipping_country,
    p_contact_name, p_contact_email, v_buyer.currency, 'requested', jsonb_array_length(p_items),
    v_quantity_total, v_total, coalesce(p_request_memo, '')
  ) returning id into v_request_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where product_id = v_item->>'product_id';
    select * into v_price from public.product_prices where product_id = v_product.product_id and market = v_buyer.assigned_market and is_active = true;
    v_unit_price := round(v_price.wholesale_price * (1 - v_buyer.discount_rate / 100), 2);
    insert into public.quote_request_items (
      request_id, product_id, product_code, product_name, thumbnail_url, material,
      color, size, moq, quantity, price_snapshot, subtotal
    ) values (
      v_request_id, v_product.product_id, v_product.code, v_product.name_en,
      coalesce(v_product.image_set->>'thumb', ''), v_product.material,
      coalesce(v_item->>'color', ''), coalesce(v_item->>'size', ''), v_price.moq,
      v_quantity, v_unit_price, v_unit_price * v_quantity
    );
  end loop;
  return v_request_id;
end;
$$;

create or replace function public.respond_to_quote(p_request_id uuid, p_accepted boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_request public.quote_requests%rowtype;
begin
  select * into v_request from public.quote_requests where id = p_request_id and buyer_id = auth.uid();
  if not found then raise exception 'Quote request not found'; end if;
  if v_request.status <> 'quoted' then raise exception 'Only a published quotation can be answered'; end if;
  update public.quotes set status = case when p_accepted then 'accepted' else 'rejected' end, accepted_at = now()
  where request_id = p_request_id and status = 'published';
  if not found then raise exception 'Published quotation not found'; end if;
  update public.quote_requests set status = case when p_accepted then 'accepted' else 'rejected' end where id = p_request_id;
end;
$$;

create or replace function public.set_quote_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_quote_request_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.quote_events(request_id, actor_id, event_type, to_status)
    values (new.id, auth.uid(), 'request_created', new.status);
  elsif old.status is distinct from new.status then
    insert into public.quote_events(request_id, actor_id, event_type, from_status, to_status)
    values (new.id, auth.uid(), 'status_changed', old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists buyer_profiles_updated_at on public.buyer_profiles;
create trigger buyer_profiles_updated_at before update on public.buyer_profiles for each row execute function public.set_quote_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_quote_updated_at();
drop trigger if exists quote_requests_updated_at on public.quote_requests;
create trigger quote_requests_updated_at before update on public.quote_requests for each row execute function public.set_quote_updated_at();
drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_quote_updated_at();
drop trigger if exists quote_requests_event on public.quote_requests;
create trigger quote_requests_event after insert or update of status on public.quote_requests for each row execute function public.record_quote_request_event();

alter table public.buyer_profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_request_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_documents enable row level security;
alter table public.quote_events enable row level security;

create policy "profiles readable by owner or admin" on public.buyer_profiles for select using (id = auth.uid() or public.is_quote_admin());
create policy "profiles created by owner" on public.buyer_profiles for insert with check (id = auth.uid() and role = 'buyer' and status = 'pending');
create policy "profiles updated by owner" on public.buyer_profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'buyer' and status = 'pending');
create policy "products public read" on public.products for select using (is_visible = true);
create policy "products admin write" on public.products for all using (public.is_quote_admin()) with check (public.is_quote_admin());
create policy "prices approved buyer read" on public.product_prices for select using (
  public.is_quote_admin() or exists (select 1 from public.buyer_profiles where id = auth.uid() and status = 'approved' and assigned_market = product_prices.market)
);
create policy "prices admin write" on public.product_prices for all using (public.is_quote_admin()) with check (public.is_quote_admin());
create policy "requests owner or admin read" on public.quote_requests for select using (buyer_id = auth.uid() or public.is_quote_admin());
create policy "requests admin update" on public.quote_requests for update using (public.is_quote_admin()) with check (public.is_quote_admin());
create policy "request items owner or admin read" on public.quote_request_items for select using (
  exists (select 1 from public.quote_requests where id = request_id and (buyer_id = auth.uid() or public.is_quote_admin()))
);
create policy "quotes owner published or admin read" on public.quotes for select using (
  public.is_quote_admin() or (status in ('published', 'accepted', 'rejected') and exists (select 1 from public.quote_requests where id = request_id and buyer_id = auth.uid()))
);
create policy "quotes admin write" on public.quotes for all using (public.is_quote_admin()) with check (public.is_quote_admin());
create policy "quote items owner published or admin read" on public.quote_items for select using (
  public.is_quote_admin() or exists (select 1 from public.quotes join public.quote_requests on quote_requests.id = quotes.request_id where quotes.id = quote_id and quotes.status in ('published', 'accepted', 'rejected') and quote_requests.buyer_id = auth.uid())
);
create policy "quote items admin write" on public.quote_items for all using (public.is_quote_admin()) with check (public.is_quote_admin());
create policy "quote documents owner published or admin read" on public.quote_documents for select using (
  public.is_quote_admin() or exists (select 1 from public.quotes join public.quote_requests on quote_requests.id = quotes.request_id where quotes.id = quote_id and quotes.status in ('published', 'accepted', 'rejected') and quote_requests.buyer_id = auth.uid())
);
create policy "quote documents admin write" on public.quote_documents for all using (public.is_quote_admin()) with check (public.is_quote_admin());
create policy "events owner or admin read" on public.quote_events for select using (
  public.is_quote_admin() or exists (select 1 from public.quote_requests where id = request_id and buyer_id = auth.uid())
);
