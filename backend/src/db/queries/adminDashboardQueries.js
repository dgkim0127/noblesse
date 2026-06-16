function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin dashboard queries.");
  }
}

export function createAdminDashboardQueries(pool) {
  return {
    async getDashboardSummary() {
      assertPool(pool);
      const result = await pool.query(`
        select
          (select count(*)::int from public.inquiries) as inquiry_total,
          (select count(*)::int from public.inquiries where status = 'requested') as inquiry_requested,
          (select count(*)::int from public.inquiries where status = 'checking') as inquiry_checking,
          (select count(*)::int from public.inquiries where status = 'quoted') as inquiry_quoted,
          (select count(*)::int from public.inquiries where status = 'confirmed') as inquiry_confirmed,
          (select count(*)::int from public.inquiries where status = 'cancelled') as inquiry_cancelled,
          (select count(*)::int from public.buyers) as buyer_total,
          (select count(*)::int from public.users where role = 'buyer' and status = 'pending') as buyer_pending,
          (select count(*)::int from public.users where role = 'buyer' and status = 'approved') as buyer_approved,
          (select count(*)::int from public.users where role = 'buyer' and status = 'blocked') as buyer_blocked,
          (select count(*)::int from public.products) as product_total,
          (select count(*)::int from public.products where is_visible = true) as product_visible,
          (select count(*)::int from public.products where is_visible = false) as product_hidden
      `);
      const row = result.rows[0] || {};
      return {
        inquiries: {
          total: row.inquiry_total || 0,
          requested: row.inquiry_requested || 0,
          checking: row.inquiry_checking || 0,
          quoted: row.inquiry_quoted || 0,
          confirmed: row.inquiry_confirmed || 0,
          cancelled: row.inquiry_cancelled || 0
        },
        buyers: {
          total: row.buyer_total || 0,
          pending: row.buyer_pending || 0,
          approved: row.buyer_approved || 0,
          blocked: row.buyer_blocked || 0
        },
        products: {
          total: row.product_total || 0,
          visible: row.product_visible || 0,
          hidden: row.product_hidden || 0
        },
        manualFollowUp: {
          label: "Manual follow-up required",
          count: row.inquiry_requested || 0
        }
      };
    }
  };
}
