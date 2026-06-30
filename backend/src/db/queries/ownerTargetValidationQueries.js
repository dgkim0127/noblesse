async function hasTable(client, tableName) {
  const result = await client.query("select to_regclass($1) as table_name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function hasColumn(client, tableName, columnName) {
  const result = await client.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [tableName, columnName]
  );
  return result.rowCount > 0;
}

function accountStatusSelect(hasAccountStatus) {
  if (!hasAccountStatus) {
    return "case when u.status = 'blocked' then 'blocked' else 'active' end as account_status";
  }
  return "coalesce(u.account_status, case when u.status = 'blocked' then 'blocked' else 'active' end) as account_status";
}

function isEligibleAdmin(row) {
  return row?.role === "admin" && row?.status === "approved" && row?.account_status === "active";
}

export function createOwnerTargetValidationQueries(pool) {
  return {
    async validateTarget({ identifier }) {
      const client = await pool.connect();
      try {
        await client.query("begin transaction read only");
        const hasAccountStatus = await hasColumn(client, "users", "account_status");
        const hasAdminProfiles = await hasTable(client, "admin_profiles");
        const result = await client.query(
          `
            select
              u.email,
              u.role,
              u.status,
              ${accountStatusSelect(hasAccountStatus)},
              ${hasAdminProfiles ? "ap.admin_role" : "null::text"} as admin_role
            from public.users u
            ${hasAdminProfiles ? "left join public.admin_profiles ap on ap.user_id = u.id" : ""}
            where lower(u.email) = lower($1)
               or split_part(lower(u.email), '@', 1) = lower($1)
            order by u.created_at nulls last, u.id
          `,
          [identifier]
        );
        await client.query("commit");

        if (result.rowCount === 0) {
          return {
            ok: false,
            category: "TARGET_ACCOUNT_NOT_FOUND",
            targetFound: false,
            targetUnique: false,
            targetEligible: false,
            targetCurrentlyOwner: false,
            readOnlyTransaction: true
          };
        }
        if (result.rowCount > 1) {
          return {
            ok: false,
            category: "TARGET_ACCOUNT_AMBIGUOUS",
            targetFound: true,
            targetUnique: false,
            targetEligible: false,
            targetCurrentlyOwner: false,
            readOnlyTransaction: true
          };
        }

        const target = result.rows[0];
        const targetCurrentlyOwner = target.admin_role === "owner";
        if (targetCurrentlyOwner) {
          return {
            ok: false,
            category: "TARGET_ALREADY_OWNER",
            targetFound: true,
            targetUnique: true,
            targetEligible: true,
            targetCurrentlyOwner: true,
            readOnlyTransaction: true
          };
        }
        if (!isEligibleAdmin(target)) {
          return {
            ok: false,
            category: "UNSAFE_OWNER_TARGET",
            targetFound: true,
            targetUnique: true,
            targetEligible: false,
            targetCurrentlyOwner: false,
            readOnlyTransaction: true
          };
        }

        return {
          ok: true,
          category: "OWNER_TARGET_READY",
          targetFound: true,
          targetUnique: true,
          targetEligible: true,
          targetCurrentlyOwner: false,
          readOnlyTransaction: true,
          target: {
            email: target.email
          }
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve original failure.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
