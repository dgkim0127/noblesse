function assertTransactionPool(pool) {
  if (!pool?.connect) {
    throw new Error("PostgreSQL pool must support transactions for staging E2E bootstrap.");
  }
}

function mapAdminStatus(row) {
  return {
    role: row?.role || null,
    status: row?.status || null
  };
}

export function createStagingE2eBootstrapQueries(pool) {
  return {
    async bootstrapAccounts({ adminIdentity, buyerEmail }) {
      assertTransactionPool(pool);

      const client = await pool.connect();
      try {
        await client.query("begin");

        const buyerUserResult = await client.query(
          `
            select id, role, status
            from public.users
            where lower(email) = lower($1)
            limit 1
            for update
          `,
          [buyerEmail]
        );
        const buyerUser = buyerUserResult.rows[0] || null;
        if (!buyerUser || buyerUser.role !== "buyer") {
          await client.query("rollback");
          return {
            ok: false,
            category: "BUYER_NOT_REGISTERED",
            buyerRegistered: false
          };
        }

        const buyerProfileResult = await client.query(
          `
            select id
            from public.buyers
            where user_id = $1
            limit 1
            for update
          `,
          [buyerUser.id]
        );
        const buyerProfile = buyerProfileResult.rows[0] || null;
        if (!buyerProfile) {
          await client.query("rollback");
          return {
            ok: false,
            category: "BUYER_NOT_REGISTERED",
            buyerRegistered: false
          };
        }

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
        const previousAdmin = mapAdminStatus(existingAdmin);
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

        const buyerResult = await client.query(
          `
            update public.users
            set status = 'approved',
                updated_at = now()
            where id = $1 and role = 'buyer'
            returning id, role, status
          `,
          [buyerUser.id]
        );
        const approvedBuyer = buyerResult.rows[0];
        if (!approvedBuyer || approvedBuyer.role !== "buyer") {
          await client.query("rollback");
          return {
            ok: false,
            category: "BUYER_NOT_REGISTERED",
            buyerRegistered: false
          };
        }

        await client.query("commit");

        return {
          ok: true,
          category: "BOOTSTRAP_COMPLETE",
          buyerRegistered: true,
          adminReady: adminUser?.role === "admin" && adminUser?.status === "approved",
          buyerApproved: approvedBuyer.status === "approved",
          adminAlreadyReady:
            previousAdmin.role === "admin" && previousAdmin.status === "approved",
          buyerAlreadyApproved: buyerUser.status === "approved"
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
