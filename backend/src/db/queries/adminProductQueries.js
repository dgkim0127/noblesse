function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin product queries.");
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
    isVisible: row.is_visible,
    isExportAvailable: row.is_export_available,
    isNew: row.is_new,
    isBest: row.is_best,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createAdminProductQueries(pool) {
  return {
    async listProducts(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            p.id,
            p.code,
            p.name_ko,
            p.name_en,
            p.name_ja,
            p.category_id,
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
            p.is_visible,
            p.is_export_available,
            p.is_new,
            p.is_best,
            p.sort_order,
            p.created_at,
            p.updated_at
          from public.products p
          left join public.categories c on c.id = p.category_id
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
          filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapProduct);
    }
  };
}
