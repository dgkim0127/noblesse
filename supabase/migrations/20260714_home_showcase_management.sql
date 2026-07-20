-- Administrator-managed home snap carousel.

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

create index if not exists idx_home_showcase_slides_public_order
  on public.home_showcase_slides(is_active, sort_order, created_at);
