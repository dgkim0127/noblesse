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

const productLocales = ["kr", "en", "jp", "zh-TW"];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getLocalizedDetailMissing(row) {
  const translations = row.detail_content?.translations;
  if (!translations || typeof translations !== "object") return [];
  const keys = new Set();
  for (const locale of productLocales) {
    const localized = translations[locale];
    if (!localized || typeof localized !== "object") continue;
    for (const [key, value] of Object.entries(localized)) {
      if (hasText(value)) keys.add(key);
    }
  }
  const missing = [];
  for (const key of keys) {
    for (const locale of productLocales) {
      if (!hasText(translations[locale]?.[key])) missing.push(`detailContent.translations.${locale}.${key}`);
    }
  }
  return missing;
}

function createProductCompletion(row) {
  const languageFields = {
    kr: [row.name_ko, row.description_ko],
    en: [row.name_en, row.description_en],
    jp: [row.name_ja, row.description_ja],
    "zh-TW": [row.name_zh_tw, row.description_zh_tw]
  };
  const languages = Object.fromEntries(
    Object.entries(languageFields).map(([locale, fields]) => [locale, fields.every(hasText)])
  );
  const imageSet = row.image_set || {};
  const hasPrimaryImage = Boolean(imageSet.primary || imageSet.detail || imageSet.card || imageSet.thumb);
  const hasKrPrice = Boolean(row.has_kr_price);
  const missing = [];
  for (const [locale, complete] of Object.entries(languages)) {
    if (!complete) missing.push(`translations.${locale}`);
  }
  if (!row.category_id) missing.push("category");
  if (!hasPrimaryImage) missing.push("primaryImage");
  if (!hasKrPrice) missing.push("krPrice");
  missing.push(...getLocalizedDetailMissing(row));
  return {
    languages,
    hasCategory: Boolean(row.category_id),
    hasPrimaryImage,
    hasKrPrice,
    publishable: missing.length === 0,
    missing
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    code: row.code,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    nameJa: row.name_ja,
    nameZhTw: row.name_zh_tw,
    categoryId: row.category_id,
    categoryKey: row.category_key || null,
    categoryNameKo: row.category_name_ko,
    categoryNameEn: row.category_name_en,
    categoryNameZhTw: row.category_name_zh_tw,
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
    descriptionKo: row.description_ko,
    descriptionEn: row.description_en,
    descriptionJa: row.description_ja,
    descriptionZhTw: row.description_zh_tw,
    completion: createProductCompletion(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createProductSnapshot(row) {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.name_en,
    nameZhTw: row.name_zh_tw,
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

function getProductImageObjectKeys(imageSet = {}) {
  const keys = new Set();
  for (const image of Array.isArray(imageSet.gallery) ? imageSet.gallery : []) {
    for (const value of Object.values(image?.objectKeys || {})) {
      if (typeof value === "string" && value.startsWith("products/")) keys.add(value);
    }
    if (typeof image?.objectKey === "string" && image.objectKey.startsWith("products/")) {
      keys.add(image.objectKey);
    }
  }
  return [...keys];
}

const productSelect = `
  select
    p.id,
    p.code,
    p.name_ko,
    p.name_en,
    p.name_ja,
    p.name_zh_tw,
    p.category_id,
    c.category_id as category_key,
    c.name_ko as category_name_ko,
    c.name_en as category_name_en,
    c.name_zh_tw as category_name_zh_tw,
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
    p.description_ko,
    p.description_en,
    p.description_ja,
    p.description_zh_tw,
    exists (
      select 1
      from public.product_prices pp
      where pp.product_id = p.id
        and pp.market = 'KR'
        and pp.is_active = true
    ) as has_kr_price,
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
              or p.name_ja ilike $3
              or p.name_zh_tw ilike $3
            )
            and (
              $4::text is null
              or ($4 = 'language' and (
                nullif(trim(p.name_ko), '') is null or nullif(trim(p.description_ko), '') is null
                or nullif(trim(p.name_en), '') is null or nullif(trim(p.description_en), '') is null
                or nullif(trim(p.name_ja), '') is null or nullif(trim(p.description_ja), '') is null
                or nullif(trim(p.name_zh_tw), '') is null or nullif(trim(p.description_zh_tw), '') is null
              ))
              or ($4 = 'image' and not (
                p.image_set ? 'primary' or p.image_set ? 'detail' or p.image_set ? 'card' or p.image_set ? 'thumb'
              ))
              or ($4 = 'price' and not exists (
                select 1 from public.product_prices price_filter
                where price_filter.product_id = p.id
                  and price_filter.market = 'KR'
                  and price_filter.is_active = true
              ))
              or ($4 = 'category' and p.category_id is null)
              or ($4 = 'incomplete' and (
                p.category_id is null
                or nullif(trim(p.name_ko), '') is null or nullif(trim(p.description_ko), '') is null
                or nullif(trim(p.name_en), '') is null or nullif(trim(p.description_en), '') is null
                or nullif(trim(p.name_ja), '') is null or nullif(trim(p.description_ja), '') is null
                or nullif(trim(p.name_zh_tw), '') is null or nullif(trim(p.description_zh_tw), '') is null
                or not (p.image_set ? 'primary' or p.image_set ? 'detail' or p.image_set ? 'card' or p.image_set ? 'thumb')
                or not exists (
                  select 1 from public.product_prices price_filter
                  where price_filter.product_id = p.id
                    and price_filter.market = 'KR'
                    and price_filter.is_active = true
                )
                or exists (
                  select 1
                  from (
                    select distinct detail.detail_key
                    from unnest(array['kr', 'en', 'jp', 'zh-TW']) as source_locale(locale_key)
                    cross join lateral jsonb_each_text(
                      coalesce(p.detail_content->'translations'->source_locale.locale_key, '{}'::jsonb)
                    ) as detail(detail_key, detail_value)
                    where nullif(trim(detail.detail_value), '') is not null
                  ) as used_detail
                  where exists (
                    select 1
                    from unnest(array['kr', 'en', 'jp', 'zh-TW']) as required_locale(locale_key)
                    where nullif(trim(p.detail_content->'translations'->required_locale.locale_key->>used_detail.detail_key), '') is null
                  )
                )
              ))
            )
          order by p.sort_order asc, p.created_at desc
          limit $5 offset $6
        `,
        [
          filters.visible ?? null,
          filters.category || null,
          filters.q ? `%${filters.q}%` : null,
          filters.completion || null,
          filters.dbLimit || filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapProduct);
    },

    async getProduct(productId) {
      assertPool(pool);
      const result = await pool.query(`${productSelect} where p.id = $1 limit 1`, [productId]);
      return result.rows[0] ? mapProduct(result.rows[0]) : null;
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
              name_zh_tw,
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
              description_ja,
              description_zh_tw
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12,
              $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb, $19,
              $20, $21, $22, $23, $24, $25, $26, $27, $28
            )
            returning id
          `,
          [
            input.code,
            input.nameKo,
            input.nameEn,
            input.nameJa,
            input.nameZhTw,
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
            input.descriptionJa,
            input.descriptionZhTw
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
              name_zh_tw = coalesce($5, name_zh_tw),
              category_id = coalesce($6, category_id),
              material = coalesce($7, material),
              colors = coalesce($8::jsonb, colors),
              sizes = coalesce($9::jsonb, sizes),
              moq_default = coalesce($10, moq_default),
              lead_time = coalesce($11, lead_time),
              origin = coalesce($12, origin),
              image_set = coalesce($13::jsonb, image_set),
              image_alt = coalesce($14::jsonb, image_alt),
              taxonomy = coalesce($15::jsonb, taxonomy),
              specs = coalesce($16::jsonb, specs),
              detail_content = coalesce($17::jsonb, detail_content),
              home_placement = coalesce($18::jsonb, home_placement),
              badge = coalesce($19, badge),
              is_visible = coalesce($20, is_visible),
              is_export_available = coalesce($21, is_export_available),
              is_new = coalesce($22, is_new),
              is_best = coalesce($23, is_best),
              sort_order = coalesce($24, sort_order),
              description_ko = coalesce($25, description_ko),
              description_en = coalesce($26, description_en),
              description_ja = coalesce($27, description_ja),
              description_zh_tw = coalesce($28, description_zh_tw),
              updated_at = now()
            where id = $1
            returning id
          `,
          [
            productId,
            input.nameKo,
            input.nameEn,
            input.nameJa,
            input.nameZhTw,
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
            input.descriptionJa,
            input.descriptionZhTw
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

        if (isVisible) {
          const completion = createProductCompletion(existingRow);
          if (!completion.publishable) {
            await client.query("rollback");
            return { incomplete: true, missing: completion.missing, product: mapProduct(existingRow) };
          }
        }

        const beforeSnapshot = createProductSnapshot(existingRow);
        const updateResult = await client.query(
          `
            update public.products
            set is_visible = $2,
                updated_at = now()
            where id = $1
            returning id
          `,
          [productId, isVisible]
        );

        const updatedResult = await client.query(
          `${productSelect} where p.id = $1 limit 1`,
          [updateResult.rows[0].id]
        );
        const updatedRow = {
          ...updatedResult.rows[0],
          is_visible: isVisible
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

    async duplicateProduct(productId, code, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const originalResult = await client.query(
          `${productSelect} where p.id = $1 for update of p`,
          [productId]
        );
        const original = originalResult.rows[0];
        if (!original) {
          await client.query("rollback");
          return null;
        }
        const conflictResult = await client.query(
          "select id from public.products where code = $1 limit 1",
          [code]
        );
        if (conflictResult.rows[0]) {
          await client.query("rollback");
          return { conflict: true };
        }

        const insertResult = await client.query(
          `
            insert into public.products (
              code, name_ko, name_en, name_ja, name_zh_tw, category_id, material,
              colors, sizes, moq_default, lead_time, origin, image_set, image_alt,
              taxonomy, specs, detail_content, home_placement, badge, is_visible,
              is_export_available, is_new, is_best, sort_order,
              description_ko, description_en, description_ja, description_zh_tw
            )
            select
              $2, name_ko, name_en, name_ja, name_zh_tw, category_id, material,
              colors, sizes, moq_default, lead_time, origin, image_set, image_alt,
              taxonomy, specs, detail_content, '{}'::jsonb, badge, false,
              is_export_available, false, false, sort_order,
              description_ko, description_en, description_ja, description_zh_tw
            from public.products
            where id = $1
            returning id
          `,
          [productId, code]
        );
        const createdResult = await client.query(
          `${productSelect} where p.id = $1 limit 1`,
          [insertResult.rows[0].id]
        );
        const created = createdResult.rows[0];
        const auditResult = await client.query(
          `
            insert into public.audit_logs (
              actor_user_id, actor_role, action, target_table, target_id,
              before_snapshot, after_snapshot, request_id, ip_address, user_agent
            )
            values ($1, $2, 'admin.product.duplicate', 'products', $3, $4::jsonb, $5::jsonb, $6, $7, $8)
            returning id
          `,
          [
            actor.userId,
            actor.role,
            created.id,
            createProductSnapshot(original),
            createProductSnapshot(created),
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );
        await client.query("commit");
        return { product: mapProduct(created), auditLogId: auditResult.rows[0].id };
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

    async bulkUpdateProducts(input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `${productSelect} where p.id = any($1::uuid[]) for update of p`,
          [input.ids]
        );
        if (existingResult.rows.length !== input.ids.length) {
          const found = new Set(existingResult.rows.map((row) => row.id));
          await client.query("rollback");
          return { missingIds: input.ids.filter((id) => !found.has(id)) };
        }

        if (input.action === "publish") {
          const incomplete = existingResult.rows
            .map((row) => ({ id: row.id, code: row.code, missing: createProductCompletion(row).missing }))
            .filter((item) => item.missing.length > 0);
          if (incomplete.length > 0) {
            await client.query("rollback");
            return { incomplete };
          }
        }

        let categoryId = null;
        if (input.action === "setCategory") {
          const categoryResult = await client.query(
            "select id from public.categories where category_id = $1 limit 1",
            [input.categoryKey]
          );
          categoryId = categoryResult.rows[0]?.id || null;
          if (!categoryId) {
            await client.query("rollback");
            return { missingCategory: true };
          }
        }

        if (input.action === "setCategory") {
          await client.query(
            "update public.products set category_id = $2, updated_at = now() where id = any($1::uuid[])",
            [input.ids, categoryId]
          );
        } else {
          await client.query(
            "update public.products set is_visible = $2, updated_at = now() where id = any($1::uuid[])",
            [input.ids, input.action === "publish"]
          );
        }

        const updatedResult = await client.query(
          `${productSelect} where p.id = any($1::uuid[]) order by p.sort_order asc, p.created_at desc`,
          [input.ids]
        );
        const beforeById = new Map(existingResult.rows.map((row) => [row.id, row]));
        const auditLogIds = [];
        for (const row of updatedResult.rows) {
          const auditResult = await client.query(
            `
              insert into public.audit_logs (
                actor_user_id, actor_role, action, target_table, target_id,
                before_snapshot, after_snapshot, request_id, ip_address, user_agent
              )
              values ($1, $2, 'admin.product.bulk.update', 'products', $3, $4::jsonb, $5::jsonb, $6, $7, $8)
              returning id
            `,
            [
              actor.userId,
              actor.role,
              row.id,
              createProductSnapshot(beforeById.get(row.id)),
              createProductSnapshot(row),
              actor.requestId,
              actor.ipAddress,
              actor.userAgent
            ]
          );
          auditLogIds.push(auditResult.rows[0].id);
        }
        await client.query("commit");
        return {
          products: updatedResult.rows.map(mapProduct),
          count: updatedResult.rows.length,
          auditLogIds
        };
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
          auditLogId: auditResult.rows[0].id,
          replacedObjectKeys: getProductImageObjectKeys(existingRow.image_set)
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
