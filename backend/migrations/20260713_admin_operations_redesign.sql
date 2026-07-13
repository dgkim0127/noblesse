-- N78: administrator operations UX, multilingual catalog, and issued quote documents.

alter table public.categories
  add column if not exists name_zh_tw text;

alter table public.products
  add column if not exists name_zh_tw text,
  add column if not exists description_zh_tw text;

alter table public.products
  alter column name_en drop not null;

alter table public.admin_quotes
  add column if not exists quote_number text,
  add column if not exists valid_until date,
  add column if not exists document_locale text not null default 'en',
  add column if not exists customer_note text,
  add column if not exists current_document_id uuid,
  add column if not exists accepted_document_id uuid,
  add column if not exists decision_note text,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table public.admin_quotes
  drop constraint if exists admin_quotes_status_check,
  add constraint admin_quotes_status_check
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'cancelled'));

alter table public.admin_quotes
  drop constraint if exists admin_quotes_document_locale_check,
  add constraint admin_quotes_document_locale_check
    check (document_locale in ('kr', 'en', 'jp', 'zh-TW'));

create unique index if not exists idx_admin_quotes_quote_number
  on public.admin_quotes(quote_number)
  where quote_number is not null;

alter table public.admin_quote_items
  add column if not exists product_name text,
  add column if not exists color text,
  add column if not exists size text,
  add column if not exists item_note text;

create table if not exists public.admin_quote_documents (
  id uuid primary key default gen_random_uuid(),
  admin_quote_id uuid not null references public.admin_quotes(id) on delete cascade,
  revision integer not null check (revision > 0),
  document_locale text not null check (document_locale in ('kr', 'en', 'jp', 'zh-TW')),
  snapshot jsonb not null,
  pdf_object_key text not null,
  pdf_sha256 text not null,
  issued_by uuid references public.users(id),
  issued_at timestamptz not null default now(),
  unique(admin_quote_id, revision)
);

create table if not exists public.admin_quote_status_history (
  id uuid primary key default gen_random_uuid(),
  admin_quote_id uuid not null references public.admin_quotes(id) on delete cascade,
  document_id uuid references public.admin_quote_documents(id) on delete set null,
  from_status text,
  to_status text not null,
  actor_user_id uuid references public.users(id),
  actor_type text not null check (actor_type in ('admin', 'buyer', 'system')),
  note text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_quotes_current_document_id_fkey'
  ) then
    alter table public.admin_quotes
      add constraint admin_quotes_current_document_id_fkey
      foreign key (current_document_id) references public.admin_quote_documents(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'admin_quotes_accepted_document_id_fkey'
  ) then
    alter table public.admin_quotes
      add constraint admin_quotes_accepted_document_id_fkey
      foreign key (accepted_document_id) references public.admin_quote_documents(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_admin_quote_documents_quote_revision
  on public.admin_quote_documents(admin_quote_id, revision desc);

create index if not exists idx_admin_quote_status_history_quote_created
  on public.admin_quote_status_history(admin_quote_id, created_at asc);
