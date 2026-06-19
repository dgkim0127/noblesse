function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin inquiry queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin inquiry memo updates.");
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

function mapInquiryItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    material: row.material,
    color: row.color,
    size: row.size,
    quantity: row.quantity,
    moq: row.moq,
    priceSnapshot: row.price_snapshot,
    subtotal: row.subtotal
  };
}

function mapMemoInquiry(row) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    adminMemo: row.admin_memo,
    updatedAt: row.updated_at
  };
}

function mapStatusInquiry(row) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    status: row.status,
    updatedAt: row.updated_at
  };
}

function createMemoSnapshot(row) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    adminMemo: row.admin_memo,
    updatedAt: row.updated_at
  };
}

function createStatusSnapshot(row) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    status: row.status,
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
          filters.dbLimit || filters.limit,
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
      const itemsResult = await pool.query(
        `
          select
            id,
            product_id,
            product_code,
            product_name,
            material,
            color,
            size,
            quantity,
            moq,
            price_snapshot,
            subtotal
          from public.inquiry_items
          where inquiry_id = $1
          order by created_at asc, id asc
        `,
        [inquiryId]
      );
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
        items: itemsResult.rows.map(mapInquiryItem)
      };
    },

    async updateInquiryMemo(inquiryId, adminMemo, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `
            select
              id,
              inquiry_number,
              admin_memo,
              updated_at
            from public.inquiries
            where id = $1
            for update
          `,
          [inquiryId]
        );

        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const beforeSnapshot = createMemoSnapshot(existingRow);
        const updateResult = await client.query(
          `
            update public.inquiries
            set admin_memo = $2,
                updated_at = now()
            where id = $1
            returning
              id,
              inquiry_number,
              admin_memo,
              updated_at
          `,
          [inquiryId, adminMemo]
        );
        const updatedRow = updateResult.rows[0];
        const afterSnapshot = createMemoSnapshot(updatedRow);

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
            "admin.inquiry.memo.update",
            "inquiries",
            inquiryId,
            beforeSnapshot,
            afterSnapshot,
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          inquiry: mapMemoInquiry(updatedRow),
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
    },

    async updateInquiryStatus(inquiryId, status, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `
            select
              id,
              inquiry_number,
              status,
              updated_at
            from public.inquiries
            where id = $1
            for update
          `,
          [inquiryId]
        );

        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const beforeSnapshot = createStatusSnapshot(existingRow);
        const updateResult = await client.query(
          `
            update public.inquiries
            set status = $2,
                updated_at = now()
            where id = $1
            returning
              id,
              inquiry_number,
              status,
              updated_at
          `,
          [inquiryId, status]
        );
        const updatedRow = updateResult.rows[0];
        const afterSnapshot = createStatusSnapshot(updatedRow);

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
            "admin.inquiry.status.update",
            "inquiries",
            inquiryId,
            beforeSnapshot,
            afterSnapshot,
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          inquiry: mapStatusInquiry(updatedRow),
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
