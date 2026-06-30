import { resolveAdminPermissions } from "../../auth/adminPermissions.js";

function mapOverride(row) {
  return {
    permissionKey: row.permission_key,
    effect: row.effect,
    reason: row.reason || null,
    expiresAt: row.expires_at || null
  };
}

const sensitiveAuditKeys = new Set([
  "password",
  "token",
  "idtoken",
  "accesstoken",
  "refreshtoken",
  "secret",
  "privatekey",
  "private_key",
  "databaseurl",
  "database_url",
  "connectionstring"
]);

function getChangedFields(beforeSnapshot = {}, afterSnapshot = {}) {
  const before = beforeSnapshot && typeof beforeSnapshot === "object" && !Array.isArray(beforeSnapshot)
    ? beforeSnapshot
    : {};
  const after = afterSnapshot && typeof afterSnapshot === "object" && !Array.isArray(afterSnapshot)
    ? afterSnapshot
    : {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((key) => !sensitiveAuditKeys.has(String(key).toLowerCase()))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort();
}

function mapAdmin(row, overrides = []) {
  const resolved = resolveAdminPermissions({
    adminRole: row.admin_role || "operator",
    overrides
  });
  return {
    userId: row.user_id || row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    accountStatus: row.account_status || (row.status === "blocked" ? "blocked" : "active"),
    adminRole: resolved.adminRole,
    permissions: resolved.permissions,
    deniedPermissions: resolved.deniedPermissions,
    permissionOverrides: overrides,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isMissingAccountStatusColumn(error) {
  return error?.code === "42703" && /account_status/i.test(error?.message || "");
}

function isMissingAdminProfilesTable(error) {
  return error?.code === "42P01" && /admin_profiles/i.test(error?.message || "");
}

function isMissingPermissionOverridesTable(error) {
  return error?.code === "42P01" && /admin_permission_overrides/i.test(error?.message || "");
}

function accountStatusSelect(hasAccountStatus) {
  if (!hasAccountStatus) {
    return "case when u.status = 'blocked' then 'blocked' else 'active' end as account_status";
  }
  return "coalesce(u.account_status, case when u.status = 'blocked' then 'blocked' else 'active' end) as account_status";
}

function mapAuditLog(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    actor: row.actor_user_id ? { userId: row.actor_user_id, role: row.actor_role || "admin" } : null,
    entityType: row.target_table,
    entityId: row.target_id,
    changedFields: getChangedFields(row.before_snapshot, row.after_snapshot),
    requestId: row.request_id,
    createdAt: row.created_at
  };
}

export function createAdminAccessQueries(pool) {
  async function getActiveOverrides(client, userId) {
    const result = await client.query(
      `
        select permission_key, effect, reason, expires_at
        from public.admin_permission_overrides
        where user_id = $1
          and (expires_at is null or expires_at > now())
        order by permission_key asc
      `,
      [userId]
    );
    return result.rows.map(mapOverride);
  }

  async function getActiveOverridesSafe(client, userId) {
    try {
      return await getActiveOverrides(client, userId);
    } catch (error) {
      if (!isMissingPermissionOverridesTable(error)) throw error;
      return [];
    }
  }

  async function getAdminUserByAuthUidWithAccountStatus(client, authUid, hasAccountStatus, hasAdminProfiles) {
    return client.query(
      `
        select
          u.id as user_id,
          u.auth_uid,
          u.email,
          u.role,
          u.status,
          ${accountStatusSelect(hasAccountStatus)},
          ${hasAdminProfiles ? "coalesce(ap.admin_role, 'operator')" : "'operator'"} as admin_role,
          u.created_at,
          u.updated_at
        from public.users u
        ${hasAdminProfiles ? "left join public.admin_profiles ap on ap.user_id = u.id" : ""}
        where u.auth_uid = $1
        limit 1
      `,
      [authUid]
    );
  }

  async function listAdminsWithAccountStatus(hasAccountStatus, hasAdminProfiles) {
    return pool.query(
      `
        select
          u.id as user_id,
          u.email,
          u.role,
          u.status,
          ${accountStatusSelect(hasAccountStatus)},
          ${hasAdminProfiles ? "coalesce(ap.admin_role, 'operator')" : "'operator'"} as admin_role,
          u.created_at,
          u.updated_at
        from public.users u
        ${hasAdminProfiles ? "left join public.admin_profiles ap on ap.user_id = u.id" : ""}
        where u.role = 'admin'
        order by u.created_at desc
        limit 200
      `
    );
  }

  async function queryWithOptionalAdminSurfaces(queryFn) {
    const variants = [
      { hasAccountStatus: true, hasAdminProfiles: true },
      { hasAccountStatus: false, hasAdminProfiles: true },
      { hasAccountStatus: true, hasAdminProfiles: false },
      { hasAccountStatus: false, hasAdminProfiles: false }
    ];
    let lastError;
    for (const variant of variants) {
      try {
        return await queryFn(variant);
      } catch (error) {
        if (!isMissingAccountStatusColumn(error) && !isMissingAdminProfilesTable(error)) {
          throw error;
        }
        lastError = error;
      }
    }
    throw lastError;
  }

  return {
    async getAdminUserByAuthUid(authUid) {
      const client = await pool.connect();
      try {
        const result = await queryWithOptionalAdminSurfaces(({ hasAccountStatus, hasAdminProfiles }) =>
          getAdminUserByAuthUidWithAccountStatus(client, authUid, hasAccountStatus, hasAdminProfiles)
        );
        if (!result.rowCount) return null;
        const overrides = await getActiveOverridesSafe(client, result.rows[0].user_id);
        return mapAdmin(result.rows[0], overrides);
      } finally {
        client.release();
      }
    },

    async listAdmins() {
      const adminsResult = await queryWithOptionalAdminSurfaces(({ hasAccountStatus, hasAdminProfiles }) =>
        listAdminsWithAccountStatus(hasAccountStatus, hasAdminProfiles)
      );
      if (!adminsResult.rowCount) return [];
      const userIds = adminsResult.rows.map((row) => row.user_id);
      let overridesResult;
      try {
        overridesResult = await pool.query(
          `
            select user_id, permission_key, effect, reason, expires_at
            from public.admin_permission_overrides
            where user_id = any($1::uuid[])
              and (expires_at is null or expires_at > now())
            order by user_id asc, permission_key asc
          `,
          [userIds]
        );
      } catch (error) {
        if (!isMissingPermissionOverridesTable(error)) throw error;
        overridesResult = { rows: [] };
      }
      const overridesByUserId = new Map();
      for (const row of overridesResult.rows) {
        const list = overridesByUserId.get(row.user_id) || [];
        list.push(mapOverride(row));
        overridesByUserId.set(row.user_id, list);
      }
      return adminsResult.rows.map((row) => mapAdmin(row, overridesByUserId.get(row.user_id) || []));
    },

    async updateAdminRole(userId, adminRole, adminViewer) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const ownerCount = await client.query(
          `
            select count(*)::int as count
            from public.users u
            join public.admin_profiles ap on ap.user_id = u.id
            where u.role = 'admin'
              and u.status = 'approved'
              and coalesce(u.account_status, 'active') = 'active'
              and ap.admin_role = 'owner'
          `
        );
        const current = await client.query(
          `
            select admin_role
            from public.admin_profiles
            where user_id = $1
            for update
          `,
          [userId]
        );
        if (!current.rowCount) {
          await client.query("rollback");
          return null;
        }
        if (current.rows[0].admin_role === "owner" && adminRole !== "owner" && ownerCount.rows[0].count <= 1) {
          await client.query("rollback");
          return { lastOwner: true };
        }
        const updated = await client.query(
          `
            update public.admin_profiles
            set admin_role = $2, updated_at = now()
            where user_id = $1
            returning user_id, admin_role, created_at, updated_at
          `,
          [userId, adminRole]
        );
        await client.query(
          `
            insert into public.audit_logs (
              actor_user_id, actor_role, action, target_table, target_id,
              before_snapshot, after_snapshot, request_id
            )
            values ($1, 'admin', 'admin.role.update', 'users', $2, $3::jsonb, $4::jsonb, $5)
          `,
          [
            adminViewer.userId,
            userId,
            { adminRole: current.rows[0].admin_role },
            { adminRole },
            adminViewer.requestId
          ]
        );
        await client.query("commit");
        return updated.rows[0];
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },

    async replacePermissionOverrides(userId, overrides, adminViewer) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const profile = await client.query(
          "select admin_role from public.admin_profiles where user_id = $1 for update",
          [userId]
        );
        if (!profile.rowCount) {
          await client.query("rollback");
          return null;
        }
        if (profile.rows[0].admin_role === "owner") {
          await client.query("rollback");
          return { ownerOverrideBlocked: true };
        }
        const existingOverrides = await client.query(
          `
            select permission_key, effect, reason, expires_at
            from public.admin_permission_overrides
            where user_id = $1
            order by permission_key asc
          `,
          [userId]
        );
        await client.query("delete from public.admin_permission_overrides where user_id = $1", [userId]);
        for (const override of overrides) {
          await client.query(
            `
              insert into public.admin_permission_overrides
                (user_id, permission_key, effect, reason, granted_by, expires_at)
              values ($1, $2, $3, $4, $5, $6)
            `,
            [
              userId,
              override.permissionKey,
              override.effect,
              override.reason || null,
              adminViewer.userId,
              override.expiresAt || null
            ]
          );
        }
        await client.query(
          `
            insert into public.audit_logs (
              actor_user_id, actor_role, action, target_table, target_id,
              before_snapshot, after_snapshot, request_id
            )
            values ($1, 'admin', 'admin.permission_overrides.replace', 'users', $2, $3::jsonb, $4::jsonb, $5)
          `,
          [
            adminViewer.userId,
            userId,
            { overrides: existingOverrides.rows.map(mapOverride) },
            { count: overrides.length, overrides },
            adminViewer.requestId
          ]
        );
        await client.query("commit");
        return { userId, overrides };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },

    async upsertPermissionOverride(userId, override, adminViewer) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const profile = await client.query(
          "select admin_role from public.admin_profiles where user_id = $1 for update",
          [userId]
        );
        if (!profile.rowCount) {
          await client.query("rollback");
          return null;
        }
        if (profile.rows[0].admin_role === "owner") {
          await client.query("rollback");
          return { ownerOverrideBlocked: true };
        }
        const existing = await client.query(
          `
            select permission_key, effect, reason, expires_at
            from public.admin_permission_overrides
            where user_id = $1 and permission_key = $2
            for update
          `,
          [userId, override.permissionKey]
        );
        const updated = await client.query(
          `
            insert into public.admin_permission_overrides
              (user_id, permission_key, effect, reason, granted_by, expires_at)
            values ($1, $2, $3, $4, $5, $6)
            on conflict (user_id, permission_key)
            do update set
              effect = excluded.effect,
              reason = excluded.reason,
              granted_by = excluded.granted_by,
              expires_at = excluded.expires_at,
              updated_at = now()
            returning permission_key, effect, reason, expires_at
          `,
          [
            userId,
            override.permissionKey,
            override.effect,
            override.reason,
            adminViewer.userId,
            override.expiresAt || null
          ]
        );
        await client.query(
          `
            insert into public.audit_logs (
              actor_user_id, actor_role, action, target_table, target_id,
              before_snapshot, after_snapshot, request_id
            )
            values ($1, 'admin', 'admin.permission_override.upsert', 'users', $2, $3::jsonb, $4::jsonb, $5)
          `,
          [
            adminViewer.userId,
            userId,
            { override: existing.rowCount ? mapOverride(existing.rows[0]) : null },
            { override: mapOverride(updated.rows[0]) },
            adminViewer.requestId
          ]
        );
        await client.query("commit");
        return { userId, override: mapOverride(updated.rows[0]) };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error instead of masking it.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async deletePermissionOverride(userId, permissionKey, adminViewer) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const existing = await client.query(
          `
            select user_id, permission_key, effect, reason, expires_at
            from public.admin_permission_overrides
            where user_id = $1 and permission_key = $2
            for update
          `,
          [userId, permissionKey]
        );
        if (!existing.rowCount) {
          await client.query("rollback");
          return null;
        }
        await client.query(
          "delete from public.admin_permission_overrides where user_id = $1 and permission_key = $2",
          [userId, permissionKey]
        );
        await client.query(
          `
            insert into public.audit_logs (
              actor_user_id, actor_role, action, target_table, target_id,
              before_snapshot, after_snapshot, request_id
            )
            values ($1, 'admin', 'admin.permission_override.delete', 'users', $2, $3::jsonb, $4::jsonb, $5)
          `,
          [
            adminViewer.userId,
            userId,
            { override: mapOverride(existing.rows[0]) },
            { permissionKey },
            adminViewer.requestId
          ]
        );
        await client.query("commit");
        return { userId, permissionKey };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error instead of masking it.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async listAuditEntries({ limit = 50, offset = 0, action = null, q = null } = {}) {
      const result = await pool.query(
        `
          select id, actor_user_id, actor_role, action, target_table, target_id, before_snapshot, after_snapshot, request_id, created_at
          from public.audit_logs
          where ($3::text is null or action = $3)
            and (
              $4::text is null
              or request_id ilike $4
              or target_id ilike $4
              or target_table ilike $4
            )
          order by created_at desc
          limit $1 offset $2
        `,
        [limit, offset, action, q ? `%${q}%` : null]
      );
      return result.rows.map(mapAuditLog);
    }
  };
}
