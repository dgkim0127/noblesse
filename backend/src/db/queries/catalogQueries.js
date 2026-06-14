function mapProduct(row) {
  return {
    id: row.id,
    code: row.code,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    nameJa: row.name_ja,
    categoryId: row.category_key,
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
    isNew: row.is_new,
    isBest: row.is_best,
    descriptionKo: row.description_ko,
    descriptionEn: row.description_en,
    descriptionJa: row.description_ja
  };
}

const visibleProductSelect = `
  select
    p.id,
    p.code,
    p.name_ko,
    p.name_en,
    p.name_ja,
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
    p.is_new,
    p.is_best,
    p.description_ko,
    p.description_en,
    p.description_ja
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.is_visible = true
`;

export async function listVisibleProducts(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured.");
  }

  const result = await pool.query(`
    ${visibleProductSelect}
    order by p.sort_order asc, p.created_at desc
  `);

  return result.rows.map(mapProduct);
}

export async function getVisibleProductByCode(pool, productCode) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured.");
  }

  const result = await pool.query(
    `
      ${visibleProductSelect}
      and p.code = $1
      limit 1
    `,
    [productCode]
  );

  return result.rows[0] ? mapProduct(result.rows[0]) : null;
}
