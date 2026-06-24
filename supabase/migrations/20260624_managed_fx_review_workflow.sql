alter table public.product_prices
  add column if not exists fx_managed boolean not null default false,
  add column if not exists fx_anchor_snapshot_id uuid,
  add column if not exists fx_last_reviewed_at timestamptz,
  add column if not exists fx_last_applied_at timestamptz;

create table if not exists public.fx_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  base_currency text not null default 'KRW' check (base_currency = 'KRW'),
  quote_currency text not null check (quote_currency in ('KRW', 'JPY', 'USD', 'CNY')),
  krw_per_unit numeric(20,8) not null check (krw_per_unit > 0),
  rate_scaled bigint not null check (rate_scaled > 0),
  source_effective_at timestamptz not null,
  fetched_at timestamptz not null,
  payload_hash text not null,
  created_at timestamptz default now(),
  unique(provider, quote_currency, source_effective_at)
);

create table if not exists public.fx_review_runs (
  id uuid primary key default gen_random_uuid(),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  threshold_bps integer not null default 200 check (threshold_bps > 0),
  snapshot_effective_at timestamptz,
  draft_count integer not null default 0 check (draft_count >= 0),
  failure_category text,
  created_at timestamptz default now()
);

create table if not exists public.fx_price_drafts (
  id uuid primary key default gen_random_uuid(),
  product_price_id uuid references public.product_prices(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  action_type text not null check (action_type in ('create', 'update')),
  target_market text not null check (target_market in ('KR', 'JP', 'US', 'CN', 'GLOBAL')),
  target_currency text not null check (target_currency in ('KRW', 'JPY', 'USD', 'CNY')),
  current_amount numeric(14,2),
  proposed_amount numeric(14,2) not null check (proposed_amount >= 0),
  anchor_rate_snapshot_id uuid references public.fx_rate_snapshots(id) on delete set null,
  current_rate_snapshot_id uuid not null references public.fx_rate_snapshots(id),
  rate_change_bps integer not null check (rate_change_bps >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'stale')),
  reason text,
  source_price_updated_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists idx_fx_price_drafts_pending_unique
  on public.fx_price_drafts(product_id, target_market, target_currency)
  where status = 'pending';

create index if not exists idx_fx_rate_snapshots_quote_effective
  on public.fx_rate_snapshots(quote_currency, source_effective_at desc);

create index if not exists idx_fx_review_runs_created_at
  on public.fx_review_runs(created_at desc);

create index if not exists idx_fx_price_drafts_status_created_at
  on public.fx_price_drafts(status, created_at desc);

create index if not exists idx_product_prices_fx_managed
  on public.product_prices(fx_managed, market, currency);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_prices_fx_anchor_snapshot_id_fkey'
  ) then
    alter table public.product_prices
      add constraint product_prices_fx_anchor_snapshot_id_fkey
      foreign key (fx_anchor_snapshot_id)
      references public.fx_rate_snapshots(id)
      on delete set null;
  end if;
end $$;
