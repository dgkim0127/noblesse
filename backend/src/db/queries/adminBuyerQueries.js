function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin buyer queries.");
  }
}

function mapBuyer(row) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email || null,
    role: row.role,
    status: row.status,
    companyName: row.company_name,
    contactName: row.contact_name,
    country: row.country,
    preferredLanguage: row.preferred_language,
    assignedMarket: row.assigned_market,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createAdminBuyerQueries(pool) {
  return {
    async listBuyers(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            b.id,
            b.user_id,
            u.email,
            u.role,
            u.status,
            b.company_name,
            b.contact_name,
            b.country,
            b.preferred_language,
            b.assigned_market,
            b.currency,
            b.created_at,
            b.updated_at
          from public.buyers b
          join public.users u on u.id = b.user_id
          where u.role = 'buyer'
            and ($1::text is null or u.status = $1)
            and ($2::text is null or b.assigned_market = $2)
            and ($3::text is null or b.country = $3)
            and (
              $4::text is null
              or b.company_name ilike $4
              or b.contact_name ilike $4
            )
          order by b.created_at desc
          limit $5 offset $6
        `,
        [
          filters.status || null,
          filters.market || null,
          filters.country || null,
          filters.q ? `%${filters.q}%` : null,
          filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapBuyer);
    }
  };
}
