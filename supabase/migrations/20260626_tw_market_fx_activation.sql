-- N48: activate Taiwan/TWD for current pricing and FX operations.
-- Historical CN/CNY rows remain readable, but new CN/CNY market writes are blocked.

alter table public.buyers
  drop constraint if exists buyers_assigned_market_check,
  add constraint buyers_assigned_market_check check (assigned_market in ('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'));

alter table public.buyers
  drop constraint if exists buyers_currency_check,
  add constraint buyers_currency_check check (currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

alter table public.product_prices
  drop constraint if exists product_prices_market_check,
  add constraint product_prices_market_check check (market in ('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'));

alter table public.product_prices
  drop constraint if exists product_prices_currency_check,
  add constraint product_prices_currency_check check (currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

alter table public.inquiries
  drop constraint if exists inquiries_market_check,
  add constraint inquiries_market_check check (market in ('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'));

alter table public.inquiries
  drop constraint if exists inquiries_currency_check,
  add constraint inquiries_currency_check check (currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

alter table public.admin_quotes
  drop constraint if exists admin_quotes_currency_check,
  add constraint admin_quotes_currency_check check (currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

alter table public.catalog_files
  drop constraint if exists catalog_files_market_check,
  add constraint catalog_files_market_check check (market in ('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'));

alter table public.fx_rate_snapshots
  drop constraint if exists fx_rate_snapshots_quote_currency_check,
  add constraint fx_rate_snapshots_quote_currency_check check (quote_currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

alter table public.product_price_policies
  drop constraint if exists product_price_policies_target_market_check,
  add constraint product_price_policies_target_market_check check (target_market in ('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'));

alter table public.product_price_policies
  drop constraint if exists product_price_policies_target_currency_check,
  add constraint product_price_policies_target_currency_check check (target_currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

alter table public.product_price_policies
  drop constraint if exists product_price_policies_status_check,
  add constraint product_price_policies_status_check check (status in (
    'pending_rate',
    'active',
    'held_deadband',
    'updated',
    'created',
    'needs_input',
    'blocked_stale',
    'blocked_spike',
    'paused',
    'error'
  ));

alter table public.product_price_policies
  drop constraint if exists product_price_policies_market_currency_pair,
  add constraint product_price_policies_market_currency_pair check (
    (target_market = 'KR' and target_currency = 'KRW') or
    (target_market = 'JP' and target_currency = 'JPY') or
    (target_market = 'US' and target_currency = 'USD') or
    (target_market = 'TW' and target_currency = 'TWD') or
    (target_market = 'CN' and target_currency = 'CNY') or
    (target_market = 'GLOBAL' and target_currency = 'USD')
  );

alter table public.product_price_policies
  drop constraint if exists product_price_policies_auto_market_check,
  add constraint product_price_policies_auto_market_check check (
    pricing_mode = 'manual_fixed'
    or (pricing_mode = 'fx_auto' and target_market in ('JP', 'US', 'TW', 'CN') and source_price_id is not null)
  );

alter table public.fx_auto_price_events
  drop constraint if exists fx_auto_price_events_target_market_check,
  add constraint fx_auto_price_events_target_market_check check (target_market in ('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'));

alter table public.fx_auto_price_events
  drop constraint if exists fx_auto_price_events_target_currency_check,
  add constraint fx_auto_price_events_target_currency_check check (target_currency in ('KRW', 'JPY', 'USD', 'TWD', 'CNY'));

insert into public.product_price_policies (
  product_id,
  target_market,
  target_currency,
  pricing_mode,
  source_price_id,
  published_price_id,
  status,
  latest_source_price_updated_at
)
select
  legacy.product_id,
  'TW',
  'TWD',
  'manual_fixed',
  null,
  null,
  'needs_input',
  null
from public.product_price_policies legacy
where legacy.target_market = 'CN'
  and legacy.target_currency = 'CNY'
  and legacy.pricing_mode = 'manual_fixed'
  and not exists (
    select 1
    from public.product_price_policies existing
    where existing.product_id = legacy.product_id
      and existing.target_market = 'TW'
      and existing.target_currency = 'TWD'
  )
on conflict (product_id, target_market, target_currency) do nothing;

insert into public.product_price_policies (
  product_id,
  target_market,
  target_currency,
  pricing_mode,
  source_price_id,
  published_price_id,
  status,
  latest_source_price_updated_at
)
select
  kr.product_id,
  'TW',
  'TWD',
  'fx_auto',
  kr.id,
  null,
  'pending_rate',
  kr.updated_at
from public.product_prices kr
where kr.market = 'KR'
  and kr.currency = 'KRW'
  and not exists (
    select 1
    from public.product_price_policies existing
    where existing.product_id = kr.product_id
      and existing.target_market = 'TW'
      and existing.target_currency = 'TWD'
  )
on conflict (product_id, target_market, target_currency) do nothing;

create or replace function public.prevent_legacy_cn_cny_market_writes()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'buyers' then
    if tg_op = 'INSERT' and (new.assigned_market = 'CN' or new.currency = 'CNY') then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE'
      and ((new.assigned_market = 'CN' and old.assigned_market is distinct from new.assigned_market)
        or (new.currency = 'CNY' and old.currency is distinct from new.currency)) then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'product_prices' then
    if tg_op = 'INSERT' and (new.market = 'CN' or new.currency = 'CNY') then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE'
      and ((new.market = 'CN' and old.market is distinct from new.market)
        or (new.currency = 'CNY' and old.currency is distinct from new.currency)) then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'inquiries' then
    if tg_op = 'INSERT' and (new.market = 'CN' or new.currency = 'CNY') then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE'
      and ((new.market = 'CN' and old.market is distinct from new.market)
        or (new.currency = 'CNY' and old.currency is distinct from new.currency)) then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'admin_quotes' then
    if tg_op = 'INSERT' and new.currency = 'CNY' then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE' and new.currency = 'CNY' and old.currency is distinct from new.currency then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'catalog_files' then
    if tg_op = 'INSERT' and new.market = 'CN' then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE' and new.market = 'CN' and old.market is distinct from new.market then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'fx_rate_snapshots' then
    if tg_op = 'INSERT' and new.quote_currency = 'CNY' then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE' and new.quote_currency = 'CNY' and old.quote_currency is distinct from new.quote_currency then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'product_price_policies' then
    if tg_op = 'INSERT' and (new.target_market = 'CN' or new.target_currency = 'CNY') then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE'
      and ((new.target_market = 'CN' and old.target_market is distinct from new.target_market)
        or (new.target_currency = 'CNY' and old.target_currency is distinct from new.target_currency)) then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  elsif tg_table_name = 'fx_auto_price_events' then
    if tg_op = 'INSERT' and (new.target_market = 'CN' or new.target_currency = 'CNY') then
      raise exception 'CN/CNY writes are deprecated';
    end if;
    if tg_op = 'UPDATE'
      and ((new.target_market = 'CN' and old.target_market is distinct from new.target_market)
        or (new.target_currency = 'CNY' and old.target_currency is distinct from new.target_currency)) then
      raise exception 'CN/CNY writes are deprecated';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_legacy_cn_cny_buyers on public.buyers;
create trigger trg_prevent_legacy_cn_cny_buyers
before insert or update on public.buyers
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_product_prices on public.product_prices;
create trigger trg_prevent_legacy_cn_cny_product_prices
before insert or update on public.product_prices
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_inquiries on public.inquiries;
create trigger trg_prevent_legacy_cn_cny_inquiries
before insert or update on public.inquiries
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_admin_quotes on public.admin_quotes;
create trigger trg_prevent_legacy_cn_cny_admin_quotes
before insert or update on public.admin_quotes
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_catalog_files on public.catalog_files;
create trigger trg_prevent_legacy_cn_cny_catalog_files
before insert or update on public.catalog_files
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_fx_rate_snapshots on public.fx_rate_snapshots;
create trigger trg_prevent_legacy_cn_cny_fx_rate_snapshots
before insert or update on public.fx_rate_snapshots
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_product_price_policies on public.product_price_policies;
create trigger trg_prevent_legacy_cn_cny_product_price_policies
before insert or update on public.product_price_policies
for each row execute function public.prevent_legacy_cn_cny_market_writes();

drop trigger if exists trg_prevent_legacy_cn_cny_fx_auto_price_events on public.fx_auto_price_events;
create trigger trg_prevent_legacy_cn_cny_fx_auto_price_events
before insert or update on public.fx_auto_price_events
for each row execute function public.prevent_legacy_cn_cny_market_writes();
