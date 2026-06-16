function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin inquiry queries.");
  }
}

function mapInquiry(row) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email || null,
    country: row.country,
    market: row.market,
    currency: row.currency,
    status: row.status,
    adminMemo: row.admin_memo,
    totalItems: row.total_items,
    totalQuantity: row.total_quantity,
    estimatedTotal: row.estimated_total,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createAdminInquiryQueries(pool) {
  return {
    async listInquiries(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            i.id,
            i.inquiry_number,
            b.company_name,
            b.contact_name,
            u.email,
            b.country,
            i.market,
            i.currency,
            i.status,
            i.admin_memo,
            count(ii.id)::int as total_items,
            coalesce(sum(ii.quantity), 0)::int as total_quantity,
            i.estimated_total,
            i.created_at,
            i.updated_at
          from public.inquiries i
          left join public.buyers b on b.id = i.buyer_id
          left join public.users u on u.id = b.user_id
          left join public.inquiry_items ii on ii.inquiry_id = i.id
          where ($1::text is null or i.status = $1)
            and ($2::text is null or i.market = $2)
            and (
              $3::text is null
              or i.inquiry_number ilike $3
              or b.company_name ilike $3
            )
          group by i.id, b.company_name, b.contact_name, u.email, b.country
          order by i.created_at desc
          limit $4 offset $5
        `,
        [
          filters.status || null,
          filters.market || null,
          filters.q ? `%${filters.q}%` : null,
          filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapInquiry);
    },

    async getInquiryById(inquiryId) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            i.id,
            i.inquiry_number,
            i.status,
            i.market,
            i.currency,
            i.request_memo,
            i.admin_memo,
            i.estimated_total,
            i.created_at,
            i.updated_at,
            b.id as buyer_id,
            b.company_name,
            b.contact_name,
            u.email,
            b.country,
            b.preferred_language,
            b.assigned_market,
            u.status as buyer_status
          from public.inquiries i
          left join public.buyers b on b.id = i.buyer_id
          left join public.users u on u.id = b.user_id
          where i.id = $1
          limit 1
        `,
        [inquiryId]
      );
      if (!result.rows[0]) return null;
      const row = result.rows[0];
      return {
        inquiry: mapInquiry(row),
        buyer: {
          id: row.buyer_id,
          companyName: row.company_name,
          contactName: row.contact_name,
          email: row.email || null,
          country: row.country,
          preferredLanguage: row.preferred_language,
          assignedMarket: row.assigned_market,
          status: row.buyer_status
        },
        items: []
      };
    },

    async updateInquiryMemo() {
      assertPool(pool);
      throw new Error("Real admin memo writes are not implemented in the mock-only skeleton.");
    }
  };
}
