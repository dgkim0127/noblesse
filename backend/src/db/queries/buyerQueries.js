function isMissingColumnError(error) {
  return error?.code === "42703";
}

export async function getUserByAuthUid(pool, authUid) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured.");
  }

  let result;
  try {
    result = await pool.query(
      `
        select id, auth_uid, email, role, status
          , account_status
        from public.users
        where auth_uid = $1
        limit 1
      `,
      [authUid]
    );
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await pool.query(
      `
        select id, auth_uid, email, role, status
          , null::text as account_status
        from public.users
        where auth_uid = $1
        limit 1
      `,
      [authUid]
    );
  }

  return result.rows[0] || null;
}

export async function getBuyerByUserId(pool, userId) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured.");
  }

  let result;
  try {
    result = await pool.query(
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
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await pool.query(
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
          , null::text as verification_status
          , null::timestamptz as submitted_at
          , null::timestamptz as reviewed_at
          , null::text as rejection_reason
          , null::text as suspension_reason
        from public.buyers
        where user_id = $1
        limit 1
      `,
      [userId]
    );
  }

  return result.rows[0] || null;
}
