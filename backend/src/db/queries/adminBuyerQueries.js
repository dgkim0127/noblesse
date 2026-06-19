function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin buyer queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin buyer status updates.");
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

function mapBuyerDetail(row) {
  return {
    ...mapBuyer(row),
    phone: row.phone || null,
    messengerType: row.messenger_type || null,
    messengerId: row.messenger_id || null,
    salesChannel: row.sales_channel || null,
    businessNumber: row.business_number || null,
    discountRate: Number(row.discount_rate || 0),
    minOrderAmount: Number(row.min_order_amount || 0),
    approvedAt: row.approved_at || null,
    approvedBy: row.approved_by || null
  };
}

function mapAgreement(row) {
  return {
    id: row.id,
    agreementKey: row.agreement_key,
    version: row.version,
    required: row.required,
    accepted: row.accepted,
    acceptedAt: row.accepted_at || null,
    createdAt: row.created_at
  };
}

function mapRecentInquiry(row) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    status: row.status,
    market: row.market,
    currency: row.currency,
    totalItems: row.total_items,
    totalQuantity: row.total_quantity,
    estimatedTotal: row.estimated_total,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createBuyerSnapshot(row) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email || null,
    role: row.role,
    status: row.status,
    companyName: row.company_name,
    contactName: row.contact_name,
    assignedMarket: row.assigned_market,
    updatedAt: row.updated_at
  };
}

function getAdminActor(adminViewer = {}) {
  return {
    userId: adminViewer.userId || adminViewer.id || null,
    role: adminViewer.role || "admin",
    requestId: adminViewer.requestId || null,
    ipAddress: adminViewer.ipAddress || null,
    userAgent: adminViewer.userAgent || null
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
          filters.dbLimit || filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapBuyer);
    },

    async getBuyerById(buyerId) {
      assertPool(pool);
      const buyerResult = await pool.query(
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
            b.phone,
            b.messenger_type,
            b.messenger_id,
            b.sales_channel,
            b.business_number,
            b.assigned_market,
            b.currency,
            b.discount_rate,
            b.min_order_amount,
            b.approved_at,
            b.approved_by,
            b.created_at,
            b.updated_at
          from public.buyers b
          join public.users u on u.id = b.user_id
          where b.id = $1
            and u.role = 'buyer'
          limit 1
        `,
        [buyerId]
      );
      const buyerRow = buyerResult.rows[0];
      if (!buyerRow) return null;

      const agreementsResult = await pool.query(
        `
          select
            id,
            agreement_key,
            version,
            required,
            accepted,
            accepted_at,
            created_at
          from public.buyer_agreements
          where buyer_id = $1
          order by created_at desc
          limit 20
        `,
        [buyerId]
      );

      const inquiriesResult = await pool.query(
        `
          select
            i.id,
            i.inquiry_number,
            i.status,
            i.market,
            i.currency,
            count(ii.id)::int as total_items,
            coalesce(sum(ii.quantity), 0)::int as total_quantity,
            i.estimated_total,
            i.created_at,
            i.updated_at
          from public.inquiries i
          left join public.inquiry_items ii on ii.inquiry_id = i.id
          where i.buyer_id = $1
          group by i.id
          order by i.created_at desc
          limit 10
        `,
        [buyerId]
      );

      return {
        buyer: mapBuyerDetail(buyerRow),
        agreements: agreementsResult.rows.map(mapAgreement),
        recentInquiries: inquiriesResult.rows.map(mapRecentInquiry)
      };
    },

    async updateBuyerStatus(buyerId, status, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
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
              greatest(b.updated_at, u.updated_at) as updated_at
            from public.buyers b
            join public.users u on u.id = b.user_id
            where b.id = $1
              and u.role = 'buyer'
            for update of b, u
          `,
          [buyerId]
        );

        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const beforeSnapshot = createBuyerSnapshot(existingRow);
        const updateResult = await client.query(
          `
            update public.users
            set status = $2,
                updated_at = now()
            where id = $1
            returning id, email, role, status, updated_at
          `,
          [existingRow.user_id, status]
        );
        const updatedUser = updateResult.rows[0];
        const updatedRow = {
          ...existingRow,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          updated_at: updatedUser.updated_at
        };
        const afterSnapshot = createBuyerSnapshot(updatedRow);

        const auditResult = await client.query(
          `
            insert into public.audit_logs (
              actor_user_id,
              actor_role,
              action,
              target_table,
              target_id,
              before_snapshot,
              after_snapshot,
              request_id,
              ip_address,
              user_agent
            )
            values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
            returning id
          `,
          [
            actor.userId,
            actor.role,
            "admin.buyer.status.update",
            "buyers",
            buyerId,
            beforeSnapshot,
            afterSnapshot,
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          buyer: mapBuyer(updatedRow),
          auditLogId: auditResult.rows[0].id
        };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error instead of masking it with rollback failure.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
