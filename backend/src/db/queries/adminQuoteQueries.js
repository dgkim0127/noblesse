function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin quote queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin quote creation.");
  }
}

function mapQuote(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    inquiryNumber: row.inquiry_number,
    companyName: row.company_name || null,
    status: row.status,
    confirmedTotal: row.confirmed_total,
    requestedTotal: row.requested_total,
    currency: row.currency,
    leadTime: row.lead_time,
    shippingNote: row.shipping_note,
    adminMemo: row.admin_memo,
    quotedBy: row.quoted_by || null,
    quotedAt: row.quoted_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapQuoteItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    requestedQuantity: row.requested_quantity,
    confirmedQuantity: row.confirmed_quantity,
    requestedPriceSnapshot: row.requested_price_snapshot,
    confirmedUnitPrice: row.confirmed_unit_price,
    confirmedSubtotal: row.confirmed_subtotal
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

function quoteSnapshot(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    inquiryNumber: row.inquiry_number,
    status: row.status,
    confirmedTotal: row.confirmed_total,
    currency: row.currency,
    leadTime: row.lead_time,
    shippingNote: row.shipping_note,
    adminMemo: row.admin_memo,
    quotedBy: row.quoted_by || null,
    quotedAt: row.quoted_at || null
  };
}

export function createAdminQuoteQueries(pool) {
  return {
    async listQuotes(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            aq.id,
            aq.inquiry_id,
            i.inquiry_number,
            b.company_name,
            aq.status,
            aq.confirmed_total,
            i.estimated_total as requested_total,
            aq.currency,
            aq.lead_time,
            aq.shipping_note,
            aq.admin_memo,
            aq.quoted_by,
            aq.quoted_at,
            aq.created_at,
            aq.updated_at
          from public.admin_quotes aq
          join public.inquiries i on i.id = aq.inquiry_id
          left join public.buyers b on b.id = i.buyer_id
          where ($1::text is null or aq.status = $1)
            and ($2::text is null or i.market = $2)
            and (
              $3::text is null
              or i.inquiry_number ilike $3
              or b.company_name ilike $3
            )
          order by aq.created_at desc
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
      return result.rows.map(mapQuote);
    },

    async getQuoteById(quoteId) {
      assertPool(pool);
      const quoteResult = await pool.query(
        `
          select
            aq.id,
            aq.inquiry_id,
            i.inquiry_number,
            b.company_name,
            aq.status,
            aq.confirmed_total,
            i.estimated_total as requested_total,
            aq.currency,
            aq.lead_time,
            aq.shipping_note,
            aq.admin_memo,
            aq.quoted_by,
            aq.quoted_at,
            aq.created_at,
            aq.updated_at
          from public.admin_quotes aq
          join public.inquiries i on i.id = aq.inquiry_id
          left join public.buyers b on b.id = i.buyer_id
          where aq.id = $1
          limit 1
        `,
        [quoteId]
      );
      const quoteRow = quoteResult.rows[0];
      if (!quoteRow) return null;

      const itemsResult = await pool.query(
        `
          select
            id,
            product_id,
            product_code,
            requested_quantity,
            confirmed_quantity,
            requested_price_snapshot,
            confirmed_unit_price,
            confirmed_subtotal
          from public.admin_quote_items
          where admin_quote_id = $1
          order by created_at asc, id asc
        `,
        [quoteId]
      );

      return {
        quote: mapQuote(quoteRow),
        items: itemsResult.rows.map(mapQuoteItem)
      };
    },

    async createQuoteFromInquiry(inquiryId, quoteInput, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingQuote = await client.query(
          `
            select id
            from public.admin_quotes
            where inquiry_id = $1
            order by created_at desc
            limit 1
          `,
          [inquiryId]
        );
        if (existingQuote.rows[0]) {
          await client.query("rollback");
          return { conflictQuoteId: existingQuote.rows[0].id };
        }

        const inquiryResult = await client.query(
          `
            select id, inquiry_number, currency, estimated_total
            from public.inquiries
            where id = $1
            for update
          `,
          [inquiryId]
        );
        const inquiry = inquiryResult.rows[0];
        if (!inquiry) {
          await client.query("rollback");
          return null;
        }

        const itemsResult = await client.query(
          `
            select
              product_id,
              product_code,
              quantity,
              price_snapshot,
              subtotal
            from public.inquiry_items
            where inquiry_id = $1
            order by created_at asc, id asc
          `,
          [inquiryId]
        );

        const quoteResult = await client.query(
          `
            insert into public.admin_quotes (
              inquiry_id,
              status,
              confirmed_total,
              currency,
              lead_time,
              shipping_note,
              admin_memo,
              quoted_by
            )
            values ($1, 'draft', $2, $3, $4, $5, $6, $7)
            returning
              id,
              inquiry_id,
              status,
              confirmed_total,
              currency,
              lead_time,
              shipping_note,
              admin_memo,
              quoted_by,
              quoted_at,
              created_at,
              updated_at
          `,
          [
            inquiryId,
            inquiry.estimated_total,
            inquiry.currency,
            quoteInput.leadTime || null,
            quoteInput.shippingNote || null,
            quoteInput.adminMemo || null,
            actor.userId
          ]
        );
        const quote = quoteResult.rows[0];
        const quoteItems = [];
        for (const item of itemsResult.rows) {
          const inserted = await client.query(
            `
              insert into public.admin_quote_items (
                admin_quote_id,
                product_id,
                product_code,
                requested_quantity,
                confirmed_quantity,
                requested_price_snapshot,
                confirmed_unit_price,
                confirmed_subtotal
              )
              values ($1, $2, $3, $4, $4, $5, $5, $6)
              returning
                id,
                product_id,
                product_code,
                requested_quantity,
                confirmed_quantity,
                requested_price_snapshot,
                confirmed_unit_price,
                confirmed_subtotal
            `,
            [
              quote.id,
              item.product_id,
              item.product_code,
              item.quantity,
              item.price_snapshot,
              item.subtotal
            ]
          );
          quoteItems.push(mapQuoteItem(inserted.rows[0]));
        }

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
            values ($1, $2, $3, $4, $5, null, $6::jsonb, $7, $8, $9)
            returning id
          `,
          [
            actor.userId,
            actor.role,
            "admin.quote.create",
            "admin_quotes",
            quote.id,
            {
              id: quote.id,
              inquiryId,
              inquiryNumber: inquiry.inquiry_number,
              status: quote.status,
              confirmedTotal: quote.confirmed_total,
              itemCount: quoteItems.length
            },
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          quote: mapQuote({
            ...quote,
            inquiry_number: inquiry.inquiry_number,
            company_name: null,
            requested_total: inquiry.estimated_total
          }),
          items: quoteItems,
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

    async updateQuoteStatus(quoteId, status, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `
            select
              aq.id,
              aq.inquiry_id,
              i.inquiry_number,
              b.company_name,
              aq.status,
              aq.confirmed_total,
              i.estimated_total as requested_total,
              aq.currency,
              aq.lead_time,
              aq.shipping_note,
              aq.admin_memo,
              aq.quoted_by,
              aq.quoted_at,
              aq.created_at,
              aq.updated_at
            from public.admin_quotes aq
            join public.inquiries i on i.id = aq.inquiry_id
            left join public.buyers b on b.id = i.buyer_id
            where aq.id = $1
            for update of aq
          `,
          [quoteId]
        );
        const existing = existingResult.rows[0];
        if (!existing) {
          await client.query("rollback");
          return null;
        }

        const updatedResult = await client.query(
          `
            update public.admin_quotes
            set
              status = $2,
              quoted_by = case when $2 = 'sent' then $3 else quoted_by end,
              quoted_at = case when $2 = 'sent' then coalesce(quoted_at, now()) else quoted_at end,
              updated_at = now()
            where id = $1
            returning
              id,
              inquiry_id,
              status,
              confirmed_total,
              currency,
              lead_time,
              shipping_note,
              admin_memo,
              quoted_by,
              quoted_at,
              created_at,
              updated_at
          `,
          [quoteId, status, actor.userId]
        );
        const updated = {
          ...updatedResult.rows[0],
          inquiry_number: existing.inquiry_number,
          company_name: existing.company_name,
          requested_total: existing.requested_total
        };

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
            "admin.quote.status.update",
            "admin_quotes",
            quoteId,
            quoteSnapshot(existing),
            quoteSnapshot(updated),
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          quote: mapQuote(updated),
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
