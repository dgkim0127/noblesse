-- Noblesse Piercing Supabase RLS policy draft.
-- Review and harden before production. This file does not connect the app to Supabase.
-- Client-side price values are never trusted.
-- Request Quote creation should eventually use a trusted RPC, Edge Function, or API transaction.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_uid = auth.uid()::text
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = public.current_app_user_id()
      and role = 'admin'
  )
$$;

create or replace function public.current_buyer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
  from public.buyers b
  join public.users u on u.id = b.user_id
  where u.id = public.current_app_user_id()
    and u.role = 'buyer'
  limit 1
$$;

create or replace function public.current_buyer_market()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select b.assigned_market
  from public.buyers b
  join public.users u on u.id = b.user_id
  where u.id = public.current_app_user_id()
    and u.role = 'buyer'
    and u.status = 'approved'
  limit 1
$$;

create or replace function public.is_approved_buyer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.buyers b on b.user_id = u.id
    where u.id = public.current_app_user_id()
      and u.role = 'buyer'
      and u.status = 'approved'
  )
$$;

alter table public.users enable row level security;
alter table public.buyers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_items enable row level security;
alter table public.admin_quotes enable row level security;
alter table public.admin_quote_items enable row level security;
alter table public.banners enable row level security;
alter table public.catalog_files enable row level security;
alter table public.terms_versions enable row level security;
alter table public.buyer_agreements enable row level security;

-- terms_versions stores active agreement text for:
-- terms_of_service, buyer_terms, privacy_collection_use, marketing_updates, privacy_policy.
-- Public read is limited to active versions so RegisterPage can show current documents.
-- Writes remain admin-only.

drop policy if exists "users read own or admin" on public.users;
create policy "users read own or admin"
on public.users for select
using (id = public.current_app_user_id() or public.is_admin());

drop policy if exists "users admin write" on public.users;
create policy "users admin write"
on public.users for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "buyers read own or admin" on public.buyers;
create policy "buyers read own or admin"
on public.buyers for select
using (id = public.current_buyer_id() or public.is_admin());

drop policy if exists "buyers admin write" on public.buyers;
create policy "buyers admin write"
on public.buyers for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categories public visible read" on public.categories;
create policy "categories public visible read"
on public.categories for select
using (is_visible = true or public.is_admin());

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products public visible read" on public.products;
create policy "products public visible read"
on public.products for select
using (is_visible = true or public.is_admin());

drop policy if exists "products admin write" on public.products;
create policy "products admin write"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product prices approved market read" on public.product_prices;
create policy "product prices approved market read"
on public.product_prices for select
using (
  public.is_admin()
  or (
    public.is_approved_buyer()
    and is_active = true
    and visible_to = 'approved_only'
    and market = public.current_buyer_market()
  )
);

drop policy if exists "product prices admin write" on public.product_prices;
create policy "product prices admin write"
on public.product_prices for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "collections public visible read" on public.collections;
create policy "collections public visible read"
on public.collections for select
using (is_visible = true or public.is_admin());

drop policy if exists "collections admin write" on public.collections;
create policy "collections admin write"
on public.collections for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product collections visible read" on public.product_collections;
create policy "product collections visible read"
on public.product_collections for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.products p
    join public.collections c on c.id = product_collections.collection_id
    where p.id = product_collections.product_id
      and p.is_visible = true
      and c.is_visible = true
  )
);

drop policy if exists "product collections admin write" on public.product_collections;
create policy "product collections admin write"
on public.product_collections for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inquiries buyer read own" on public.inquiries;
create policy "inquiries buyer read own"
on public.inquiries for select
using (buyer_id = public.current_buyer_id() or public.is_admin());

drop policy if exists "inquiries approved buyer create own" on public.inquiries;
create policy "inquiries approved buyer create own"
on public.inquiries for insert
with check (
  public.is_approved_buyer()
  and buyer_id = public.current_buyer_id()
  and market = public.current_buyer_market()
);

drop policy if exists "inquiries admin write" on public.inquiries;
create policy "inquiries admin write"
on public.inquiries for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inquiry items buyer read own" on public.inquiry_items;
create policy "inquiry items buyer read own"
on public.inquiry_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.inquiries i
    where i.id = inquiry_items.inquiry_id
      and i.buyer_id = public.current_buyer_id()
  )
);

-- Browser inserts into inquiry_items should be replaced by trusted RPC/API validation.
-- If temporary direct insert is needed, keep this policy narrow and remove it after RPC is ready.
drop policy if exists "inquiry items approved buyer create own draft" on public.inquiry_items;
create policy "inquiry items approved buyer create own draft"
on public.inquiry_items for insert
with check (
  public.is_approved_buyer()
  and exists (
    select 1
    from public.inquiries i
    where i.id = inquiry_items.inquiry_id
      and i.buyer_id = public.current_buyer_id()
      and i.status = 'requested'
  )
);

drop policy if exists "inquiry items admin write" on public.inquiry_items;
create policy "inquiry items admin write"
on public.inquiry_items for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin quotes buyer read own" on public.admin_quotes;
create policy "admin quotes buyer read own"
on public.admin_quotes for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.inquiries i
    where i.id = admin_quotes.inquiry_id
      and i.buyer_id = public.current_buyer_id()
  )
);

drop policy if exists "admin quotes admin write" on public.admin_quotes;
create policy "admin quotes admin write"
on public.admin_quotes for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin quote items buyer read own" on public.admin_quote_items;
create policy "admin quote items buyer read own"
on public.admin_quote_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.admin_quotes aq
    join public.inquiries i on i.id = aq.inquiry_id
    where aq.id = admin_quote_items.admin_quote_id
      and i.buyer_id = public.current_buyer_id()
  )
);

drop policy if exists "admin quote items admin write" on public.admin_quote_items;
create policy "admin quote items admin write"
on public.admin_quote_items for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "banners public visible read" on public.banners;
create policy "banners public visible read"
on public.banners for select
using (is_visible = true or public.is_admin());

drop policy if exists "banners admin write" on public.banners;
create policy "banners admin write"
on public.banners for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "catalog files public or approved read" on public.catalog_files;
create policy "catalog files public or approved read"
on public.catalog_files for select
using (
  public.is_admin()
  or visible_to = 'public'
  or (
    visible_to = 'approved_only'
    and public.is_approved_buyer()
    and market = public.current_buyer_market()
  )
);

drop policy if exists "catalog files admin write" on public.catalog_files;
create policy "catalog files admin write"
on public.catalog_files for all
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'terms_versions'
      and policyname = 'terms versions active public read'
  ) then
    execute 'create policy "terms versions active public read"
      on public.terms_versions for select
      using (is_active = true or public.is_admin())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'terms_versions'
      and policyname = 'terms versions admin write'
  ) then
    execute 'create policy "terms versions admin write"
      on public.terms_versions for all
      using (public.is_admin())
      with check (public.is_admin())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'buyer_agreements'
      and policyname = 'buyer agreements read own or admin'
  ) then
    execute 'create policy "buyer agreements read own or admin"
      on public.buyer_agreements for select
      using (buyer_id = public.current_buyer_id() or public.is_admin())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'buyer_agreements'
      and policyname = 'buyer agreements admin write'
  ) then
    execute 'create policy "buyer agreements admin write"
      on public.buyer_agreements for all
      using (public.is_admin())
      with check (public.is_admin())';
  end if;
end;
$$;

-- Browser direct insert into buyer_agreements is intentionally not enabled here.
-- Production registration should record required agreement versions through a trusted API/RPC
-- after validating terms_of_service, buyer_terms, and privacy_collection_use acceptance.
-- marketing_updates is optional and privacy_policy is a reference document, not a required checkbox.
-- The trusted layer should also validate client identity, IP handling, user agent handling,
-- and active agreement versions before writing buyer_agreements.
