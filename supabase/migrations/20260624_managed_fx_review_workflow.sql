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
  unique(provider, quote_currency, source_effective_at, payload_hash)
);

create table if not exists public.product_price_policies (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  target_market text not null check (target_market in ('KR', 'JP', 'US', 'CN', 'GLOBAL')),
  target_currency text not null check (target_currency in ('KRW', 'JPY', 'USD', 'CNY')),
  pricing_mode text not null check (pricing_mode in ('manual_fixed', 'fx_auto')),
  source_price_id uuid references public.product_prices(id) on delete set null,
  published_price_id uuid references public.product_prices(id) on delete set null,
  status text not null default 'pending_rate' check (status in (
    'pending_rate',
    'active',
    'held_deadband',
    'updated',
    'created',
    'blocked_stale',
    'blocked_spike',
    'paused',
    'error'
  )),
  latest_reference_wholesale_price numeric(14,2),
  latest_reference_retail_price numeric(14,2),
  latest_reference_min_order_amount numeric(14,2),
  latest_reference_rate_snapshot_id uuid references public.fx_rate_snapshots(id) on delete set null,
  last_applied_rate_snapshot_id uuid references public.fx_rate_snapshots(id) on delete set null,
  source_price_updated_at timestamptz,
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
    (target_market = 'CN' and target_currency = 'CNY') or
    (target_market = 'GLOBAL' and target_currency = 'USD')
  ),
  constraint product_price_policies_auto_market_check check (
    pricing_mode = 'manual_fixed'
    or (pricing_mode = 'fx_auto' and target_market in ('JP', 'US', 'CN') and source_price_id is not null)
  ),
  constraint product_price_policies_manual_only_market_check check (
    target_market not in ('KR', 'GLOBAL') or pricing_mode = 'manual_fixed'
  )
);

create table if not exists public.fx_auto_price_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('rate_snapshot', 'base_price_change', 'manual_recheck')),
  provider text,
  source_effective_at timestamptz,
  payload_hash text,
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
  run_id uuid references public.fx_auto_price_runs(id) on delete set null,
  policy_id uuid references public.product_price_policies(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  target_market text not null check (target_market in ('KR', 'JP', 'US', 'CN', 'GLOBAL')),
  target_currency text not null check (target_currency in ('KRW', 'JPY', 'USD', 'CNY')),
  pricing_mode text not null check (pricing_mode in ('manual_fixed', 'fx_auto')),
  action text not null check (action in (
    'reference_updated',
    'initial_created',
    'auto_updated',
    'held_deadband',
    'manual_fixed',
    'blocked_stale',
    'blocked_spike',
    'paused',
    'error'
  )),
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

create index if not exists idx_fx_rate_snapshots_quote_effective
  on public.fx_rate_snapshots(quote_currency, source_effective_at desc);

create index if not exists idx_product_price_policies_product_market
  on public.product_price_policies(product_id, target_market, target_currency);

create index if not exists idx_product_price_policies_status
  on public.product_price_policies(status, pricing_mode, target_market);

create index if not exists idx_fx_auto_price_runs_created_at
  on public.fx_auto_price_runs(created_at desc);

create index if not exists idx_fx_auto_price_events_policy_created_at
  on public.fx_auto_price_events(policy_id, created_at desc);

create index if not exists idx_fx_auto_price_events_product_created_at
  on public.fx_auto_price_events(product_id, created_at desc);
