function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin FX queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin FX writes.");
  }
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

function mapRate(row) {
  return {
    id: row.id,
    provider: row.provider,
    baseCurrency: row.base_currency,
    quoteCurrency: row.quote_currency,
    krwPerUnit: row.krw_per_unit,
    rateScaled: row.rate_scaled,
    sourceEffectiveAt: row.source_effective_at,
    fetchedAt: row.fetched_at,
    createdAt: row.created_at
  };
}

function mapRun(row) {
  return {
    id: row.id,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    thresholdBps: row.threshold_bps,
    snapshotEffectiveAt: row.snapshot_effective_at,
    draftCount: row.draft_count,
    failureCategory: row.failure_category,
    createdAt: row.created_at
  };
}

function mapDraft(row) {
  return {
    id: row.id,
    productPriceId: row.product_price_id,
    productId: row.product_id,
    productCode: row.product_code,
    productNameKo: row.product_name_ko,
    productNameEn: row.product_name_en,
    actionType: row.action_type,
    targetMarket: row.target_market,
    targetCurrency: row.target_currency,
    currentAmount: row.current_amount,
    proposedAmount: row.proposed_amount,
    rateChangeBps: row.rate_change_bps,
    status: row.status,
    reason: row.reason,
    sourcePriceUpdatedAt: row.source_price_updated_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at
  };
}

async function insertAudit(client, action, targetId, beforeSnapshot, afterSnapshot, actor) {
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
      action,
      "fx_price_drafts",
      targetId,
      beforeSnapshot,
      afterSnapshot,
      actor.requestId,
      actor.ipAddress,
      actor.userAgent
    ]
  );
  return auditResult.rows[0].id;
}

export function createAdminFxQueries(pool) {
  return {
    async getFxStatus() {
      assertPool(pool);
      const [rateResult, runResult, draftResult] = await Promise.all([
        pool.query(`
          select distinct on (quote_currency) *
          from public.fx_rate_snapshots
          order by quote_currency, source_effective_at desc, created_at desc
        `),
        pool.query(`
          select *
          from public.fx_review_runs
          order by created_at desc
          limit 1
        `),
        pool.query(`
          select status, count(*)::int as count
          from public.fx_price_drafts
          group by status
        `)
      ]);
      return {
        latestRates: rateResult.rows.map(mapRate),
        lastReviewRun: runResult.rows[0] ? mapRun(runResult.rows[0]) : null,
        draftCounts: Object.fromEntries(draftResult.rows.map((row) => [row.status, row.count]))
      };
    },

    async listFxRates() {
      assertPool(pool);
      const result = await pool.query(`
        select distinct on (quote_currency) *
        from public.fx_rate_snapshots
        order by quote_currency, source_effective_at desc, created_at desc
      `);
      return result.rows.map(mapRate);
    },

    async listFxReviewRuns() {
      assertPool(pool);
      const result = await pool.query(`
        select *
        from public.fx_review_runs
        order by created_at desc
        limit 20
      `);
      return result.rows.map(mapRun);
    },

    async listFxDrafts(filters = {}) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            fpd.*,
            p.code as product_code,
            p.name_ko as product_name_ko,
            p.name_en as product_name_en
          from public.fx_price_drafts fpd
          join public.products p on p.id = fpd.product_id
          where ($1::text is null or fpd.status = $1)
            and ($2::text is null or fpd.target_market = $2)
            and ($3::text is null or fpd.target_currency = $3)
          order by fpd.created_at desc
          limit 100
        `,
        [filters.status || null, filters.market || null, filters.currency || null]
      );
      return result.rows.map(mapDraft);
    },

    async importFxRateSnapshots(snapshot, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const inserted = [];
        for (const rate of Object.values(snapshot.rates)) {
          const result = await client.query(
            `
              insert into public.fx_rate_snapshots (
                provider,
                base_currency,
                quote_currency,
                krw_per_unit,
                rate_scaled,
                source_effective_at,
                fetched_at,
                payload_hash
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8)
              on conflict (provider, quote_currency, source_effective_at) do nothing
              returning *
            `,
            [
              snapshot.provider,
              snapshot.baseCurrency,
              rate.currency,
              rate.krwPerUnit,
              rate.rateScaled,
              snapshot.sourceEffectiveAt,
              snapshot.fetchedAt,
              snapshot.payloadHash
            ]
          );
          if (result.rows[0]) inserted.push(mapRate(result.rows[0]));
        }
        const auditLogId = await insertAudit(
          client,
          "admin.fx.rate_snapshots.import",
          null,
          null,
          { provider: snapshot.provider, insertedCount: inserted.length, sourceEffectiveAt: snapshot.sourceEffectiveAt },
          actor
        );
        await client.query("commit");
        return { insertedCount: inserted.length, rates: inserted, auditLogId };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async createFxReviewRun(input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const runResult = await client.query(
          `
            insert into public.fx_review_runs (
              scheduled_for,
              started_at,
              completed_at,
              status,
              threshold_bps,
              snapshot_effective_at,
              draft_count
            )
            values (now(), now(), now(), 'completed', $1, now(), 0)
            returning *
          `,
          [input.thresholdBps]
        );
        const run = mapRun(runResult.rows[0]);
        const auditLogId = await insertAudit(
          client,
          "admin.fx.review_run.create",
          run.id,
          null,
          { thresholdBps: input.thresholdBps, draftCount: 0 },
          actor
        );
        await client.query("commit");
        return { reviewRun: run, auditLogId };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async approveFxDraft(draftId, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const draftResult = await client.query(
          `
            select *
            from public.fx_price_drafts
            where id = $1
            for update
          `,
          [draftId]
        );
        const draft = draftResult.rows[0];
        if (!draft || draft.status !== "pending") {
          await client.query("rollback");
          return { stale: true };
        }

        if (draft.product_price_id) {
          const priceResult = await client.query(
            `
              select id, wholesale_price, updated_at
              from public.product_prices
              where id = $1
              for update
            `,
            [draft.product_price_id]
          );
          const price = priceResult.rows[0];
          if (!price || String(price.updated_at) !== String(draft.source_price_updated_at)) {
            await client.query("rollback");
            return { stale: true };
          }
          await client.query(
            `
              update public.product_prices
              set
                wholesale_price = $2,
                fx_anchor_snapshot_id = $3,
                fx_last_applied_at = now(),
                fx_last_reviewed_at = now(),
                updated_at = now()
              where id = $1
            `,
            [draft.product_price_id, draft.proposed_amount, draft.current_rate_snapshot_id]
          );
        }

        const approvedResult = await client.query(
          `
            update public.fx_price_drafts
            set status = 'approved', reviewed_by = $2, reviewed_at = now()
            where id = $1
            returning *
          `,
          [draftId, actor.userId]
        );
        const auditLogId = await insertAudit(
          client,
          "admin.fx.price_draft.approve",
          draftId,
          mapDraft(draft),
          mapDraft(approvedResult.rows[0]),
          actor
        );
        await client.query("commit");
        return { draft: mapDraft(approvedResult.rows[0]), auditLogId };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async rejectFxDraft(draftId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const existingResult = await client.query(
          "select * from public.fx_price_drafts where id = $1 for update",
          [draftId]
        );
        const existing = existingResult.rows[0];
        if (!existing || existing.status !== "pending") {
          await client.query("rollback");
          return { stale: true };
        }
        const updatedResult = await client.query(
          `
            update public.fx_price_drafts
            set status = 'rejected', reason = $2, reviewed_by = $3, reviewed_at = now()
            where id = $1
            returning *
          `,
          [draftId, input.reason, actor.userId]
        );
        const auditLogId = await insertAudit(
          client,
          "admin.fx.price_draft.reject",
          draftId,
          mapDraft(existing),
          mapDraft(updatedResult.rows[0]),
          actor
        );
        await client.query("commit");
        return { draft: mapDraft(updatedResult.rows[0]), auditLogId };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async setProductPriceFxManaged(priceId, enabled, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const existingResult = await client.query(
          "select id, market, currency, fx_managed from public.product_prices where id = $1 for update",
          [priceId]
        );
        const existing = existingResult.rows[0];
        if (!existing || existing.market !== input.market || existing.currency !== input.currency) {
          await client.query("rollback");
          return { stale: true };
        }
        const updatedResult = await client.query(
          `
            update public.product_prices
            set fx_managed = $2, fx_last_reviewed_at = now(), updated_at = now()
            where id = $1
            returning id, market, currency, fx_managed
          `,
          [priceId, enabled]
        );
        const auditLogId = await insertAudit(
          client,
          enabled ? "admin.fx.price.enable" : "admin.fx.price.disable",
          priceId,
          existing,
          updatedResult.rows[0],
          actor
        );
        await client.query("commit");
        return { price: updatedResult.rows[0], auditLogId };
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          // Preserve the original query error.
        }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
