import { resolveAdminPermissions } from "../../auth/adminPermissions.js";

function mapOverride(row) {
  return {
    permissionKey: row.permission_key,
    effect: row.effect,
    reason: row.reason || null,
    expiresAt: row.expires_at || null
  };
}

function mapAdmin(row, overrides = []) {
  const resolved = resolveAdminPermissions({
    adminRole: row.admin_role || "operator",
    overrides
  });
  return {
    userId: row.user_id || row.id,
    authUid: row.auth_uid,
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

function mapAuditLog(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
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

  return {
    async getAdminUserByAuthUid(authUid) {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `
            select
              u.id as user_id,
              u.auth_uid,
              u.email,
              u.role,
              u.status,
              coalesce(u.account_status, case when u.status = 'blocked' then 'blocked' else 'active' end) as account_status,
              coalesce(ap.admin_role, 'operator') as admin_role,
              u.created_at,
              u.updated_at
            from public.users u
            left join public.admin_profiles ap on ap.user_id = u.id
            where u.auth_uid = $1
            limit 1
          `,
          [authUid]
        );
        if (!result.rowCount) return null;
        const overrides = await getActiveOverrides(client, result.rows[0].user_id);
        return mapAdmin(result.rows[0], overrides);
      } finally {
        client.release();
      }
    },

    async listAdmins() {
      const result = await pool.query(
        `
          select
            u.id as user_id,
            u.auth_uid,
            u.email,
            u.role,
            u.status,
            coalesce(u.account_status, case when u.status = 'blocked' then 'blocked' else 'active' end) as account_status,
            coalesce(ap.admin_role, 'operator') as admin_role,
            u.created_at,
            u.updated_at
          from public.users u
          left join public.admin_profiles ap on ap.user_id = u.id
          where u.role = 'admin'
          order by u.created_at desc
          limit 200
        `
      );
      return result.rows.map((row) => mapAdmin(row));
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
            insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_snapshot, request_id)
            values ($1, 'admin.role.update', 'user', $2, jsonb_build_object('adminRole', $3), $4)
          `,
          [adminViewer.userId, userId, adminRole, adminViewer.requestId]
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
            insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_snapshot, request_id)
            values ($1, 'admin.permission_overrides.replace', 'user', $2, jsonb_build_object('count', $3), $4)
          `,
          [adminViewer.userId, userId, overrides.length, adminViewer.requestId]
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

    async deletePermissionOverride(userId, permissionKey, adminViewer) {
      const result = await pool.query(
        `
          delete from public.admin_permission_overrides
          where user_id = $1 and permission_key = $2
          returning user_id, permission_key
        `,
        [userId, permissionKey]
      );
      if (!result.rowCount) return null;
      await pool.query(
        `
          insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_snapshot, request_id)
          values ($1, 'admin.permission_override.delete', 'user', $2, jsonb_build_object('permissionKey', $3), $4)
        `,
        [adminViewer.userId, userId, permissionKey, adminViewer.requestId]
      );
      return { userId, permissionKey };
    },

    async listAuditEntries({ limit = 50, offset = 0 } = {}) {
      const result = await pool.query(
        `
          select id, actor_user_id, action, entity_type, entity_id, request_id, created_at
          from public.audit_logs
          order by created_at desc
          limit $1 offset $2
        `,
        [limit, offset]
      );
      return result.rows.map(mapAuditLog);
    }
  };
}
