-- N38-A additive draft only. Do not execute automatically.
-- Separates account lifecycle from buyer verification and adds admin RBAC.

alter table public.users
  add column if not exists account_status text;

alter table public.buyers
  add column if not exists verification_status text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.users(id),
  add column if not exists rejection_reason text,
  add column if not exists suspension_reason text,
  add column if not exists assigned_admin_id uuid references public.users(id),
  add column if not exists internal_memo text;

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  admin_role text not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null,
  effect text not null,
  reason text not null,
  granted_by uuid references public.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_account_status_check') then
    alter table public.users
      add constraint users_account_status_check check (account_status in ('active', 'blocked'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'buyers_verification_status_check') then
    alter table public.buyers
      add constraint buyers_verification_status_check check (verification_status in ('draft', 'pending', 'approved', 'rejected', 'suspended'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_profiles_admin_role_check') then
    alter table public.admin_profiles
      add constraint admin_profiles_admin_role_check check (admin_role in ('operator', 'manager', 'owner'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_permission_overrides_effect_check') then
    alter table public.admin_permission_overrides
      add constraint admin_permission_overrides_effect_check check (effect in ('allow', 'deny'));
  end if;
end $$;

create index if not exists idx_users_account_status on public.users(account_status);
create index if not exists idx_buyers_verification_status on public.buyers(verification_status);
create index if not exists idx_buyers_assigned_admin_id on public.buyers(assigned_admin_id);
create index if not exists idx_admin_permission_overrides_user on public.admin_permission_overrides(user_id);
create index if not exists idx_admin_permission_overrides_active on public.admin_permission_overrides(user_id, permission_key)
  where expires_at is null;

update public.users
set account_status = case when status = 'blocked' then 'blocked' else 'active' end
where account_status is null;

alter table public.users
  alter column account_status set default 'active';

alter table public.users
  alter column account_status set not null;

update public.buyers b
set verification_status = case
    when u.status = 'pending' then 'pending'
    when u.status = 'approved' then 'approved'
    when u.status = 'blocked' then 'suspended'
    else 'draft'
  end
from public.users u
where u.id = b.user_id
  and b.verification_status is null;

update public.buyers b
set submitted_at = b.created_at
where b.submitted_at is null;

update public.buyers b
set reviewed_at = u.updated_at
from public.users u
where u.id = b.user_id
  and b.reviewed_at is null
  and b.verification_status in ('approved', 'suspended');

alter table public.buyers
  alter column verification_status set default 'draft';

alter table public.buyers
  alter column verification_status set not null;

with admin_profile_state as (
  select
    exists (select 1 from public.admin_profiles) as has_any_profile,
    exists (select 1 from public.admin_profiles where admin_role = 'owner') as has_owner
),
admin_candidates as (
  select
    u.id,
    u.status,
    u.account_status,
    row_number() over (
      order by
        case when u.status = 'approved' and u.account_status = 'active' then 0 else 1 end,
        u.created_at nulls last,
        u.id
    ) as backfill_rank
  from public.users u
  where u.role = 'admin'
)
insert into public.admin_profiles (user_id, admin_role)
select admin_candidates.id,
  case
    when admin_candidates.status = 'approved'
      and admin_candidates.account_status = 'active'
      and admin_candidates.backfill_rank = 1
      and admin_profile_state.has_any_profile = false
      and admin_profile_state.has_owner = false
      then 'owner'
    else 'operator'
  end
from admin_candidates
cross join admin_profile_state
on conflict (user_id) do nothing;

do $$
begin
  if exists (
    select 1 from public.users
    where role = 'admin'
      and status = 'approved'
      and account_status = 'active'
  ) and not exists (
    select 1
    from public.users u
    join public.admin_profiles ap on ap.user_id = u.id
    where u.role = 'admin'
      and u.status = 'approved'
      and u.account_status = 'active'
      and ap.admin_role = 'owner'
  ) then
    raise exception 'Active approved admin exists but no owner admin profile is present. Run explicit admin bootstrap/recovery.';
  end if;
end $$;

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
