function assertTransactionPool(pool) {
  if (!pool?.connect) {
    throw new Error("PostgreSQL pool must support transactions for production UAT bootstrap.");
  }
}

function mapStatus(row) {
  return {
    role: row?.role || null,
    status: row?.status || null
  };
}

export function createProductionUatBootstrapQueries(pool) {
  return {
    async bootstrapAccounts({ adminIdentity, buyerIdentity }) {
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

        const existingBuyerResult = await client.query(
          `
            select id, auth_uid, email, role, status
            from public.users
            where auth_uid = $1 or lower(email) = lower($2)
            order by case when auth_uid = $1 then 0 else 1 end
            limit 1
            for update
          `,
          [buyerIdentity.authUid, buyerIdentity.email]
        );
        const existingBuyer = existingBuyerResult.rows[0] || null;
        if (existingBuyer && existingBuyer.role !== "buyer") {
          await client.query("rollback");
          return {
            ok: false,
            category: "BUYER_ROLE_CONFLICT",
            buyerFirebaseUserFound: true,
            buyerReady: false
          };
        }

        const previousBuyer = mapStatus(existingBuyer);
        const buyerResult = existingBuyer
          ? await client.query(
              `
                update public.users
                set auth_uid = $2,
                    email = $3,
                    role = 'buyer',
                    status = 'approved',
                    updated_at = now()
                where id = $1
                returning id, role, status
              `,
              [existingBuyer.id, buyerIdentity.authUid, buyerIdentity.email]
            )
          : await client.query(
              `
                insert into public.users (auth_uid, email, role, status)
                values ($1, $2, 'buyer', 'approved')
                returning id, role, status
              `,
              [buyerIdentity.authUid, buyerIdentity.email]
            );
        const buyerUser = buyerResult.rows[0];

        const buyerProfileResult = await client.query(
          `
            insert into public.buyers (
              user_id,
              company_name,
              contact_name,
              country,
              preferred_language,
              assigned_market,
              currency,
              approved_at,
              approved_by
            )
            values ($1, $2, $3, 'KR', 'kr', 'KR', 'KRW', now(), $4)
            on conflict (user_id) do update set
              company_name = excluded.company_name,
              contact_name = excluded.contact_name,
              country = excluded.country,
              preferred_language = excluded.preferred_language,
              assigned_market = excluded.assigned_market,
              currency = excluded.currency,
              approved_at = coalesce(public.buyers.approved_at, now()),
              approved_by = coalesce(public.buyers.approved_by, excluded.approved_by),
              updated_at = now()
            returning id
          `,
          [
            buyerUser.id,
            "Noblesse Production UAT Buyer",
            "Production UAT Buyer",
            adminUser.id
          ]
        );

        await client.query("commit");

        return {
          ok: true,
          category: "PRODUCTION_UAT_BOOTSTRAP_COMPLETE",
          adminReady: adminUser?.role === "admin" && adminUser?.status === "approved",
          buyerReady: buyerUser?.role === "buyer" && buyerUser?.status === "approved",
          buyerProfileReady: Boolean(buyerProfileResult.rows[0]?.id),
          adminAlreadyReady:
            previousAdmin.role === "admin" && previousAdmin.status === "approved",
          buyerAlreadyReady:
            previousBuyer.role === "buyer" && previousBuyer.status === "approved"
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
