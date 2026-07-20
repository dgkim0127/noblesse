function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for home showcase queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for home showcase writes.");
  }
}

function mapSlide(row) {
  if (!row) return null;
  return {
    id: row.id,
    internalName: row.internal_name,
    label: row.label || "",
    title: row.title || {},
    eyebrow: row.eyebrow || {},
    description: row.description || {},
    targetUrl: row.target_url,
    imageSet: row.image_set || {},
    imageAlt: row.image_alt || {},
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function snapshot(row) {
  if (!row) return null;
  return {
    id: row.id,
    internalName: row.internal_name,
    label: row.label,
    targetUrl: row.target_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    imageSet: row.image_set,
    updatedAt: row.updated_at
  };
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

const slideSelect = `
  select
    id,
    internal_name,
    label,
    title,
    eyebrow,
    description,
    target_url,
    image_set,
    image_alt,
    sort_order,
    is_active,
    created_at,
    updated_at
  from public.home_showcase_slides
`;

async function insertAudit(client, action, slideId, beforeSnapshot, afterSnapshot, actor) {
  await client.query(
    `
      insert into public.audit_logs (
        actor_user_id,
        actor_role,
        action,
        target_table,
        target_id,
        before_snapshot,
        after_snapshot,
        request_id,
        ip_address,
        user_agent
      )
      values ($1, $2, $3, 'home_showcase_slides', $4, $5::jsonb, $6::jsonb, $7, $8, $9)
    `,
    [
      actor.userId,
      actor.role,
      action,
      slideId,
      beforeSnapshot,
      afterSnapshot,
      actor.requestId,
      actor.ipAddress,
      actor.userAgent
    ]
  );
}

async function withTransaction(pool, callback) {
  assertTransactionPool(pool);
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
      // Preserve the original query error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export function createHomeShowcaseQueries(pool) {
  return {
    async listPublicSlides() {
      assertPool(pool);
      const result = await pool.query(
        `${slideSelect} where is_active = true order by sort_order asc, created_at asc`
      );
      return result.rows.map(mapSlide);
    },

    async listAdminSlides() {
      assertPool(pool);
      const result = await pool.query(
        `${slideSelect} order by sort_order asc, created_at asc`
      );
      return result.rows.map(mapSlide);
    },

    async getSlide(slideId) {
      assertPool(pool);
      const result = await pool.query(`${slideSelect} where id = $1 limit 1`, [slideId]);
      return mapSlide(result.rows[0]);
    },

    async createSlide(input, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const result = await client.query(
          `
            insert into public.home_showcase_slides (
              internal_name,
              label,
              title,
              eyebrow,
              description,
              target_url,
              image_set,
              sort_order,
              is_active,
              created_by,
              updated_by
            )
            values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8, $9, $10, $10)
            returning *
          `,
          [
            input.internalName,
            input.label || null,
            input.title,
            input.eyebrow,
            input.description,
            input.targetUrl,
            JSON.stringify({ position: input.imagePosition }),
            input.sortOrder,
            input.isActive,
            actor.userId
          ]
        );
        const row = result.rows[0];
        await insertAudit(client, "admin.home_showcase.create", row.id, null, snapshot(row), actor);
        return mapSlide(row);
      });
    },

    async updateSlide(slideId, input, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const existingResult = await client.query(
          `${slideSelect} where id = $1 for update`,
          [slideId]
        );
        const existing = existingResult.rows[0];
        if (!existing) return null;

        const result = await client.query(
          `
            update public.home_showcase_slides
            set
              internal_name = coalesce($2, internal_name),
              label = case when $3::boolean then $4 else label end,
              title = coalesce($5::jsonb, title),
              eyebrow = coalesce($6::jsonb, eyebrow),
              description = coalesce($7::jsonb, description),
              target_url = coalesce($8, target_url),
              sort_order = coalesce($9, sort_order),
              image_set = case
                when $10::boolean then jsonb_set(image_set, '{position}', $11::jsonb, true)
                else image_set
              end,
              is_active = coalesce($12, is_active),
              updated_by = $13,
              updated_at = now()
            where id = $1
            returning *
          `,
          [
            slideId,
            input.internalName,
            Object.hasOwn(input, "label"),
            input.label || null,
            input.title,
            input.eyebrow,
            input.description,
            input.targetUrl,
            input.sortOrder,
            Object.hasOwn(input, "imagePosition"),
            input.imagePosition ? JSON.stringify(input.imagePosition) : null,
            input.isActive,
            actor.userId
          ]
        );
        const row = result.rows[0];
        await insertAudit(client, "admin.home_showcase.update", slideId, snapshot(existing), snapshot(row), actor);
        return mapSlide(row);
      });
    },

    async updateSlideImage(slideId, image, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const existingResult = await client.query(
          `${slideSelect} where id = $1 for update`,
          [slideId]
        );
        const existing = existingResult.rows[0];
        if (!existing) return null;
        const result = await client.query(
          `
            update public.home_showcase_slides
            set image_set = $2::jsonb,
                image_alt = $3::jsonb,
                updated_by = $4,
                updated_at = now()
            where id = $1
            returning *
          `,
          [slideId, image.imageSet, image.imageAlt, actor.userId]
        );
        const row = result.rows[0];
        await insertAudit(client, "admin.home_showcase.image", slideId, snapshot(existing), snapshot(row), actor);
        return {
          slide: mapSlide(row),
          replacedObjectKeys: Object.values(existing.image_set?.objectKeys || {}).filter(Boolean)
        };
      });
    },

    async reorderSlides(ids, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const existingResult = await client.query(
          `${slideSelect} where id = any($1::uuid[]) for update`,
          [ids]
        );
        if (existingResult.rows.length !== ids.length) return null;
        const byId = new Map(existingResult.rows.map((row) => [row.id, row]));
        const slides = [];
        for (let index = 0; index < ids.length; index += 1) {
          const slideId = ids[index];
          const updateResult = await client.query(
            `
              update public.home_showcase_slides
              set sort_order = $2, updated_by = $3, updated_at = now()
              where id = $1
              returning *
            `,
            [slideId, index, actor.userId]
          );
          const row = updateResult.rows[0];
          await insertAudit(client, "admin.home_showcase.reorder", slideId, snapshot(byId.get(slideId)), snapshot(row), actor);
          slides.push(mapSlide(row));
        }
        return slides;
      });
    },

    async deleteSlide(slideId, adminViewer = {}) {
      const actor = actorFrom(adminViewer);
      return withTransaction(pool, async (client) => {
        const existingResult = await client.query(
          `${slideSelect} where id = $1 for update`,
          [slideId]
        );
        const existing = existingResult.rows[0];
        if (!existing) return null;
        await client.query("delete from public.home_showcase_slides where id = $1", [slideId]);
        await insertAudit(client, "admin.home_showcase.delete", slideId, snapshot(existing), null, actor);
        return {
          slide: mapSlide(existing),
          objectKeys: Object.values(existing.image_set?.objectKeys || {}).filter(Boolean)
        };
      });
    }
  };
}
