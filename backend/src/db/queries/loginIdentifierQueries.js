function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function createLoginIdentifierQueries(pool) {
  return {
    async findActiveLoginEmailByIdentifier(identifier) {
      if (!pool) {
        throw new Error("PostgreSQL pool is not configured.");
      }

      const normalized = normalizeIdentifier(identifier);
      const result = await pool.query(
        `
          select email
          from public.users
          where lower(split_part(email, '@', 1)) = $1
            and email is not null
            and role in ('admin', 'buyer')
            and (
              (role = 'admin' and status = 'approved')
              or (role = 'buyer' and status in ('pending', 'approved'))
            )
            and coalesce(account_status, 'active') = 'active'
          order by email asc
          limit 2
        `,
        [normalized]
      );

      if (result.rows.length !== 1) return null;
      return result.rows[0].email;
    }
  };
}
