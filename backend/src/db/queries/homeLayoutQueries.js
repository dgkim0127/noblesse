import { conflict } from "../../utils/errors.js";

function assertPool(pool) {
  if (!pool?.connect) throw new Error("PostgreSQL pool is not configured for home layout queries.");
}

function actorFrom(adminViewer = {}) {
  return {
    userId: adminViewer.userId || adminViewer.id || null,
    role: adminViewer.role || "admin",
    requestId: adminViewer.requestId || null,
    ipAddress: adminViewer.ipAddress || null,
    userAgent: adminViewer.userAgent || null
  };
}

function mapRow(row) {
  if (!row) return null;
  return {
    draftConfig: row.draft_config || {},
    publishedConfig: row.published_config || {},
    draftRevision: row.draft_revision,
    publishedRevision: row.published_revision,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
}

async function insertAudit(client, action, beforeSnapshot, afterSnapshot, actor) {
  await client.query(
    `
      insert into public.audit_logs (
        actor_user_id, actor_role, action, target_table, target_id,
        before_snapshot, after_snapshot, request_id, ip_address, user_agent
      )
      values ($1, $2, $3, 'home_page_configs', 'default', $4::jsonb, $5::jsonb, $6, $7, $8)
    `,
    [
      actor.userId,
      actor.role,
      action,
      JSON.stringify(beforeSnapshot),
      JSON.stringify(afterSnapshot),
      actor.requestId,
      actor.ipAddress,
      actor.userAgent
    ]
  );
}

async function withTransaction(pool, callback) {
  assertPool(pool);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function lockConfig(client) {
  const result = await client.query(
    "select * from public.home_page_configs where id = 'default' for update"
  );
  return result.rows[0];
}

export function createHomeLayoutQueries(pool) {
  return {
    async getLayout() {
      if (!pool?.query) throw new Error("PostgreSQL pool is not configured for home layout queries.");
      const result = await pool.query(
        "select * from public.home_page_configs where id = 'default' limit 1"
      );
      return mapRow(result.rows[0]);
    },

    async saveDraft(config, expectedRevision, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const before = await lockConfig(client);
        if (!before || before.draft_revision !== expectedRevision) {
          throw conflict("Home layout draft changed. Reload before saving again.");
        }
        const result = await client.query(
          `
            update public.home_page_configs
            set draft_config = $1::jsonb,
                draft_revision = draft_revision + 1,
                updated_by = $2,
                updated_at = now()
            where id = 'default'
            returning *
          `,
          [JSON.stringify(config), actor.userId]
        );
        const after = result.rows[0];
        await insertAudit(client, "admin.home_layout.save_draft", mapRow(before), mapRow(after), actor);
        return mapRow(after);
      });
    },

    async publish(expectedRevision, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const before = await lockConfig(client);
        if (!before || before.draft_revision !== expectedRevision) {
          throw conflict("Home layout draft changed. Reload before publishing.");
        }
        const result = await client.query(
          `
            update public.home_page_configs
            set published_config = draft_config,
                published_revision = draft_revision,
                published_by = $1,
                published_at = now(),
                updated_at = now()
            where id = 'default'
            returning *
          `,
          [actor.userId]
        );
        const after = result.rows[0];
        await insertAudit(client, "admin.home_layout.publish", mapRow(before), mapRow(after), actor);
        return mapRow(after);
      });
    },

    async resetDraft(expectedRevision, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const before = await lockConfig(client);
        if (!before || before.draft_revision !== expectedRevision) {
          throw conflict("Home layout draft changed. Reload before resetting.");
        }
        const result = await client.query(
          `
            update public.home_page_configs
            set draft_config = published_config,
                draft_revision = draft_revision + 1,
                updated_by = $1,
                updated_at = now()
            where id = 'default'
            returning *
          `,
          [actor.userId]
        );
        const after = result.rows[0];
        await insertAudit(client, "admin.home_layout.reset_draft", mapRow(before), mapRow(after), actor);
        return mapRow(after);
      });
    }
  };
}
