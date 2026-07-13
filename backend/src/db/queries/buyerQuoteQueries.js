function assertPool(pool) {
  if (!pool) throw new Error("PostgreSQL pool is not configured for buyer quote queries.");
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") throw new Error("PostgreSQL pool must support buyer quote decisions.");
}

function mapBuyerQuote(row) {
  const isExpired = row.status === "sent" && row.valid_until && new Date(`${row.valid_until}T23:59:59Z`).getTime() < Date.now();
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    quoteNumber: row.quote_number,
    status: row.status,
    displayStatus: isExpired ? "expired" : row.status,
    isExpired,
    validUntil: row.valid_until,
    documentId: row.current_document_id,
    revision: Number(row.revision || 0),
    documentLocale: row.document_locale,
    snapshot: row.snapshot || {},
    issuedAt: row.issued_at,
    decisionNote: row.decision_note || "",
    acceptedAt: row.accepted_at || null,
    rejectedAt: row.rejected_at || null
  };
}

const buyerQuoteSelect = `
  select
    q.id,
    q.inquiry_id,
    q.quote_number,
    q.status,
    q.valid_until,
    q.current_document_id,
    q.decision_note,
    q.accepted_at,
    q.rejected_at,
    d.revision,
    d.document_locale,
    d.snapshot,
    d.issued_at
  from public.admin_quotes q
  join public.inquiries i on i.id = q.inquiry_id
  join public.admin_quote_documents d on d.id = q.current_document_id
`;

export function createBuyerQuoteQueries(pool) {
  return {
    async getQuoteForInquiry(viewer, inquiryId) {
      assertPool(pool);
      const result = await pool.query(
        `${buyerQuoteSelect}
         where i.buyer_id = $1
           and i.id = $2
           and q.status in ('sent', 'accepted', 'rejected', 'cancelled')
         limit 1`,
        [viewer.buyerId, inquiryId]
      );
      return result.rows[0] ? mapBuyerQuote(result.rows[0]) : null;
    },

    async getDocumentAccess(viewer, quoteId, documentId) {
      assertPool(pool);
      const result = await pool.query(
        `
          select d.pdf_object_key, d.revision, q.quote_number
          from public.admin_quote_documents d
          join public.admin_quotes q on q.id = d.admin_quote_id
          join public.inquiries i on i.id = q.inquiry_id
          where i.buyer_id = $1
            and q.id = $2
            and d.id = $3
            and q.current_document_id = d.id
            and q.status in ('sent', 'accepted', 'rejected', 'cancelled')
          limit 1
        `,
        [viewer.buyerId, quoteId, documentId]
      );
      if (!result.rows[0]) return null;
      return {
        pdfObjectKey: result.rows[0].pdf_object_key,
        revision: Number(result.rows[0].revision),
        quoteNumber: result.rows[0].quote_number
      };
    },

    async decideQuote(viewer, quoteId, input) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      try {
        await client.query("begin");
        const existingResult = await client.query(
          `
            select q.*, i.buyer_id
            from public.admin_quotes q
            join public.inquiries i on i.id = q.inquiry_id
            where q.id = $1 and i.buyer_id = $2
            for update of q
          `,
          [quoteId, viewer.buyerId]
        );
        const existing = existingResult.rows[0];
        if (!existing) {
          await client.query("rollback");
          return null;
        }
        if (existing.status !== "sent") {
          await client.query("rollback");
          return { locked: true, currentStatus: existing.status };
        }
        if (String(existing.current_document_id) !== String(input.documentId)) {
          await client.query("rollback");
          return { stale: true };
        }
        const expiryResult = await client.query("select ($1::date < current_date) as expired", [existing.valid_until]);
        if (!existing.valid_until || expiryResult.rows[0].expired) {
          await client.query("rollback");
          return { expired: true };
        }
        const accepted = input.decision === "accepted";
        await client.query(
          `
            update public.admin_quotes
            set status = $2,
                accepted_document_id = case when $2 = 'accepted' then current_document_id else null end,
                decision_note = nullif($3, ''),
                accepted_at = case when $2 = 'accepted' then now() else null end,
                rejected_at = case when $2 = 'rejected' then now() else null end,
                updated_at = now()
            where id = $1
          `,
          [quoteId, input.decision, input.note]
        );
        await client.query(
          `
            insert into public.admin_quote_status_history (
              admin_quote_id, document_id, from_status, to_status, actor_user_id, actor_type, note
            ) values ($1, $2, 'sent', $3, $4, 'buyer', nullif($5, ''))
          `,
          [quoteId, input.documentId, input.decision, viewer.userId || null, input.note]
        );
        const updatedResult = await client.query(`${buyerQuoteSelect} where q.id = $1 and i.buyer_id = $2 limit 1`, [quoteId, viewer.buyerId]);
        await client.query("commit");
        return { quote: mapBuyerQuote(updatedResult.rows[0]), accepted };
      } catch (error) {
        try { await client.query("rollback"); } catch { /* Preserve original error. */ }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
