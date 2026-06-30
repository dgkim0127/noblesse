function assertTransactionPool(pool) {
  if (!pool?.connect) {
    throw new Error("PostgreSQL pool must support transactions for owner admin recovery.");
  }
}

async function hasTable(poolOrClient, tableName) {
  const result = await poolOrClient.query("select to_regclass($1) as table_name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function hasColumn(poolOrClient, tableName, columnName) {
  const result = await poolOrClient.query(
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

function accountStatusExpression(hasAccountStatus) {
  if (!hasAccountStatus) {
    return "case when u.status = 'blocked' then 'blocked' else 'active' end as account_status";
  }
  return "coalesce(u.account_status, case when u.status = 'blocked' then 'blocked' else 'active' end) as account_status";
}

function isEligibleAdmin(row) {
  return row?.role === "admin" && row?.status === "approved" && row?.account_status === "active";
}

export function createOwnerAdminRecoveryQueries(pool) {
  async function findCandidates(queryable, identifier) {
    const hasAccountStatus = await hasColumn(queryable, "users", "account_status");
    return queryable.query(
      `
        select
          u.id as user_id,
          u.auth_uid,
          u.email,
          u.role,
          u.status,
          ${accountStatusExpression(hasAccountStatus)},
          ap.admin_role
        from public.users u
        left join public.admin_profiles ap on ap.user_id = u.id
        where lower(u.email) = lower($1)
           or split_part(lower(u.email), '@', 1) = lower($1)
        order by u.created_at nulls last, u.id
      `,
      [identifier]
    );
  }

  return {
    async findOwnerRecoveryTarget({ identifier }) {
      if (!(await hasTable(pool, "admin_profiles"))) {
        return {
          ok: false,
          category: "OWNER_RECOVERY_SCHEMA_UNSUPPORTED",
          targetFound: false,
          targetUnique: false,
          targetEligible: false
        };
      }

      const result = await findCandidates(pool, identifier);
      if (result.rowCount === 0) {
        return {
          ok: false,
          category: "TARGET_ACCOUNT_NOT_FOUND",
          targetFound: false,
          targetUnique: false,
          targetEligible: false
        };
      }
      if (result.rowCount > 1) {
        return {
          ok: false,
          category: "TARGET_ACCOUNT_AMBIGUOUS",
          targetFound: true,
          targetUnique: false,
          targetEligible: false
        };
      }

      const target = result.rows[0];
      if (!isEligibleAdmin(target)) {
        return {
          ok: false,
          category: "UNSAFE_OWNER_TARGET",
          targetFound: true,
          targetUnique: true,
          targetEligible: false
        };
      }

      return {
        ok: true,
        category: "OWNER_RECOVERY_TARGET_READY",
        targetFound: true,
        targetUnique: true,
        targetEligible: true,
        target: {
          userId: target.user_id,
          email: target.email,
          authUid: target.auth_uid || null,
          adminRole: target.admin_role || null
        }
      };
    },

    async recoverOwnerRole({ targetUserId, firebaseAuthUid, recoveryReason }) {
      assertTransactionPool(pool);

      const client = await pool.connect();
      try {
        await client.query("begin");

        const hasProfiles = await hasTable(client, "admin_profiles");
        if (!hasProfiles) {
          await client.query("rollback");
          return {
            ok: false,
            category: "OWNER_RECOVERY_SCHEMA_UNSUPPORTED"
          };
        }
        const hasAuditLogs = await hasTable(client, "audit_logs");
        const hasAccountStatus = await hasColumn(client, "users", "account_status");

        const userResult = await client.query(
          `
            select
              u.id as user_id,
              u.auth_uid,
              u.role,
              u.status,
              ${accountStatusExpression(hasAccountStatus)}
            from public.users u
            where u.id = $1
            limit 1
            for update
          `,
          [targetUserId]
        );
        const user = userResult.rows[0] || null;
        if (!user || !isEligibleAdmin(user)) {
          await client.query("rollback");
          return {
            ok: false,
            category: "UNSAFE_OWNER_TARGET"
          };
        }
        if (!user.auth_uid || user.auth_uid !== firebaseAuthUid) {
          await client.query("rollback");
          return {
            ok: false,
            category: "FIREBASE_IDENTITY_MISMATCH"
          };
        }

        const profileResult = await client.query(
          "select admin_role from public.admin_profiles where user_id = $1 for update",
          [targetUserId]
        );
        const previousAdminRole = profileResult.rows[0]?.admin_role || null;

        await client.query(
          `
            insert into public.admin_profiles (user_id, admin_role)
            values ($1, 'owner')
            on conflict (user_id) do update set
              admin_role = 'owner',
              updated_at = now()
          `,
          [targetUserId]
        );

        if (hasAuditLogs) {
          await client.query(
            `
              insert into public.audit_logs (
                actor_user_id, actor_role, action, target_table, target_id,
                before_snapshot, after_snapshot, request_id
              )
              values ($1, 'system', 'admin.owner_recovery.break_glass', 'users', $5, $2::jsonb, $3::jsonb, $4)
            `,
            [
              targetUserId,
              { adminRole: previousAdminRole },
              { adminRole: "owner", reason: recoveryReason },
              `owner-recovery-${Date.now()}`,
              String(targetUserId)
            ]
          );
        }

        await client.query("commit");
        return {
          ok: true,
          category: "OWNER_ADMIN_RECOVERY_COMPLETE",
          ownerReady: true,
          ownerAlreadyReady: previousAdminRole === "owner",
          explicitAdminsManageGrant: false,
          catalogWriteGranted: false,
          otherPermissionsGranted: false,
          auditLogged: hasAuditLogs,
          transactionCommitted: true
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original failure and avoid leaking database details.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
