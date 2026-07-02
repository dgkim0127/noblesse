function mapBanner(row) {
  return {
    id: row.id,
    bannerId: row.banner_id,
    titleKo: row.title_ko,
    titleEn: row.title_en,
    titleJa: row.title_ja,
    subtitleKo: row.subtitle_ko,
    subtitleEn: row.subtitle_en,
    subtitleJa: row.subtitle_ja,
    desktopImageUrl: row.desktop_image_url,
    mobileImageUrl: row.mobile_image_url,
    linkType: row.link_type,
    linkValue: row.link_value,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for banner queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin banner writes.");
  }
}

function getAdminActor(adminViewer = {}) {
  return {
    userId: adminViewer.userId || adminViewer.id || null,
    role: adminViewer.role || "admin",
    requestId: adminViewer.requestId || null,
    ipAddress: adminViewer.ipAddress || null,
    userAgent: adminViewer.userAgent || null
  };
}

function createBannerSnapshot(row) {
  return {
    id: row.id,
    bannerId: row.banner_id,
    titleEn: row.title_en,
    desktopImageUrl: row.desktop_image_url,
    linkType: row.link_type,
    linkValue: row.link_value,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at
  };
}

const bannerSelect = `
  select
    id,
    banner_id,
    title_ko,
    title_en,
    title_ja,
    subtitle_ko,
    subtitle_en,
    subtitle_ja,
    desktop_image_url,
    mobile_image_url,
    link_type,
    link_value,
    is_visible,
    sort_order,
    starts_at,
    ends_at,
    created_at,
    updated_at
  from public.banners
`;

async function insertAudit(client, action, bannerId, beforeSnapshot, afterSnapshot, actor) {
  const auditResult = await client.query(
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
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
      returning id
    `,
    [
      actor.userId,
      actor.role,
      action,
      "banners",
      bannerId,
      beforeSnapshot,
      afterSnapshot,
      actor.requestId,
      actor.ipAddress,
      actor.userAgent
    ]
  );
  return auditResult.rows[0].id;
}

export async function listVisibleBanners(pool, { limit = 6 } = {}) {
  assertPool(pool);
  const result = await pool.query(
    `
      ${bannerSelect}
      where is_visible = true
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
      order by sort_order asc, created_at desc
      limit $1
    `,
    [limit]
  );
  return result.rows.map(mapBanner);
}

export function createAdminBannerQueries(pool) {
  return {
    async listBanners({ visible, q, dbLimit = 21, offset = 0 }) {
      assertPool(pool);
      const result = await pool.query(
        `
          ${bannerSelect}
          where ($1::boolean is null or is_visible = $1)
            and (
              $2::text is null
              or banner_id ilike $2
              or title_ko ilike $2
              or title_en ilike $2
              or title_ja ilike $2
            )
          order by sort_order asc, created_at desc
          limit $3 offset $4
        `,
        [visible ?? null, q ? `%${q}%` : null, dbLimit, offset]
      );
      return result.rows.map(mapBanner);
    },

    async createBanner(input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          "select id from public.banners where banner_id = $1 limit 1",
          [input.bannerId]
        );
        if (existingResult.rows[0]) {
          await client.query("rollback");
          return { conflict: "banner" };
        }

        const result = await client.query(
          `
            insert into public.banners (
              banner_id,
              title_ko,
              title_en,
              title_ja,
              subtitle_ko,
              subtitle_en,
              subtitle_ja,
              desktop_image_url,
              mobile_image_url,
              link_type,
              link_value,
              is_visible,
              sort_order,
              starts_at,
              ends_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            returning *
          `,
          [
            input.bannerId,
            input.titleKo,
            input.titleEn,
            input.titleJa,
            input.subtitleKo,
            input.subtitleEn,
            input.subtitleJa,
            input.desktopImageUrl,
            input.mobileImageUrl,
            input.linkType,
            input.linkValue,
            input.isVisible,
            input.sortOrder,
            input.startsAt,
            input.endsAt
          ]
        );
        const row = result.rows[0];
        const auditLogId = await insertAudit(
          client,
          "admin.banner.create",
          row.id,
          null,
          createBannerSnapshot(row),
          actor
        );
        await client.query("commit");
        return { banner: mapBanner(row), auditLogId };
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
    },

    async updateBanner(bannerId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(`${bannerSelect} where id = $1 for update`, [bannerId]);
        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const result = await client.query(
          `
            update public.banners
            set
              title_ko = coalesce($2, title_ko),
              title_en = coalesce($3, title_en),
              title_ja = coalesce($4, title_ja),
              subtitle_ko = coalesce($5, subtitle_ko),
              subtitle_en = coalesce($6, subtitle_en),
              subtitle_ja = coalesce($7, subtitle_ja),
              desktop_image_url = coalesce($8, desktop_image_url),
              mobile_image_url = coalesce($9, mobile_image_url),
              link_type = coalesce($10, link_type),
              link_value = coalesce($11, link_value),
              is_visible = coalesce($12, is_visible),
              sort_order = coalesce($13, sort_order),
              starts_at = coalesce($14, starts_at),
              ends_at = coalesce($15, ends_at),
              updated_at = now()
            where id = $1
            returning *
          `,
          [
            bannerId,
            input.titleKo,
            input.titleEn,
            input.titleJa,
            input.subtitleKo,
            input.subtitleEn,
            input.subtitleJa,
            input.desktopImageUrl,
            input.mobileImageUrl,
            input.linkType,
            input.linkValue,
            input.isVisible,
            input.sortOrder,
            input.startsAt,
            input.endsAt
          ]
        );
        const row = result.rows[0];
        const auditLogId = await insertAudit(
          client,
          "admin.banner.update",
          bannerId,
          createBannerSnapshot(existingRow),
          createBannerSnapshot(row),
          actor
        );
        await client.query("commit");
        return { banner: mapBanner(row), auditLogId };
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
  };
}
