-- N38-A additive draft only. Do not execute automatically.
-- Separates account lifecycle from buyer verification and adds admin RBAC.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('active', 'blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'buyer_verification_status') then
    create type public.buyer_verification_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('operator', 'manager', 'owner');
  end if;
  if not exists (select 1 from pg_type where typname = 'admin_permission_effect') then
    create type public.admin_permission_effect as enum ('allow', 'deny');
  end if;
end $$;

alter table public.users
  add column if not exists account_status public.account_status not null default 'active';

alter table public.buyers
  add column if not exists verification_status public.buyer_verification_status not null default 'draft',
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.users(id),
  add column if not exists rejection_reason text,
  add column if not exists suspension_reason text,
  add column if not exists assigned_admin_id uuid references public.users(id),
  add column if not exists internal_memo text;

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  admin_role public.admin_role not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null,
  effect public.admin_permission_effect not null,
  reason text,
  granted_by uuid references public.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create index if not exists idx_users_account_status on public.users(account_status);
create index if not exists idx_buyers_verification_status on public.buyers(verification_status);
create index if not exists idx_buyers_assigned_admin_id on public.buyers(assigned_admin_id);
create index if not exists idx_admin_permission_overrides_user on public.admin_permission_overrides(user_id);
create index if not exists idx_admin_permission_overrides_active on public.admin_permission_overrides(user_id, permission_key)
  where expires_at is null;

update public.users
set account_status = case when status = 'blocked' then 'blocked'::public.account_status else 'active'::public.account_status end
where account_status is null
   or (status = 'blocked' and account_status <> 'blocked')
   or (status <> 'blocked' and account_status <> 'active');

update public.buyers b
set verification_status = case
    when u.status = 'pending' then 'pending'::public.buyer_verification_status
    when u.status = 'approved' then 'approved'::public.buyer_verification_status
    when u.status = 'blocked' then 'suspended'::public.buyer_verification_status
    else 'draft'::public.buyer_verification_status
  end,
  submitted_at = coalesce(b.submitted_at, b.created_at),
  reviewed_at = case when u.status in ('approved', 'blocked') then coalesce(b.reviewed_at, u.updated_at) else b.reviewed_at end
from public.users u
where u.id = b.user_id;

insert into public.admin_profiles (user_id, admin_role)
select id, 'owner'::public.admin_role
from public.users
where role = 'admin'
on conflict (user_id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_admin_profiles_updated_at'
      and tgrelid = 'public.admin_profiles'::regclass
  ) then
    create trigger trg_admin_profiles_updated_at
    before update on public.admin_profiles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_admin_permission_overrides_updated_at'
      and tgrelid = 'public.admin_permission_overrides'::regclass
  ) then
    create trigger trg_admin_permission_overrides_updated_at
    before update on public.admin_permission_overrides
    for each row execute function public.set_updated_at();
  end if;
end $$;
