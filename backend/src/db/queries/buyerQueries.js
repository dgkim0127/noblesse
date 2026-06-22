export async function getUserByAuthUid(pool, authUid) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured.");
  }

  const result = await pool.query(
    `
      select id, auth_uid, email, role, status
        , account_status
      from public.users
      where auth_uid = $1
      limit 1
    `,
    [authUid]
  );

  return result.rows[0] || null;
}

export async function getBuyerByUserId(pool, userId) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured.");
  }

  const result = await pool.query(
    `
      select
        id,
        user_id,
        company_name,
        contact_name,
        country,
        preferred_language,
        assigned_market,
        currency,
        discount_rate,
        min_order_amount
        , verification_status
        , submitted_at
        , reviewed_at
        , rejection_reason
        , suspension_reason
      from public.buyers
      where user_id = $1
      limit 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}
