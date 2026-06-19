function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin category queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin category writes.");
  }
}

function mapCategory(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    nameJa: row.name_ja,
    slug: row.slug,
    coverUrl: row.cover_url,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createCategorySnapshot(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    nameEn: row.name_en,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at
  };
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

const categorySelect = `
  select
    id,
    category_id,
    name_ko,
    name_en,
    name_ja,
    slug,
    cover_url,
    is_visible,
    sort_order,
    created_at,
    updated_at
  from public.categories
`;

async function insertAudit(client, action, categoryId, beforeSnapshot, afterSnapshot, actor) {
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
      "categories",
      categoryId,
      beforeSnapshot,
      afterSnapshot,
      actor.requestId,
      actor.ipAddress,
      actor.userAgent
    ]
  );
  return auditResult.rows[0].id;
}

export function createAdminCategoryQueries(pool) {
  return {
    async listCategories(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          ${categorySelect}
          where ($1::boolean is null or is_visible = $1)
            and (
              $2::text is null
              or category_id ilike $2
              or slug ilike $2
              or name_ko ilike $2
              or name_en ilike $2
              or name_ja ilike $2
            )
          order by sort_order asc, created_at desc
          limit $3 offset $4
        `,
        [
          filters.visible ?? null,
          filters.q ? `%${filters.q}%` : null,
          filters.dbLimit || filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapCategory);
    },

    async createCategory(input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          "select id from public.categories where category_id = $1 or slug = $2 limit 1",
          [input.categoryId, input.slug]
        );
        if (existingResult.rows[0]) {
          await client.query("rollback");
          return { conflict: "category" };
        }

        const insertResult = await client.query(
          `
            insert into public.categories (
              category_id,
              name_ko,
              name_en,
              name_ja,
              slug,
              cover_url,
              is_visible,
              sort_order
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning *
          `,
          [
            input.categoryId,
            input.nameKo,
            input.nameEn,
            input.nameJa,
            input.slug,
            input.coverUrl,
            input.isVisible,
            input.sortOrder
          ]
        );
        const row = insertResult.rows[0];
        const auditLogId = await insertAudit(
          client,
          "admin.category.create",
          row.id,
          null,
          createCategorySnapshot(row),
          actor
        );

        await client.query("commit");
        return { category: mapCategory(row), auditLogId };
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

    async updateCategory(categoryId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `${categorySelect} where id = $1 for update`,
          [categoryId]
        );
        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const updateResult = await client.query(
          `
            update public.categories
            set
              name_ko = coalesce($2, name_ko),
              name_en = coalesce($3, name_en),
              name_ja = coalesce($4, name_ja),
              slug = coalesce($5, slug),
              cover_url = coalesce($6, cover_url),
              is_visible = coalesce($7, is_visible),
              sort_order = coalesce($8, sort_order),
              updated_at = now()
            where id = $1
            returning *
          `,
          [
            categoryId,
            input.nameKo,
            input.nameEn,
            input.nameJa,
            input.slug,
            input.coverUrl,
            input.isVisible,
            input.sortOrder
          ]
        );
        const row = updateResult.rows[0];
        const auditLogId = await insertAudit(
          client,
          "admin.category.update",
          categoryId,
          createCategorySnapshot(existingRow),
          createCategorySnapshot(row),
          actor
        );

        await client.query("commit");
        return { category: mapCategory(row), auditLogId };
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
