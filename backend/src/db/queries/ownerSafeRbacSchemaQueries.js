import { createHash } from "node:crypto";

const bootstrapName = "20260630_owner_safe_rbac_schema_bootstrap";
const bootstrapChecksumSeed = "owner-safe-rbac-schema-bootstrap-v1";

function assertTransactionPool(pool) {
  if (!pool?.connect) {
    throw new Error("Owner-safe RBAC bootstrap requires a transaction-capable pool.");
  }
}

function checksum() {
  return createHash("sha256").update(bootstrapChecksumSeed, "utf8").digest("hex");
}

export function getOwnerSafeRbacBootstrapMetadata() {
  return {
    migrationName: bootstrapName,
    checksum: checksum()
  };
}

async function hasTable(queryable, tableName) {
  const result = await queryable.query("select to_regclass($1) as table_name", [
    `public.${tableName}`
  ]);
  return Boolean(result.rows?.[0]?.table_name);
}

async function countIfTable(queryable, tableName) {
  if (!(await hasTable(queryable, tableName))) return 0;
  const result = await queryable.query(`select count(*)::int as count from public.${tableName}`);
  return Number(result.rows?.[0]?.count || 0);
}

async function countBuyerApprovedLegacy(queryable) {
  if (!(await hasTable(queryable, "buyers")) || !(await hasTable(queryable, "users"))) {
    return 0;
  }
  const result = await queryable.query(`
    select count(*)::int as count
    from public.buyers b
    join public.users u on u.id = b.user_id
    where u.status = 'approved'
  `);
  return Number(result.rows?.[0]?.count || 0);
}

async function countBuyerVerificationApproved(queryable) {
  if (!(await hasTable(queryable, "buyers"))) return 0;
  const result = await queryable.query(`
    select count(*)::int as count
    from public.buyers
    where verification_status = 'approved'
  `);
  return Number(result.rows?.[0]?.count || 0);
}

async function countOwners(queryable) {
  if (!(await hasTable(queryable, "admin_profiles"))) return 0;
  const result = await queryable.query(`
    select count(*)::int as count
    from public.users u
    join public.admin_profiles ap on ap.user_id = u.id
    where u.role = 'admin'
      and u.status = 'approved'
      and coalesce(u.account_status, 'active') = 'active'
      and ap.admin_role = 'owner'
  `);
  return Number(result.rows?.[0]?.count || 0);
}

async function getLedgerState(client) {
  await client.query(`
    create table if not exists public.app_schema_migrations (
      migration_name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);

  const result = await client.query(
    `
      select checksum
      from public.app_schema_migrations
      where migration_name = $1
      for update
    `,
    [bootstrapName]
  );
  return result.rows?.[0]?.checksum || null;
}

export function createOwnerSafeRbacSchemaQueries(pool) {
  assertTransactionPool(pool);

  return {
    async applyOwnerSafeBootstrap() {
      const client = await pool.connect();
      const expectedChecksum = checksum();

      try {
        await client.query("begin");

        const before = {
          products: await countIfTable(client, "products"),
          categories: await countIfTable(client, "categories"),
          productPrices: await countIfTable(client, "product_prices"),
          buyerApproved: await countBuyerApprovedLegacy(client),
          owners: await countOwners(client)
        };

        if (before.owners !== 0) {
          await client.query("rollback");
          return {
            ok: false,
            category: "OWNER_ALREADY_EXISTS_BEFORE_BOOTSTRAP",
            transactionCommitted: false
          };
        }

        const existingChecksum = await getLedgerState(client);
        if (existingChecksum && existingChecksum !== expectedChecksum) {
          await client.query("rollback");
          return {
            ok: false,
            category: "OWNER_SAFE_BOOTSTRAP_CHECKSUM_MISMATCH",
            transactionCommitted: false
          };
        }

        await client.query("alter table public.users add column if not exists account_status text");
        await client.query(`
          alter table public.buyers
            add column if not exists verification_status text,
            add column if not exists submitted_at timestamptz,
            add column if not exists reviewed_at timestamptz,
            add column if not exists reviewed_by uuid references public.users(id),
            add column if not exists rejection_reason text,
            add column if not exists suspension_reason text,
            add column if not exists assigned_admin_id uuid references public.users(id),
            add column if not exists internal_memo text
        `);
        await client.query(`
          create table if not exists public.admin_profiles (
            user_id uuid primary key references public.users(id) on delete cascade,
            admin_role text not null default 'operator',
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          )
        `);
        await client.query(`
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
          )
        `);
        await client.query(`
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
          end $$
        `);
        await client.query("create index if not exists idx_users_account_status on public.users(account_status)");
        await client.query("create index if not exists idx_buyers_verification_status on public.buyers(verification_status)");
        await client.query("create index if not exists idx_buyers_assigned_admin_id on public.buyers(assigned_admin_id)");
        await client.query("create index if not exists idx_admin_permission_overrides_user on public.admin_permission_overrides(user_id)");
        await client.query(`
          create index if not exists idx_admin_permission_overrides_active
            on public.admin_permission_overrides(user_id, permission_key)
            where expires_at is null
        `);

        const usersBackfill = await client.query(`
          update public.users
          set account_status = case when status = 'blocked' then 'blocked' else 'active' end
          where account_status is null
        `);
        await client.query("alter table public.users alter column account_status set default 'active'");
        await client.query("alter table public.users alter column account_status set not null");

        const buyerVerificationBackfill = await client.query(`
          update public.buyers b
          set verification_status = case
              when u.status = 'pending' then 'pending'
              when u.status = 'approved' then 'approved'
              when u.status = 'blocked' then 'suspended'
              else 'draft'
            end
          from public.users u
          where u.id = b.user_id
            and b.verification_status is null
        `);
        const buyerSubmittedBackfill = await client.query(`
          update public.buyers b
          set submitted_at = b.created_at
          where b.submitted_at is null
        `);
        const buyerReviewedBackfill = await client.query(`
          update public.buyers b
          set reviewed_at = u.updated_at
          from public.users u
          where u.id = b.user_id
            and b.reviewed_at is null
            and b.verification_status in ('approved', 'suspended')
        `);
        await client.query("alter table public.buyers alter column verification_status set default 'draft'");
        await client.query("alter table public.buyers alter column verification_status set not null");
        await client.query(`
          create or replace function public.set_updated_at()
          returns trigger
          language plpgsql
          as $$
          begin
            new.updated_at = now();
            return new;
          end;
          $$
        `);
        await client.query(`
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
          end $$
        `);

        if (!existingChecksum) {
          await client.query(
            `
              insert into public.app_schema_migrations (migration_name, checksum)
              values ($1, $2)
            `,
            [bootstrapName, expectedChecksum]
          );
        }

        const after = {
          products: await countIfTable(client, "products"),
          categories: await countIfTable(client, "categories"),
          productPrices: await countIfTable(client, "product_prices"),
          buyerApproved: await countBuyerVerificationApproved(client),
          owners: await countOwners(client),
          adminProfiles: await countIfTable(client, "admin_profiles"),
          permissionOverrides: await countIfTable(client, "admin_permission_overrides")
        };

        if (after.owners !== 0) {
          await client.query("rollback");
          return {
            ok: false,
            category: "UNEXPECTED_OWNER_CREATED",
            transactionCommitted: false
          };
        }
        if (
          after.products !== before.products ||
          after.categories !== before.categories ||
          after.productPrices !== before.productPrices
        ) {
          await client.query("rollback");
          return {
            ok: false,
            category: "UNEXPECTED_PRODUCT_MUTATION",
            transactionCommitted: false
          };
        }
        if (after.buyerApproved !== before.buyerApproved) {
          await client.query("rollback");
          return {
            ok: false,
            category: "UNEXPECTED_BUYER_APPROVAL_MUTATION",
            transactionCommitted: false
          };
        }

        await client.query("commit");
        return {
          ok: true,
          category: "OWNER_SAFE_RBAC_SCHEMA_BOOTSTRAP_COMPLETE",
          alreadyApplied: Boolean(existingChecksum),
          migrationName: bootstrapName,
          userLifecycleBackfillCount: usersBackfill.rowCount || 0,
          buyerVerificationBackfillCount: buyerVerificationBackfill.rowCount || 0,
          buyerSubmittedBackfillCount: buyerSubmittedBackfill.rowCount || 0,
          buyerReviewedBackfillCount: buyerReviewedBackfill.rowCount || 0,
          adminProfileCount: after.adminProfiles,
          permissionOverrideCount: after.permissionOverrides,
          ownerCount: after.owners,
          productCount: after.products,
          categoryCount: after.categories,
          priceBookCount: after.productPrices,
          buyerApprovalUnchanged: true,
          productCatalogUnchanged: true,
          transactionCommitted: true
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original sanitized failure.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
