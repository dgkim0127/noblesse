function mapBuyerProfile(row) {
  return {
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    buyerId: row.buyer_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    country: row.country,
    preferredLanguage: row.preferred_language,
    assignedMarket: row.assigned_market,
    currency: row.currency
  };
}

export function createBuyerRegistrationQueries(pool) {
  return {
    async registerBuyer(identity, input, context = {}) {
      if (!pool?.connect) {
        throw new Error("PostgreSQL pool must support transactions.");
      }

      const client = await pool.connect();
      try {
        await client.query("begin");

        const existingUserResult = await client.query(
          `
            select id, auth_uid, email, role, status
            from public.users
            where auth_uid = $1 or email = $2
            order by case when auth_uid = $1 then 0 else 1 end
            limit 1
            for update
          `,
          [identity.authUid, identity.email]
        );

        const existingUser = existingUserResult.rows[0] || null;
        if (existingUser && existingUser.auth_uid !== identity.authUid) {
          await client.query("rollback");
          return { conflict: "email_in_use" };
        }
        if (existingUser && existingUser.role !== "buyer") {
          await client.query("rollback");
          return { conflict: "not_buyer" };
        }

        const userResult = existingUser
          ? await client.query(
              `
                update public.users
                set email = $2, updated_at = now()
                where id = $1
                returning id, auth_uid, email, role, status
              `,
              [existingUser.id, identity.email]
            )
          : await client.query(
              `
                insert into public.users (auth_uid, email, role, status)
                values ($1, $2, 'buyer', 'pending')
                returning id, auth_uid, email, role, status
              `,
              [identity.authUid, identity.email]
            );

        const user = userResult.rows[0];
        const buyerResult = await client.query(
          `
            insert into public.buyers (
              user_id,
              company_name,
              contact_name,
              country,
              preferred_language,
              phone,
              messenger_type,
              messenger_id,
              sales_channel,
              business_number,
              assigned_market,
              currency
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            on conflict (user_id) do update set
              company_name = excluded.company_name,
              contact_name = excluded.contact_name,
              country = excluded.country,
              preferred_language = excluded.preferred_language,
              phone = excluded.phone,
              messenger_type = excluded.messenger_type,
              messenger_id = excluded.messenger_id,
              sales_channel = excluded.sales_channel,
              business_number = excluded.business_number,
              assigned_market = excluded.assigned_market,
              currency = excluded.currency,
              updated_at = now()
            returning
              id as buyer_id,
              user_id,
              company_name,
              contact_name,
              country,
              preferred_language,
              assigned_market,
              currency
          `,
          [
            user.id,
            input.companyName,
            input.contactName,
            input.country,
            input.preferredLanguage,
            input.phone,
            input.messengerType,
            input.messengerId,
            input.salesChannel,
            input.businessNumber,
            input.assignedMarket,
            input.currency
          ]
        );

        const buyer = buyerResult.rows[0];
        if (input.agreements.length > 0) {
          const activeTermsResult = await client.query(
            `
              select distinct on (agreement_key)
                id,
                agreement_key,
                version,
                required
              from public.terms_versions
              where is_active = true
              order by agreement_key, effective_at desc, created_at desc
            `
          );
          const activeTerms = new Map(
            activeTermsResult.rows.map((row) => [row.agreement_key, row])
          );

          for (const agreement of input.agreements) {
            const activeTerm = activeTerms.get(agreement.agreementKey);
            await client.query(
              `
                insert into public.buyer_agreements (
                  buyer_id,
                  terms_version_id,
                  agreement_key,
                  version,
                  required,
                  accepted,
                  accepted_at,
                  ip_address,
                  user_agent
                )
                values ($1, $2, $3, $4, $5, $6, now(), $7, $8)
              `,
              [
                buyer.buyer_id,
                activeTerm?.id || null,
                agreement.agreementKey,
                activeTerm?.version || agreement.version,
                activeTerm?.required ?? agreement.required,
                agreement.accepted,
                context.ipAddress || null,
                context.userAgent || null
              ]
            );
          }
        }

        await client.query("commit");
        return {
          profile: mapBuyerProfile({
            ...buyer,
            email: user.email,
            role: user.role,
            status: user.status
          })
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original database failure.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
