alter table public.products
  add column if not exists taxonomy jsonb not null default '{}'::jsonb,
  add column if not exists specs jsonb not null default '{}'::jsonb,
  add column if not exists detail_content jsonb not null default '{}'::jsonb,
  add column if not exists home_placement jsonb not null default '{}'::jsonb,
  add column if not exists badge text;

create index if not exists idx_products_taxonomy_gin on public.products using gin (taxonomy);
create index if not exists idx_products_home_placement_gin on public.products using gin (home_placement);
