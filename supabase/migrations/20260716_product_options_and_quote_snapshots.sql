alter table public.products
  add column if not exists option_groups jsonb not null default '[]'::jsonb;

alter table public.inquiry_items
  add column if not exists selected_options jsonb not null default '[]'::jsonb;

alter table public.admin_quote_items
  add column if not exists selected_options jsonb not null default '[]'::jsonb;
