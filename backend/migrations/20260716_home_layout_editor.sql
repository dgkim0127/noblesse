-- Draft and published home-page composition managed by administrators.

create table if not exists public.home_page_configs (
  id text primary key default 'default' check (id = 'default'),
  draft_config jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_config) = 'object'),
  published_config jsonb not null default '{}'::jsonb check (jsonb_typeof(published_config) = 'object'),
  draft_revision integer not null default 1 check (draft_revision >= 1),
  published_revision integer not null default 1 check (published_revision >= 1),
  updated_by uuid references public.users(id) on delete set null,
  published_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

insert into public.home_page_configs (id)
values ('default')
on conflict (id) do nothing;
