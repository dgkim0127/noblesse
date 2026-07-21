function assertPool(pool) {
  if (!pool) throw new Error("PostgreSQL pool is not configured for admin quote queries.");
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin quote writes.");
  }
}

function toNumber(value) {
  return Number(value) || 0;
}

function normalizeDocumentLocale(value) {
  const locale = String(value || "").toLowerCase();
  if (locale === "ko" || locale === "kr" || locale.startsWith("ko-")) return "kr";
  if (locale === "ja" || locale === "jp" || locale.startsWith("ja-")) return "jp";
  if (locale.includes("zh") || locale === "tw" || locale.includes("traditional")) return "zh-TW";
  return "en";
}

function mapQuote(row) {
  const isExpired = row.status === "sent" && row.valid_until && new Date(`${row.valid_until}T23:59:59Z`).getTime() < Date.now();
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    inquiryNumber: row.inquiry_number,
    quoteNumber: row.quote_number || null,
    companyName: row.company_name || null,
    buyerCountry: row.country || null,
    status: row.status,
    displayStatus: isExpired ? "expired" : row.status,
    isExpired,
    confirmedTotal: toNumber(row.confirmed_total),
    requestedTotal: toNumber(row.requested_total),
    currency: row.currency,
    leadTime: row.lead_time || "",
    shippingNote: row.shipping_note || "",
    validUntil: row.valid_until || null,
    documentLocale: row.document_locale || "en",
    customerNote: row.customer_note || "",
    adminMemo: row.admin_memo || "",
    currentDocumentId: row.current_document_id || null,
    acceptedDocumentId: row.accepted_document_id || null,
    currentRevision: Number(row.current_revision || 0),
    decisionNote: row.decision_note || "",
    acceptedAt: row.accepted_at || null,
    rejectedAt: row.rejected_at || null,
    workflowVersion: Number(row.workflow_version || 1),
    workflowStatus: row.workflow_status || "received",
    workflowNote: row.workflow_note || "",
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
    productName: row.product_name || row.product_code,
    color: row.color || "",
    size: row.size || "",
    selectedOptions: Array.isArray(row.selected_options) ? row.selected_options : [],
    requestedQuantity: row.requested_quantity,
    confirmedQuantity: row.confirmed_quantity,
    requestedPriceSnapshot: toNumber(row.requested_price_snapshot),
    confirmedUnitPrice: toNumber(row.confirmed_unit_price),
    confirmedSubtotal: toNumber(row.confirmed_subtotal),
    itemNote: row.item_note || "",
    fulfillmentStatus: row.fulfillment_status || "pending",
    cancelledQuantity: Number(row.cancelled_quantity || 0),
    cancellationReason: row.cancellation_reason || "",
    cancellationNote: row.cancellation_note || ""
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    quoteId: row.admin_quote_id,
    revision: Number(row.revision),
    documentLocale: row.document_locale,
    snapshot: row.snapshot || {},
    pdfSha256: row.pdf_sha256,
    issuedBy: row.issued_by || null,
    issuedAt: row.issued_at
  };
}

function mapHistory(row) {
  return {
    id: row.id,
    quoteId: row.admin_quote_id,
    documentId: row.document_id || null,
    fromStatus: row.from_status || null,
    toStatus: row.to_status,
    actorType: row.actor_type,
    eventType: row.event_type || "quote",
    note: row.note || "",
    createdAt: row.created_at
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
    quoteNumber: row.quote_number || null,
    status: row.status,
    confirmedTotal: toNumber(row.confirmed_total),
    currency: row.currency,
    leadTime: row.lead_time || "",
    shippingNote: row.shipping_note || "",
    validUntil: row.valid_until || null,
    documentLocale: row.document_locale || "en",
    customerNote: row.customer_note || "",
    currentDocumentId: row.current_document_id || null,
    workflowStatus: row.workflow_status || "received",
    workflowNote: row.workflow_note || "",
    updatedAt: row.updated_at
  };
}

const quoteSelect = `
  select
    aq.id,
    aq.inquiry_id,
    i.inquiry_number,
    aq.quote_number,
    b.company_name,
    b.country,
    b.preferred_language,
    aq.status,
    aq.confirmed_total,
    i.estimated_total as requested_total,
    aq.currency,
    aq.lead_time,
    aq.shipping_note,
    aq.valid_until,
    aq.document_locale,
    aq.customer_note,
    aq.admin_memo,
    aq.current_document_id,
    aq.accepted_document_id,
    aq.decision_note,
    aq.accepted_at,
    aq.rejected_at,
    aq.workflow_version,
    aq.workflow_status,
    aq.workflow_note,
    aq.quoted_by,
    aq.quoted_at,
    current_document.revision as current_revision,
    aq.created_at,
    aq.updated_at
  from public.admin_quotes aq
  join public.inquiries i on i.id = aq.inquiry_id
  left join public.buyers b on b.id = i.buyer_id
  left join public.admin_quote_documents current_document on current_document.id = aq.current_document_id
`;

const itemSelect = `
  select
    id,
    product_id,
    product_code,
    product_name,
    color,
    size,
    selected_options,
    requested_quantity,
    confirmed_quantity,
    requested_price_snapshot,
    confirmed_unit_price,
    confirmed_subtotal,
    item_note,
    fulfillment_status,
    cancelled_quantity,
    cancellation_reason,
    cancellation_note
  from public.admin_quote_items
`;

async function insertAudit(client, { actor, action, targetId, before, after }) {
  const result = await client.query(
    `
      insert into public.audit_logs (
        actor_user_id, actor_role, action, target_table, target_id,
        before_snapshot, after_snapshot, request_id, ip_address, user_agent
      )
      values ($1, $2, $3, 'admin_quotes', $4, $5::jsonb, $6::jsonb, $7, $8, $9)
      returning id
    `,
    [actor.userId, actor.role, action, targetId, before, after, actor.requestId, actor.ipAddress, actor.userAgent]
  );
  return result.rows[0].id;
}

export function createAdminQuoteQueries(pool) {
  return {
    async listQuotes(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          ${quoteSelect}
          where (
            $1::text is null
            or ($1 = 'expired' and aq.status = 'sent' and aq.valid_until < current_date)
            or ($1 = 'sent' and aq.status = 'sent' and (aq.valid_until is null or aq.valid_until >= current_date))
            or ($1 not in ('expired', 'sent') and aq.status = $1)
          )
            and ($2::text is null or i.market = $2)
            and ($3::text is null or aq.workflow_status = $3)
            and (
              $4::text is null
              or aq.quote_number ilike $4
              or i.inquiry_number ilike $4
              or b.company_name ilike $4
            )
          order by aq.updated_at desc
          limit $5 offset $6
        `,
        [filters.status || null, filters.market || null, filters.workflowStatus || null, filters.q ? `%${filters.q}%` : null, filters.dbLimit || filters.limit, filters.offset]
      );
      return result.rows.map(mapQuote);
    },

    async getQuoteById(quoteId) {
      assertPool(pool);
      const quoteResult = await pool.query(`${quoteSelect} where aq.id = $1 limit 1`, [quoteId]);
      const quoteRow = quoteResult.rows[0];
      if (!quoteRow) return null;
      const [itemsResult, documentsResult, historyResult] = await Promise.all([
        pool.query(`${itemSelect} where admin_quote_id = $1 order by created_at asc, id asc`, [quoteId]),
        pool.query(`select * from public.admin_quote_documents where admin_quote_id = $1 order by revision desc`, [quoteId]),
        pool.query(`select * from public.admin_quote_status_history where admin_quote_id = $1 order by created_at asc, id asc`, [quoteId])
      ]);
      return {
        quote: mapQuote(quoteRow),
        items: itemsResult.rows.map(mapQuoteItem),
        documents: documentsResult.rows.map(mapDocument),
        history: historyResult.rows.map(mapHistory)
      };
    },

    async createQuoteFromInquiry(inquiryId, quoteInput, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const existingQuote = await client.query("select id from public.admin_quotes where inquiry_id = $1 order by created_at desc limit 1", [inquiryId]);
        if (existingQuote.rows[0]) {
          await client.query("rollback");
          return { conflictQuoteId: existingQuote.rows[0].id };
        }
        const inquiryResult = await client.query(
          `
            select i.id, i.inquiry_number, i.currency, i.estimated_total, b.company_name, b.country, b.preferred_language
            from public.inquiries i
            left join public.buyers b on b.id = i.buyer_id
            where i.id = $1
            for update of i
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
            select product_id, product_code, product_name, color, size, selected_options, quantity, price_snapshot, subtotal
            from public.inquiry_items
            where inquiry_id = $1
            order by created_at asc, id asc
          `,
          [inquiryId]
        );
        const quoteResult = await client.query(
          `
            insert into public.admin_quotes (
              inquiry_id, status, confirmed_total, currency, lead_time, shipping_note,
              document_locale, admin_memo, quoted_by
            )
            values ($1, 'draft', $2, $3, $4, $5, $6, $7, $8)
            returning *
          `,
          [
            inquiryId,
            inquiry.estimated_total,
            inquiry.currency,
            quoteInput.leadTime || null,
            quoteInput.shippingNote || null,
            normalizeDocumentLocale(inquiry.preferred_language),
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
                admin_quote_id, product_id, product_code, product_name, color, size, selected_options,
                requested_quantity, confirmed_quantity, requested_price_snapshot,
                confirmed_unit_price, confirmed_subtotal
              )
              values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8, $9, $9, $10)
              returning *
            `,
            [quote.id, item.product_id, item.product_code, item.product_name, item.color, item.size, JSON.stringify(item.selected_options || []), item.quantity, item.price_snapshot, item.subtotal]
          );
          quoteItems.push(mapQuoteItem(inserted.rows[0]));
        }
        await client.query(
          `insert into public.admin_quote_status_history (admin_quote_id, from_status, to_status, actor_user_id, actor_type) values ($1, null, 'draft', $2, 'admin')`,
          [quote.id, actor.userId]
        );
        const fullQuote = {
          ...quote,
          inquiry_number: inquiry.inquiry_number,
          company_name: inquiry.company_name,
          country: inquiry.country,
          requested_total: inquiry.estimated_total,
          current_revision: 0
        };
        const auditLogId = await insertAudit(client, {
          actor,
          action: "admin.quote.create",
          targetId: quote.id,
          before: null,
          after: { ...quoteSnapshot(fullQuote), itemCount: quoteItems.length }
        });
        await client.query("commit");
        return { quote: mapQuote(fullQuote), items: quoteItems, documents: [], history: [], auditLogId };
      } catch (error) {
        try { await client.query("rollback"); } catch { /* Preserve original error. */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async updateQuoteDraft(quoteId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const existingResult = await client.query(`${quoteSelect} where aq.id = $1 for update of aq`, [quoteId]);
        const existing = existingResult.rows[0];
        if (!existing) {
          await client.query("rollback");
          return null;
        }
        if (["accepted", "rejected", "cancelled"].includes(existing.status) || !["received", "picking"].includes(existing.workflow_status || "received")) {
          await client.query("rollback");
          return { locked: true };
        }
        const missingItems = [];
        const invalidItems = [];
        for (const item of input.items) {
          const existingItemResult = await client.query(
            `select requested_quantity from public.admin_quote_items where admin_quote_id = $1 and id = $2 for update`,
            [quoteId, item.id]
          );
          const existingItem = existingItemResult.rows[0];
          if (!existingItem) {
            missingItems.push(item.id);
            continue;
          }
          const requestedQuantity = Number(existingItem.requested_quantity || 0);
          const confirmedQuantity = Number(item.confirmedQuantity);
          if (confirmedQuantity > requestedQuantity) {
            invalidItems.push({ id: item.id, message: "Prepared quantity cannot exceed the original requested quantity" });
            continue;
          }
          const fulfillmentStatus = confirmedQuantity === 0
            ? "cancelled"
            : confirmedQuantity < requestedQuantity ? "partial" : "ready";
          if (item.fulfillmentStatus && item.fulfillmentStatus !== fulfillmentStatus) {
            invalidItems.push({ id: item.id, message: "Fulfillment status does not match the prepared quantity" });
            continue;
          }
          if (confirmedQuantity < requestedQuantity && !item.cancellationReason) {
            invalidItems.push({ id: item.id, message: "A cancellation reason is required when any requested quantity is unavailable" });
            continue;
          }
          const itemResult = await client.query(
            `
              update public.admin_quote_items
              set confirmed_quantity = $3::integer,
                  confirmed_unit_price = $4::numeric,
                  confirmed_subtotal = round(($3::integer * $4::numeric), 2),
                  item_note = nullif($5, ''),
                  fulfillment_status = $6,
                  cancelled_quantity = greatest(requested_quantity - $3::integer, 0),
                  cancellation_reason = case when $3::integer < requested_quantity then $7 else null end,
                  cancellation_note = case when $3::integer < requested_quantity then nullif($8, '') else null end
              where admin_quote_id = $1 and id = $2
              returning id
            `,
            [quoteId, item.id, confirmedQuantity, item.confirmedUnitPrice, item.itemNote, fulfillmentStatus, item.cancellationReason || null, item.cancellationNote]
          );
          if (!itemResult.rows[0]) missingItems.push(item.id);
        }
        if (missingItems.length || invalidItems.length) {
          await client.query("rollback");
          return { missingItems, invalidItems };
        }
        const totalResult = await client.query("select coalesce(sum(confirmed_subtotal), 0) as total from public.admin_quote_items where admin_quote_id = $1", [quoteId]);
        await client.query(
          `
            update public.admin_quotes
            set status = 'draft',
                confirmed_total = $2,
                lead_time = nullif($3, ''),
                shipping_note = nullif($4, ''),
                valid_until = $5,
                document_locale = $6,
                customer_note = nullif($7, ''),
                admin_memo = nullif($8, ''),
                current_document_id = null,
                quoted_at = null,
                updated_at = now()
            where id = $1
          `,
          [quoteId, totalResult.rows[0].total, input.leadTime, input.shippingNote, input.validUntil, input.documentLocale, input.customerNote, input.adminMemo]
        );
        const updatedResult = await client.query(`${quoteSelect} where aq.id = $1 limit 1`, [quoteId]);
        const updatedItems = await client.query(`${itemSelect} where admin_quote_id = $1 order by created_at asc, id asc`, [quoteId]);
        const auditLogId = await insertAudit(client, {
          actor,
          action: "admin.quote.draft.update",
          targetId: quoteId,
          before: quoteSnapshot(existing),
          after: quoteSnapshot(updatedResult.rows[0])
        });
        await client.query("commit");
        return { quote: mapQuote(updatedResult.rows[0]), items: updatedItems.rows.map(mapQuoteItem), auditLogId };
      } catch (error) {
        try { await client.query("rollback"); } catch { /* Preserve original error. */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async getIssueCandidate(quoteId) {
      assertPool(pool);
      const quoteResult = await pool.query(`${quoteSelect} where aq.id = $1 limit 1`, [quoteId]);
      const row = quoteResult.rows[0];
      if (!row) return null;
      if (["accepted", "rejected", "cancelled"].includes(row.status) || !["received", "picking"].includes(row.workflow_status || "received")) return { locked: true };
      const itemsResult = await pool.query(`${itemSelect} where admin_quote_id = $1 order by created_at asc, id asc`, [quoteId]);
      const revisionResult = await pool.query("select coalesce(max(revision), 0) + 1 as next_revision from public.admin_quote_documents where admin_quote_id = $1", [quoteId]);
      return {
        quote: mapQuote(row),
        buyer: { companyName: row.company_name || "", country: row.country || "" },
        items: itemsResult.rows.map(mapQuoteItem),
        nextRevision: Number(revisionResult.rows[0].next_revision || 1)
      };
    },

    async issueQuote(quoteId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const existingResult = await client.query(`${quoteSelect} where aq.id = $1 for update of aq`, [quoteId]);
        const existing = existingResult.rows[0];
        if (!existing) {
          await client.query("rollback");
          return null;
        }
        if (["accepted", "rejected", "cancelled"].includes(existing.status) || !["received", "picking"].includes(existing.workflow_status || "received")) {
          await client.query("rollback");
          return { locked: true };
        }
        if (new Date(existing.updated_at).toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) {
          await client.query("rollback");
          return { stale: true };
        }
        const revisionResult = await client.query("select coalesce(max(revision), 0) + 1 as next_revision from public.admin_quote_documents where admin_quote_id = $1", [quoteId]);
        const revision = Number(revisionResult.rows[0].next_revision || 1);
        if (revision !== Number(input.snapshot.revision)) {
          await client.query("rollback");
          return { stale: true };
        }
        const totalResult = await client.query("select coalesce(sum(round(confirmed_quantity * confirmed_unit_price, 2)), 0) as total from public.admin_quote_items where admin_quote_id = $1", [quoteId]);
        const total = toNumber(totalResult.rows[0].total);
        if (Math.abs(total - toNumber(input.snapshot.total)) > 0.001) {
          await client.query("rollback");
          return { stale: true };
        }
        const documentResult = await client.query(
          `
            insert into public.admin_quote_documents (
              admin_quote_id, revision, document_locale, snapshot, pdf_object_key, pdf_sha256, issued_by
            )
            values ($1, $2, $3, $4::jsonb, $5, $6, $7)
            returning *
          `,
          [quoteId, revision, input.snapshot.documentLocale, input.snapshot, input.pdfObjectKey, input.pdfSha256, actor.userId]
        );
        const document = documentResult.rows[0];
        await client.query(
          `
            update public.admin_quotes
            set quote_number = $2,
                status = 'sent',
                confirmed_total = $3,
                current_document_id = $4,
                quoted_by = $5,
                quoted_at = now(),
                updated_at = now()
            where id = $1
          `,
          [quoteId, input.quoteNumber, total, document.id, actor.userId]
        );
        await client.query(
          `
            insert into public.admin_quote_status_history (
              admin_quote_id, document_id, from_status, to_status, actor_user_id, actor_type, note
            ) values ($1, $2, $3, 'sent', $4, 'admin', $5)
          `,
          [quoteId, document.id, existing.status, actor.userId, `Issued revision ${revision}`]
        );
        await client.query("update public.inquiries set status = 'quoted', updated_at = now() where id = $1", [existing.inquiry_id]);
        const updatedResult = await client.query(`${quoteSelect} where aq.id = $1 limit 1`, [quoteId]);
        const auditLogId = await insertAudit(client, {
          actor,
          action: revision === 1 ? "admin.quote.issue" : "admin.quote.reissue",
          targetId: quoteId,
          before: quoteSnapshot(existing),
          after: { ...quoteSnapshot(updatedResult.rows[0]), revision, pdfSha256: input.pdfSha256 }
        });
        await client.query("commit");
        return { quote: mapQuote(updatedResult.rows[0]), document: mapDocument(document), auditLogId };
      } catch (error) {
        try { await client.query("rollback"); } catch { /* Preserve original error. */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async getDocumentAccess(quoteId, documentId) {
      assertPool(pool);
      const result = await pool.query(
        `
          select d.pdf_object_key, d.revision, q.quote_number
          from public.admin_quote_documents d
          join public.admin_quotes q on q.id = d.admin_quote_id
          where d.admin_quote_id = $1 and d.id = $2
          limit 1
        `,
        [quoteId, documentId]
      );
      if (!result.rows[0]) return null;
      return {
        pdfObjectKey: result.rows[0].pdf_object_key,
        revision: Number(result.rows[0].revision),
        quoteNumber: result.rows[0].quote_number
      };
    },

    async updateQuoteStatus(quoteId, status, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const existingResult = await client.query(`${quoteSelect} where aq.id = $1 for update of aq`, [quoteId]);
        const existing = existingResult.rows[0];
        if (!existing) {
          await client.query("rollback");
          return null;
        }
        if (["accepted", "rejected"].includes(existing.status)) {
          await client.query("rollback");
          return { locked: true };
        }
        await client.query(
          `update public.admin_quotes set status = $2, workflow_status = case when $2 = 'cancelled' then 'cancelled' else workflow_status end, updated_at = now() where id = $1`,
          [quoteId, status]
        );
        await client.query(
          `insert into public.admin_quote_status_history (admin_quote_id, document_id, from_status, to_status, actor_user_id, actor_type) values ($1, $2, $3, $4, $5, 'admin')`,
          [quoteId, existing.current_document_id, existing.status, status, actor.userId]
        );
        const updatedResult = await client.query(`${quoteSelect} where aq.id = $1 limit 1`, [quoteId]);
        const auditLogId = await insertAudit(client, {
          actor,
          action: "admin.quote.status.update",
          targetId: quoteId,
          before: quoteSnapshot(existing),
          after: quoteSnapshot(updatedResult.rows[0])
        });
        await client.query("commit");
        return { quote: mapQuote(updatedResult.rows[0]), auditLogId };
      } catch (error) {
        try { await client.query("rollback"); } catch { /* Preserve original error. */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async updateWorkflowStatus(quoteId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      const allowedTransitions = {
        received: ["picking", "cancelled"],
        picking: ["receipt_sent", "cancelled"],
        receipt_sent: ["picking", "payment_confirmed", "cancelled"],
        payment_confirmed: ["shipped"],
        shipped: ["completed"]
      };
      try {
        await client.query("begin");
        const existingResult = await client.query(`${quoteSelect} where aq.id = $1 for update of aq`, [quoteId]);
        const existing = existingResult.rows[0];
        if (!existing) {
          await client.query("rollback");
          return null;
        }
        const fromStatus = existing.workflow_status || "received";
        if (!(allowedTransitions[fromStatus] || []).includes(input.status)) {
          await client.query("rollback");
          return { invalidTransition: true, fromStatus };
        }
        if (input.status === "receipt_sent") {
          if (!existing.current_document_id) {
            await client.query("rollback");
            return { documentRequired: true };
          }
          const itemStateResult = await client.query(
            `
              select
                count(*) filter (where fulfillment_status = 'pending') as pending_count,
                count(*) filter (where confirmed_quantity > 0) as prepared_count
              from public.admin_quote_items
              where admin_quote_id = $1
            `,
            [quoteId]
          );
          if (Number(itemStateResult.rows[0].pending_count) > 0) {
            await client.query("rollback");
            return { unresolvedItems: true };
          }
          if (Number(itemStateResult.rows[0].prepared_count) < 1) {
            await client.query("rollback");
            return { noPreparedItems: true };
          }
        }
        await client.query(
          `
            update public.admin_quotes
            set workflow_status = $2,
                workflow_note = nullif($3, ''),
                status = case when $2 = 'cancelled' then 'cancelled' else status end,
                updated_at = now()
            where id = $1
          `,
          [quoteId, input.status, input.note]
        );
        await client.query(
          `
            insert into public.admin_quote_status_history (
              admin_quote_id, document_id, from_status, to_status, actor_user_id, actor_type, event_type, note
            ) values ($1, $2, $3, $4, $5, 'admin', 'workflow', nullif($6, ''))
          `,
          [quoteId, existing.current_document_id, fromStatus, input.status, actor.userId, input.note]
        );
        const inquiryStatus = input.status === "cancelled"
          ? "cancelled"
          : input.status === "picking" ? "checking"
            : ["payment_confirmed", "shipped", "completed"].includes(input.status) ? "confirmed" : "quoted";
        await client.query("update public.inquiries set status = $2, updated_at = now() where id = $1", [existing.inquiry_id, inquiryStatus]);
        const updatedResult = await client.query(`${quoteSelect} where aq.id = $1 limit 1`, [quoteId]);
        const auditLogId = await insertAudit(client, {
          actor,
          action: "admin.quote.workflow.update",
          targetId: quoteId,
          before: quoteSnapshot(existing),
          after: quoteSnapshot(updatedResult.rows[0])
        });
        await client.query("commit");
        return { quote: mapQuote(updatedResult.rows[0]), auditLogId };
      } catch (error) {
        try { await client.query("rollback"); } catch { /* Preserve original error. */ }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
