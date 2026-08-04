function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    discountRate: numberOrZero(row.discount_rate),
    vatEnabled: Boolean(row.vat_enabled),
    isOverseas: Boolean(row.is_overseas),
    isActive: Boolean(row.is_active),
    pricingRules: row.pricing_rules || {},
    sourceVersion: Number(row.source_version || 0),
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code || "",
    name: row.name,
    categoryId: row.category_id || "",
    basePrice: numberOrZero(row.base_price),
    discountable: Boolean(row.discountable),
    isActive: Boolean(row.is_active),
    pricingRules: row.pricing_rules || {},
    sourceVersion: Number(row.source_version || 0),
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapQuoteState(row) {
  if (!row) return null;
  return {
    quoteId: row.admin_quote_id,
    isOnlineQuote: Boolean(row.is_online_quote),
    version: Number(row.version || 1),
    posCustomerId: row.pos_customer_id || null,
    customerSnapshot: row.customer_snapshot || null,
    deductionAmount: numberOrZero(row.deduction_amount),
    lastPreview: row.last_preview || null,
    finalizedSnapshot: row.finalized_snapshot || null,
    finalizedDocumentId: row.finalized_document_id || null,
    finalizedAt: row.finalized_at || null,
    publishedSnapshot: row.published_snapshot || null,
    publishedDocumentId: row.published_document_id || null,
    publishedAt: row.published_at || null,
    linkedReceiptId: row.linked_receipt_id || null,
    linkedReceiptSnapshot: row.linked_receipt_snapshot || null,
    receiptLinkedAt: row.receipt_linked_at || null,
    updatedByUid: row.updated_by_uid || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureQuoteState(queryable, quoteId) {
  await queryable.query(
    `insert into public.pos_quote_states (admin_quote_id)
     values ($1)
     on conflict (admin_quote_id) do nothing`,
    [quoteId]
  );
}

export function createAdminPosQueries(pool) {
  return {
    async getQuoteState(quoteId) {
      await ensureQuoteState(pool, quoteId);
      const result = await pool.query(
        `select *
           from public.pos_quote_states
          where admin_quote_id = $1`,
        [quoteId]
      );
      return mapQuoteState(result.rows[0]);
    },

    async getQuoteStates(quoteIds = []) {
      if (!quoteIds.length) return [];
      const result = await pool.query(
        `select *
           from public.pos_quote_states
          where admin_quote_id = any($1::uuid[])`,
        [quoteIds]
      );
      return result.rows.map(mapQuoteState);
    },

    async claimQuoteVersion(quoteId, expectedVersion, actorUid) {
      await ensureQuoteState(pool, quoteId);
      const result = await pool.query(
        `update public.pos_quote_states
            set version = version + 1,
                is_online_quote = true,
                updated_by_uid = $3,
                updated_at = now()
          where admin_quote_id = $1
            and version = $2
        returning *`,
        [quoteId, expectedVersion, actorUid]
      );
      if (result.rows[0]) {
        return { claimed: true, state: mapQuoteState(result.rows[0]) };
      }
      const current = await pool.query(
        `select *
           from public.pos_quote_states
          where admin_quote_id = $1`,
        [quoteId]
      );
      return { claimed: false, state: mapQuoteState(current.rows[0]) };
    },

    async restoreQuoteVersion(quoteId, claimedVersion, previousVersion, actorUid) {
      const result = await pool.query(
        `update public.pos_quote_states
            set version = $3,
                updated_by_uid = $4,
                updated_at = now()
          where admin_quote_id = $1
            and version = $2
        returning *`,
        [quoteId, claimedVersion, previousVersion, actorUid]
      );
      return mapQuoteState(result.rows[0]);
    },

    async savePickingState(quoteId, version, input, actorUid) {
      const result = await pool.query(
        `update public.pos_quote_states
            set pos_customer_id = $3,
                customer_snapshot = $4::jsonb,
                deduction_amount = $5,
                last_preview = $6::jsonb,
                finalized_snapshot = case when $7 then null else finalized_snapshot end,
                finalized_at = case when $7 then null else finalized_at end,
                updated_by_uid = $8,
                updated_at = now()
          where admin_quote_id = $1
            and version = $2
        returning *`,
        [
          quoteId,
          version,
          input.posCustomerId || null,
          input.customerSnapshot ? JSON.stringify(input.customerSnapshot) : null,
          input.deductionAmount || 0,
          input.lastPreview ? JSON.stringify(input.lastPreview) : null,
          Boolean(input.invalidateFinalization),
          actorUid
        ]
      );
      return mapQuoteState(result.rows[0]);
    },

    async saveFinalizedState(quoteId, version, input, actorUid) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const revisionResult = await client.query(
          `select coalesce(max(revision), 0) + 1 as next_revision
             from public.pos_quote_price_snapshots
            where admin_quote_id = $1`,
          [quoteId]
        );
        const revision = Number(revisionResult.rows[0].next_revision);
        const snapshotResult = await client.query(
          `insert into public.pos_quote_price_snapshots (
             admin_quote_id,
             revision,
             calculation_version,
             snapshot,
             created_by_uid
           )
           values ($1, $2, $3, $4::jsonb, $5)
           returning *`,
          [
            quoteId,
            revision,
            input.calculationVersion,
            JSON.stringify(input.snapshot),
            actorUid
          ]
        );
        const stateResult = await client.query(
          `update public.pos_quote_states
              set pos_customer_id = $3,
                  customer_snapshot = $4::jsonb,
                  deduction_amount = $5,
                  last_preview = $6::jsonb,
                  finalized_snapshot = $7::jsonb,
                  finalized_at = now(),
                  updated_by_uid = $8,
                  updated_at = now()
            where admin_quote_id = $1
              and version = $2
          returning *`,
          [
            quoteId,
            version,
            input.posCustomerId || null,
            input.customerSnapshot ? JSON.stringify(input.customerSnapshot) : null,
            input.deductionAmount || 0,
            JSON.stringify(input.snapshot),
            JSON.stringify(input.snapshot),
            actorUid
          ]
        );
        if (!stateResult.rows[0]) {
          await client.query("rollback");
          return null;
        }
        await client.query("commit");
        return {
          state: mapQuoteState(stateResult.rows[0]),
          priceSnapshot: {
            id: snapshotResult.rows[0].id,
            revision,
            calculationVersion: snapshotResult.rows[0].calculation_version,
            snapshot: snapshotResult.rows[0].snapshot,
            createdAt: snapshotResult.rows[0].created_at
          }
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },

    async savePublishedState(quoteId, version, input, actorUid) {
      const result = await pool.query(
        `update public.pos_quote_states
            set published_snapshot = $3::jsonb,
                published_document_id = $4,
                published_at = now(),
                updated_by_uid = $5,
                updated_at = now()
          where admin_quote_id = $1
            and version = $2
        returning *`,
        [
          quoteId,
          version,
          JSON.stringify(input.snapshot),
          input.documentId,
          actorUid
        ]
      );
      return mapQuoteState(result.rows[0]);
    },

    async saveReceiptState(quoteId, version, input, actorUid) {
      const result = await pool.query(
        `update public.pos_quote_states
            set linked_receipt_id = $3,
                linked_receipt_snapshot = $4::jsonb,
                receipt_linked_at = now(),
                updated_by_uid = $5,
                updated_at = now()
          where admin_quote_id = $1
            and version = $2
        returning *`,
        [
          quoteId,
          version,
          input.receiptId,
          input.receiptSnapshot ? JSON.stringify(input.receiptSnapshot) : null,
          actorUid
        ]
      );
      return mapQuoteState(result.rows[0]);
    },

    async getBuyerCustomer(buyerId) {
      if (!buyerId) return null;
      const result = await pool.query(
        `select customer.*
           from public.buyer_pos_links link
           join public.pos_customers customer on customer.id = link.pos_customer_id
          where link.buyer_id = $1`,
        [buyerId]
      );
      return mapCustomer(result.rows[0]);
    },

    async getProductMappings(productIds = []) {
      if (!productIds.length) return [];
      const result = await pool.query(
        `select link.product_id, item.*
           from public.product_pos_links link
           join public.pos_items item on item.id = link.pos_item_id
          where link.product_id = any($1::uuid[])`,
        [productIds]
      );
      return result.rows.map((row) => ({
        productId: row.product_id,
        item: mapItem(row)
      }));
    },

    async listCustomers({ q = "", limit = 50 } = {}) {
      const result = await pool.query(
        `select *
           from public.pos_customers
          where ($1 = '' or name ilike '%' || $1 || '%' or id ilike '%' || $1 || '%')
          order by is_active desc, name asc
          limit $2`,
        [q, limit]
      );
      return result.rows.map(mapCustomer);
    },

    async getCustomerById(customerId) {
      const result = await pool.query(
        `select *
           from public.pos_customers
          where id = $1`,
        [customerId]
      );
      return mapCustomer(result.rows[0]);
    },

    async upsertCustomer(input) {
      const result = await pool.query(
        `insert into public.pos_customers (
           id,
           name,
           discount_rate,
           vat_enabled,
           is_overseas,
           is_active,
           pricing_rules,
           source_version,
           synced_at
         )
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())
         on conflict (id) do update
           set name = excluded.name,
               discount_rate = excluded.discount_rate,
               vat_enabled = excluded.vat_enabled,
               is_overseas = excluded.is_overseas,
               is_active = excluded.is_active,
               pricing_rules = excluded.pricing_rules,
               source_version = greatest(public.pos_customers.source_version, excluded.source_version),
               synced_at = now(),
               updated_at = now()
         where excluded.source_version >= public.pos_customers.source_version
         returning *`,
        [
          input.id,
          input.name,
          input.discountRate,
          input.vatEnabled,
          input.isOverseas,
          input.isActive,
          JSON.stringify(input.pricingRules || {}),
          input.sourceVersion || 0
        ]
      );
      return mapCustomer(result.rows[0]);
    },

    async linkBuyer(buyerId, posCustomerId, actorUid) {
      const result = await pool.query(
        `insert into public.buyer_pos_links (buyer_id, pos_customer_id, linked_by_uid)
         values ($1, $2, $3)
         on conflict (buyer_id) do update
           set pos_customer_id = excluded.pos_customer_id,
               linked_by_uid = excluded.linked_by_uid,
               linked_at = now(),
               updated_at = now()
         returning *`,
        [buyerId, posCustomerId, actorUid]
      );
      return result.rows[0] || null;
    },

    async listItems({ q = "", limit = 100 } = {}) {
      const result = await pool.query(
        `select *
           from public.pos_items
          where ($1 = '' or name ilike '%' || $1 || '%' or code ilike '%' || $1 || '%' or id ilike '%' || $1 || '%')
          order by is_active desc, name asc
          limit $2`,
        [q, limit]
      );
      return result.rows.map(mapItem);
    },

    async upsertItem(input) {
      const result = await pool.query(
        `insert into public.pos_items (
           id,
           code,
           name,
           category_id,
           base_price,
           discountable,
           is_active,
           pricing_rules,
           source_version,
           synced_at
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now())
         on conflict (id) do update
           set code = excluded.code,
               name = excluded.name,
               category_id = excluded.category_id,
               base_price = excluded.base_price,
               discountable = excluded.discountable,
               is_active = excluded.is_active,
               pricing_rules = excluded.pricing_rules,
               source_version = greatest(public.pos_items.source_version, excluded.source_version),
               synced_at = now(),
               updated_at = now()
         where excluded.source_version >= public.pos_items.source_version
         returning *`,
        [
          input.id,
          input.code || "",
          input.name,
          input.categoryId || "",
          input.basePrice,
          input.discountable,
          input.isActive,
          JSON.stringify(input.pricingRules || {}),
          input.sourceVersion || 0
        ]
      );
      return mapItem(result.rows[0]);
    },

    async linkProduct(productId, posItemId, actorUid) {
      const result = await pool.query(
        `insert into public.product_pos_links (product_id, pos_item_id, linked_by_uid)
         values ($1, $2, $3)
         on conflict (product_id) do update
           set pos_item_id = excluded.pos_item_id,
               linked_by_uid = excluded.linked_by_uid,
               linked_at = now(),
               updated_at = now()
         returning *`,
        [productId, posItemId, actorUid]
      );
      return result.rows[0] || null;
    },

    async beginIdempotency(actorUid, operation, idempotencyKey) {
      const inserted = await pool.query(
        `insert into public.pos_idempotency_keys (
           actor_uid,
           operation,
           idempotency_key
         )
         values ($1, $2, $3)
         on conflict (actor_uid, operation, idempotency_key) do nothing
         returning *`,
        [actorUid, operation, idempotencyKey]
      );
      if (inserted.rows[0]) return { claimed: true };
      const existing = await pool.query(
        `select *
           from public.pos_idempotency_keys
          where actor_uid = $1
            and operation = $2
            and idempotency_key = $3`,
        [actorUid, operation, idempotencyKey]
      );
      const row = existing.rows[0];
      return {
        claimed: false,
        completed: row?.status === "completed",
        responseStatus: row?.response_status || null,
        responseBody: row?.response_body || null
      };
    },

    async completeIdempotency(actorUid, operation, idempotencyKey, responseStatus, responseBody) {
      await pool.query(
        `update public.pos_idempotency_keys
            set status = 'completed',
                response_status = $4,
                response_body = $5::jsonb,
                updated_at = now()
          where actor_uid = $1
            and operation = $2
            and idempotency_key = $3`,
        [actorUid, operation, idempotencyKey, responseStatus, JSON.stringify(responseBody)]
      );
    },

    async clearIdempotency(actorUid, operation, idempotencyKey) {
      await pool.query(
        `delete from public.pos_idempotency_keys
          where actor_uid = $1
            and operation = $2
            and idempotency_key = $3
            and status = 'pending'`,
        [actorUid, operation, idempotencyKey]
      );
    }
  };
}
