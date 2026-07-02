function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin product queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin product visibility updates.");
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    code: row.code,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    nameJa: row.name_ja,
    categoryId: row.category_id,
    categoryKey: row.category_key || null,
    categoryNameKo: row.category_name_ko,
    categoryNameEn: row.category_name_en,
    material: row.material,
    colors: row.colors || [],
    sizes: row.sizes || [],
    moqDefault: row.moq_default,
    leadTime: row.lead_time,
    origin: row.origin,
    imageSet: row.image_set || {},
    imageAlt: row.image_alt || {},
    taxonomy: row.taxonomy || {},
    specs: row.specs || {},
    detailContent: row.detail_content || {},
    homePlacement: row.home_placement || {},
    badge: row.badge || "",
    isVisible: row.is_visible,
    isExportAvailable: row.is_export_available,
    isNew: row.is_new,
    isBest: row.is_best,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createProductSnapshot(row) {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.name_en,
    categoryId: row.category_id,
    categoryKey: row.category_key || null,
    imageSet: row.image_set || {},
    taxonomy: row.taxonomy || {},
    specs: row.specs || {},
    detailContent: row.detail_content || {},
    homePlacement: row.home_placement || {},
    badge: row.badge || "",
    isVisible: row.is_visible,
    updatedAt: row.updated_at
  };
}

const productSelect = `
  select
    p.id,
    p.code,
    p.name_ko,
    p.name_en,
    p.name_ja,
    p.category_id,
    c.category_id as category_key,
    c.name_ko as category_name_ko,
    c.name_en as category_name_en,
    p.material,
    p.colors,
    p.sizes,
    p.moq_default,
    p.lead_time,
    p.origin,
    p.image_set,
    p.image_alt,
    p.taxonomy,
    p.specs,
    p.detail_content,
    p.home_placement,
    p.badge,
    p.is_visible,
    p.is_export_available,
    p.is_new,
    p.is_best,
    p.sort_order,
    p.created_at,
    p.updated_at
  from public.products p
  left join public.categories c on c.id = p.category_id
`;

function getAdminActor(adminViewer = {}) {
  return {
    userId: adminViewer.userId || adminViewer.id || null,
    role: adminViewer.role || "admin",
    requestId: adminViewer.requestId || null,
    ipAddress: adminViewer.ipAddress || null,
    userAgent: adminViewer.userAgent || null
  };
}

export function createAdminProductQueries(pool) {
  return {
    async listProducts(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          ${productSelect}
          where ($1::boolean is null or p.is_visible = $1)
            and ($2::text is null or c.category_id = $2)
            and (
              $3::text is null
              or p.code ilike $3
              or p.name_ko ilike $3
              or p.name_en ilike $3
            )
          order by p.sort_order asc, p.created_at desc
          limit $4 offset $5
        `,
        [
          filters.visible ?? null,
          filters.category || null,
          filters.q ? `%${filters.q}%` : null,
          filters.dbLimit || filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapProduct);
    },

    async createProduct(input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          "select id from public.products where code = $1 limit 1",
          [input.code]
        );
        if (existingResult.rows[0]) {
          await client.query("rollback");
          return { conflict: "product_code" };
        }

        const categoryResult = input.categoryKey
          ? await client.query(
              "select id from public.categories where category_id = $1 limit 1",
              [input.categoryKey]
            )
          : { rows: [] };
        if (input.categoryKey && !categoryResult.rows[0]) {
          await client.query("rollback");
          return { missingCategory: true };
        }

        const insertResult = await client.query(
          `
            insert into public.products (
              code,
              name_ko,
              name_en,
              name_ja,
              category_id,
              material,
              colors,
              sizes,
              moq_default,
              lead_time,
              origin,
              image_set,
              image_alt,
              taxonomy,
              specs,
              detail_content,
              home_placement,
              badge,
              is_visible,
              is_export_available,
              is_new,
              is_best,
              sort_order,
              description_ko,
              description_en,
              description_ja
            )
            values (
              $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11,
              $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18,
              $19, $20, $21, $22, $23, $24, $25, $26
            )
            returning id
          `,
          [
            input.code,
            input.nameKo,
            input.nameEn,
            input.nameJa,
            categoryResult.rows[0]?.id || null,
            input.material,
            JSON.stringify(input.colors),
            JSON.stringify(input.sizes),
            input.moqDefault,
            input.leadTime,
            input.origin,
            JSON.stringify(input.imageSet),
            JSON.stringify(input.imageAlt),
            JSON.stringify(input.taxonomy || {}),
            JSON.stringify(input.specs || {}),
            JSON.stringify(input.detailContent || {}),
            JSON.stringify(input.homePlacement || {}),
            input.badge,
            input.isVisible,
            input.isExportAvailable,
            input.isNew,
            input.isBest,
            input.sortOrder,
            input.descriptionKo,
            input.descriptionEn,
            input.descriptionJa
          ]
        );

        const createdResult = await client.query(
          `${productSelect} where p.id = $1 limit 1`,
          [insertResult.rows[0].id]
        );
        const createdRow = createdResult.rows[0];
        const afterSnapshot = createProductSnapshot(createdRow);
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
            "admin.product.create",
            "products",
            createdRow.id,
            null,
            afterSnapshot,
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return { product: mapProduct(createdRow), auditLogId: auditResult.rows[0].id };
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

    async updateProduct(productId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `${productSelect} where p.id = $1 for update of p`,
          [productId]
        );
        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const categoryResult = input.categoryKey
          ? await client.query(
              "select id from public.categories where category_id = $1 limit 1",
              [input.categoryKey]
            )
          : { rows: [] };
        if (input.categoryKey && !categoryResult.rows[0]) {
          await client.query("rollback");
          return { missingCategory: true };
        }

        const updateResult = await client.query(
          `
            update public.products
            set
              name_ko = coalesce($2, name_ko),
              name_en = coalesce($3, name_en),
              name_ja = coalesce($4, name_ja),
              category_id = coalesce($5, category_id),
              material = coalesce($6, material),
              colors = coalesce($7::jsonb, colors),
              sizes = coalesce($8::jsonb, sizes),
              moq_default = coalesce($9, moq_default),
              lead_time = coalesce($10, lead_time),
              origin = coalesce($11, origin),
              image_set = coalesce($12::jsonb, image_set),
              image_alt = coalesce($13::jsonb, image_alt),
              taxonomy = coalesce($14::jsonb, taxonomy),
              specs = coalesce($15::jsonb, specs),
              detail_content = coalesce($16::jsonb, detail_content),
              home_placement = coalesce($17::jsonb, home_placement),
              badge = coalesce($18, badge),
              is_visible = coalesce($19, is_visible),
              is_export_available = coalesce($20, is_export_available),
              is_new = coalesce($21, is_new),
              is_best = coalesce($22, is_best),
              sort_order = coalesce($23, sort_order),
              description_ko = coalesce($24, description_ko),
              description_en = coalesce($25, description_en),
              description_ja = coalesce($26, description_ja),
              updated_at = now()
            where id = $1
            returning id
          `,
          [
            productId,
            input.nameKo,
            input.nameEn,
            input.nameJa,
            input.categoryKey ? categoryResult.rows[0]?.id : null,
            input.material,
            input.colors ? JSON.stringify(input.colors) : null,
            input.sizes ? JSON.stringify(input.sizes) : null,
            input.moqDefault,
            input.leadTime,
            input.origin,
            input.imageSet ? JSON.stringify(input.imageSet) : null,
            input.imageAlt ? JSON.stringify(input.imageAlt) : null,
            input.taxonomy ? JSON.stringify(input.taxonomy) : null,
            input.specs ? JSON.stringify(input.specs) : null,
            input.detailContent ? JSON.stringify(input.detailContent) : null,
            input.homePlacement ? JSON.stringify(input.homePlacement) : null,
            input.badge,
            input.isVisible,
            input.isExportAvailable,
            input.isNew,
            input.isBest,
            input.sortOrder,
            input.descriptionKo,
            input.descriptionEn,
            input.descriptionJa
          ]
        );
        const updatedResult = await client.query(
          `${productSelect} where p.id = $1 limit 1`,
          [updateResult.rows[0].id]
        );
        const updatedRow = updatedResult.rows[0];
        const beforeSnapshot = createProductSnapshot(existingRow);
        const afterSnapshot = createProductSnapshot(updatedRow);
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
            "admin.product.update",
            "products",
            productId,
            beforeSnapshot,
            afterSnapshot,
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return { product: mapProduct(updatedRow), auditLogId: auditResult.rows[0].id };
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

    async updateProductVisibility(productId, isVisible, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `
            ${productSelect}
            where p.id = $1 for update of p
          `,
          [productId]
        );

        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const beforeSnapshot = createProductSnapshot(existingRow);
        const updateResult = await client.query(
          `
            update public.products
            set is_visible = $2,
                updated_at = now()
            where id = $1
            returning
              id,
              code,
              name_ko,
              name_en,
              name_ja,
              category_id,
              null as category_key,
              material,
              colors,
              sizes,
              moq_default,
              lead_time,
              origin,
              image_set,
              image_alt,
              is_visible,
              is_export_available,
              is_new,
              is_best,
              sort_order,
              created_at,
              updated_at
          `,
          [productId, isVisible]
        );

        const updatedRow = {
          ...updateResult.rows[0],
          category_name_ko: existingRow.category_name_ko,
          category_name_en: existingRow.category_name_en
        };
        const afterSnapshot = createProductSnapshot(updatedRow);

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
            "admin.product.visibility.update",
            "products",
            productId,
            beforeSnapshot,
            afterSnapshot,
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          product: mapProduct(updatedRow),
          auditLogId: auditResult.rows[0].id
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error instead of masking it with rollback failure.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async updateProductImages(productId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `${productSelect} where p.id = $1 for update of p`,
          [productId]
        );
        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const updateResult = await client.query(
          `
            update public.products
            set image_set = $2::jsonb,
                image_alt = $3::jsonb,
                updated_at = now()
            where id = $1
            returning id
          `,
          [productId, JSON.stringify(input.imageSet || {}), JSON.stringify(input.imageAlt || {})]
        );
        const updatedResult = await client.query(
          `${productSelect} where p.id = $1 limit 1`,
          [updateResult.rows[0].id]
        );
        const updatedRow = updatedResult.rows[0];
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
            "admin.product.images.update",
            "products",
            productId,
            createProductSnapshot(existingRow),
            createProductSnapshot(updatedRow),
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          product: mapProduct(updatedRow),
          auditLogId: auditResult.rows[0].id
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error instead of masking it with rollback failure.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
