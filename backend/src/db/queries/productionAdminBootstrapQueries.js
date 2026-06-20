function assertTransactionPool(pool) {
  if (!pool?.connect) {
    throw new Error("PostgreSQL pool must support transactions for production admin bootstrap.");
  }
}

function mapStatus(row) {
  return {
    role: row?.role || null,
    status: row?.status || null
  };
}

export function createProductionAdminBootstrapQueries(pool) {
  return {
    async bootstrapAdmin({ adminIdentity }) {
      assertTransactionPool(pool);

      const client = await pool.connect();
      try {
        await client.query("begin");

        const existingAdminResult = await client.query(
          `
            select id, auth_uid, email, role, status
            from public.users
            where auth_uid = $1 or lower(email) = lower($2)
            order by case when auth_uid = $1 then 0 else 1 end
            limit 1
            for update
          `,
          [adminIdentity.authUid, adminIdentity.email]
        );
        const existingAdmin = existingAdminResult.rows[0] || null;
        if (existingAdmin && existingAdmin.role === "buyer") {
          await client.query("rollback");
          return {
            ok: false,
            category: "ADMIN_EMAIL_ALREADY_BUYER",
            adminReady: false
          };
        }

        const previousAdmin = mapStatus(existingAdmin);
        const adminResult = existingAdmin
          ? await client.query(
              `
                update public.users
                set auth_uid = $2,
                    email = $3,
                    role = 'admin',
                    status = 'approved',
                    updated_at = now()
                where id = $1
                returning id, role, status
              `,
              [existingAdmin.id, adminIdentity.authUid, adminIdentity.email]
            )
          : await client.query(
              `
                insert into public.users (auth_uid, email, role, status)
                values ($1, $2, 'admin', 'approved')
                returning id, role, status
              `,
              [adminIdentity.authUid, adminIdentity.email]
            );
        const adminUser = adminResult.rows[0];

        await client.query("commit");

        return {
          ok: true,
          category: "PRODUCTION_ADMIN_BOOTSTRAP_COMPLETE",
          adminReady: adminUser?.role === "admin" && adminUser?.status === "approved",
          adminAlreadyReady:
            previousAdmin.role === "admin" && previousAdmin.status === "approved",
          transactionCommitted: true
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original failure and avoid leaking database details.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
