import { evaluateFxAutoPolicy } from "../../fx/fxAutoPriceEngine.js";
import { FX_PRICING_MODES } from "../../fx/fxAutoPricePolicy.js";

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
    triggerType: row.trigger_type,
    provider: row.provider,
    sourceEffectiveAt: row.source_effective_at,
    payloadHash: row.payload_hash,
    updateThresholdBps: row.update_threshold_bps,
    circuitBreakerBps: row.circuit_breaker_bps,
    maxRateAgeHours: row.max_rate_age_hours,
    status: row.status,
    evaluatedCount: row.evaluated_count,
    createdCount: row.created_count,
    updatedCount: row.updated_count,
    heldCount: row.held_count,
    blockedCount: row.blocked_count,
    errorCount: row.error_count,
    failureCategory: row.failure_category,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

function mapPolicy(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    productNameKo: row.product_name_ko,
    productNameEn: row.product_name_en,
    targetMarket: row.target_market,
    targetCurrency: row.target_currency,
    pricingMode: row.pricing_mode,
    sourcePriceId: row.source_price_id,
    publishedPriceId: row.published_price_id,
    status: row.status,
    currentWholesalePrice: row.current_wholesale_price,
    latestReferenceWholesalePrice: row.latest_reference_wholesale_price,
    latestReferenceRetailPrice: row.latest_reference_retail_price,
    latestReferenceMinOrderAmount: row.latest_reference_min_order_amount,
    divergenceBps: row.divergence_bps,
    rateChangeBps: row.rate_change_bps,
    latestRate: row.latest_rate,
    sourceEffectiveAt: row.source_effective_at,
    fetchedAt: row.fetched_at,
    lastEvaluatedAt: row.last_evaluated_at,
    lastAppliedAt: row.last_applied_at,
    pausedAt: row.paused_at,
    pauseReason: row.pause_reason,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

function mapEvent(row) {
  return {
    id: row.id,
    runId: row.run_id,
    policyId: row.policy_id,
    productId: row.product_id,
    productCode: row.product_code,
    targetMarket: row.target_market,
    targetCurrency: row.target_currency,
    pricingMode: row.pricing_mode,
    action: row.action,
    previousWholesalePrice: row.previous_wholesale_price,
    referenceWholesalePrice: row.reference_wholesale_price,
    appliedWholesalePrice: row.applied_wholesale_price,
    divergenceBps: row.divergence_bps,
    rateChangeBps: row.rate_change_bps,
    sourcePriceUpdatedAt: row.source_price_updated_at,
    reason: row.reason,
    createdAt: row.created_at
  };
}

async function insertAudit(client, action, targetTable, targetId, beforeSnapshot, afterSnapshot, actor) {
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
      targetTable,
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

async function runEvaluationTransaction(client, { triggerType, productId = null, thresholds, snapshotBundle = null, actor }) {
  const runResult = await client.query(
    `
      insert into public.fx_auto_price_runs (
        trigger_type,
        provider,
        source_effective_at,
        payload_hash,
        update_threshold_bps,
        circuit_breaker_bps,
        max_rate_age_hours,
        status,
        started_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'running', now())
      returning *
    `,
    [
      triggerType,
      snapshotBundle?.provider || null,
      snapshotBundle?.sourceEffectiveAt || null,
      snapshotBundle?.payloadHash || null,
      thresholds.updateThresholdBps,
      thresholds.circuitBreakerBps,
      thresholds.maxRateAgeHours
    ]
  );
  const run = runResult.rows[0];

  const policyResult = await client.query(
    `
      select
        ppp.*,
        p.code as product_code,
        source.wholesale_price as source_wholesale_price,
        source.retail_price as source_retail_price,
        source.min_order_amount as source_min_order_amount,
        source.updated_at as source_updated_at,
        published.wholesale_price as current_wholesale_price,
        published.retail_price as current_retail_price,
        published.min_order_amount as current_min_order_amount,
        published.updated_at as published_updated_at,
        applied.rate_scaled as last_applied_rate_scaled
      from public.product_price_policies ppp
      join public.products p on p.id = ppp.product_id
      left join public.product_prices source on source.id = ppp.source_price_id
      left join public.product_prices published on published.id = ppp.published_price_id
      left join public.fx_rate_snapshots applied on applied.id = ppp.last_applied_rate_snapshot_id
      where ppp.pricing_mode = 'fx_auto'
        and ($1::uuid is null or ppp.product_id = $1)
      for update of ppp
    `,
    [productId]
  );

  const latestRates = snapshotBundle?.rates || Object.fromEntries((await client.query(`
    select distinct on (quote_currency) *
    from public.fx_rate_snapshots
    order by quote_currency, source_effective_at desc, created_at desc
  `)).rows.map((row) => [row.quote_currency, mapRate(row)]));

  const effectiveBundle = snapshotBundle || {
    provider: latestRates.USD?.provider || latestRates.JPY?.provider || latestRates.CNY?.provider || null,
    sourceEffectiveAt: latestRates.USD?.sourceEffectiveAt || latestRates.JPY?.sourceEffectiveAt || latestRates.CNY?.sourceEffectiveAt || null,
    payloadHash: latestRates.USD?.payloadHash || null,
    rates: latestRates
  };

  const counters = { evaluated: 0, created: 0, updated: 0, held: 0, blocked: 0, error: 0 };
  for (const row of policyResult.rows) {
    counters.evaluated += 1;
    const policy = {
      id: row.id,
      productId: row.product_id,
      targetMarket: row.target_market,
      targetCurrency: row.target_currency,
      pricingMode: row.pricing_mode,
      status: row.status,
      sourcePriceUpdatedAt: row.source_price_updated_at,
      lastAppliedRateScaled: row.last_applied_rate_scaled
    };
    const sourcePrice = row.source_price_id ? {
      id: row.source_price_id,
      wholesalePrice: row.source_wholesale_price,
      retailPrice: row.source_retail_price,
      minOrderAmount: row.source_min_order_amount,
      updatedAt: row.source_updated_at
    } : null;
    const publishedPrice = row.published_price_id ? {
      id: row.published_price_id,
      wholesalePrice: row.current_wholesale_price,
      retailPrice: row.current_retail_price,
      minOrderAmount: row.current_min_order_amount,
      updatedAt: row.published_updated_at
    } : null;
    const evaluation = evaluateFxAutoPolicy({
      policy,
      sourcePrice,
      publishedPrice,
      snapshotBundle: effectiveBundle,
      thresholds
    });

    if (evaluation.status === "created") counters.created += 1;
    else if (evaluation.status === "updated") counters.updated += 1;
    else if (evaluation.status === "held_deadband") counters.held += 1;
    else if (evaluation.status?.startsWith("blocked")) counters.blocked += 1;
    else if (evaluation.status === "error") counters.error += 1;

    let appliedPriceId = row.published_price_id;
    const shouldApply = ["initial_created", "auto_updated"].includes(evaluation.action);
    if (shouldApply && evaluation.reference?.wholesalePrice != null) {
      if (appliedPriceId) {
        await client.query(
          `
            update public.product_prices
            set
              wholesale_price = $2,
              retail_price = $3,
              min_order_amount = coalesce($4, min_order_amount),
              updated_at = now()
            where id = $1
          `,
          [
            appliedPriceId,
            evaluation.reference.wholesalePrice,
            evaluation.reference.retailPrice,
            evaluation.reference.minOrderAmount
          ]
        );
      } else {
        const insertPrice = await client.query(
          `
            insert into public.product_prices (
              product_id,
              market,
              currency,
              wholesale_price,
              retail_price,
              moq,
              min_order_amount,
              visible_to,
              is_active
            )
            values ($1, $2, $3, $4, $5, 1, coalesce($6, 0), 'approved_only', true)
            on conflict (product_id, market) do update
              set wholesale_price = excluded.wholesale_price,
                  retail_price = excluded.retail_price,
                  min_order_amount = excluded.min_order_amount,
                  updated_at = now()
            returning id
          `,
          [
            row.product_id,
            row.target_market,
            row.target_currency,
            evaluation.reference.wholesalePrice,
            evaluation.reference.retailPrice,
            evaluation.reference.minOrderAmount
          ]
        );
        appliedPriceId = insertPrice.rows[0].id;
      }
    }

    await client.query(
      `
        update public.product_price_policies
        set
          published_price_id = coalesce($2, published_price_id),
          status = $3,
          latest_reference_wholesale_price = $4,
          latest_reference_retail_price = $5,
          latest_reference_min_order_amount = $6,
          latest_reference_rate_snapshot_id = $7,
          last_applied_rate_snapshot_id = case when $8::boolean then $7 else last_applied_rate_snapshot_id end,
          source_price_updated_at = coalesce($9, source_price_updated_at),
          last_evaluated_at = now(),
          last_applied_at = case when $8::boolean then now() else last_applied_at end,
          updated_at = now()
        where id = $1
      `,
      [
        row.id,
        appliedPriceId,
        evaluation.status,
        evaluation.reference?.wholesalePrice ?? null,
        evaluation.reference?.retailPrice ?? null,
        evaluation.reference?.minOrderAmount ?? null,
        evaluation.rateSnapshotId,
        shouldApply,
        sourcePrice?.updatedAt ?? null
      ]
    );

    await client.query(
      `
        insert into public.fx_auto_price_events (
          run_id,
          policy_id,
          product_id,
          target_market,
          target_currency,
          pricing_mode,
          action,
          previous_wholesale_price,
          reference_wholesale_price,
          applied_wholesale_price,
          divergence_bps,
          rate_change_bps,
          rate_snapshot_id,
          source_price_updated_at,
          reason
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        on conflict do nothing
      `,
      [
        run.id,
        row.id,
        row.product_id,
        row.target_market,
        row.target_currency,
        row.pricing_mode,
        evaluation.action,
        row.current_wholesale_price,
        evaluation.reference?.wholesalePrice ?? null,
        shouldApply ? evaluation.reference?.wholesalePrice ?? null : null,
        evaluation.divergenceBps,
        evaluation.rateChangeBps,
        evaluation.rateSnapshotId,
        sourcePrice?.updatedAt ?? null,
        evaluation.reason
      ]
    );

    if (shouldApply) {
      await insertAudit(
        client,
        evaluation.action === "initial_created" ? "fx.auto.price.create" : "fx.auto.price.update",
        "product_prices",
        appliedPriceId,
        { productId: row.product_id, market: row.target_market, previousWholesalePrice: row.current_wholesale_price },
        { referenceWholesalePrice: evaluation.reference.wholesalePrice, rateSnapshotId: evaluation.rateSnapshotId },
        actor
      );
    }
  }

  const completedResult = await client.query(
    `
      update public.fx_auto_price_runs
      set
        status = 'completed',
        evaluated_count = $2,
        created_count = $3,
        updated_count = $4,
        held_count = $5,
        blocked_count = $6,
        error_count = $7,
        completed_at = now()
      where id = $1
      returning *
    `,
    [run.id, counters.evaluated, counters.created, counters.updated, counters.held, counters.blocked, counters.error]
  );

  const auditLogId = await insertAudit(
    client,
    "fx.auto.run.completed",
    "fx_auto_price_runs",
    run.id,
    null,
    counters,
    actor
  );
  return { run: mapRun(completedResult.rows[0]), auditLogId };
}

export function createAdminFxQueries(pool) {
  return {
    async getFxStatus() {
      assertPool(pool);
      const [rateResult, runResult, policyResult] = await Promise.all([
        pool.query(`
          select distinct on (quote_currency) *
          from public.fx_rate_snapshots
          order by quote_currency, source_effective_at desc, created_at desc
        `),
        pool.query(`
          select *
          from public.fx_auto_price_runs
          order by created_at desc
          limit 1
        `),
        pool.query(`
          select status, count(*)::int as count
          from public.product_price_policies
          group by status
        `)
      ]);
      return {
        latestRates: rateResult.rows.map(mapRate),
        lastRun: runResult.rows[0] ? mapRun(runResult.rows[0]) : null,
        priceCounts: Object.fromEntries(policyResult.rows.map((row) => [row.status, row.count]))
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

    async listFxAutoRuns() {
      assertPool(pool);
      const result = await pool.query(`
        select *
        from public.fx_auto_price_runs
        order by created_at desc
        limit 20
      `);
      return result.rows.map(mapRun);
    },

    async listFxAutoPrices(filters = {}) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            ppp.*,
            p.code as product_code,
            p.name_ko as product_name_ko,
            p.name_en as product_name_en,
            pp.wholesale_price as current_wholesale_price,
            fr.krw_per_unit as latest_rate,
            fr.source_effective_at,
            fr.fetched_at,
            (
              case
                when pp.wholesale_price is null or ppp.latest_reference_wholesale_price is null then null
                when pp.wholesale_price = 0 and ppp.latest_reference_wholesale_price > 0 then 10000
                else round(abs(ppp.latest_reference_wholesale_price - pp.wholesale_price) * 10000 / greatest(abs(pp.wholesale_price), 1))::int
              end
            ) as divergence_bps,
            null::int as rate_change_bps
          from public.product_price_policies ppp
          join public.products p on p.id = ppp.product_id
          left join public.product_prices pp on pp.id = ppp.published_price_id
          left join public.fx_rate_snapshots fr on fr.id = ppp.latest_reference_rate_snapshot_id
          where ($1::text is null or ppp.status = $1)
            and ($2::text is null or ppp.target_market = $2)
            and ($3::text is null or ppp.target_currency = $3)
            and ($4::text is null or ppp.pricing_mode = $4)
            and (
              $5::text is null
              or p.code ilike $5
              or p.name_ko ilike $5
              or p.name_en ilike $5
            )
          order by p.code asc, ppp.target_market asc
          limit 100
        `,
        [
          filters.status || null,
          filters.market || null,
          filters.currency || null,
          filters.mode || null,
          filters.q ? `%${filters.q}%` : null
        ]
      );
      return result.rows.map(mapPolicy);
    },

    async listFxAutoHistory(policyId) {
      assertPool(pool);
      const result = await pool.query(
        `
          select fape.*, p.code as product_code
          from public.fx_auto_price_events fape
          join public.products p on p.id = fape.product_id
          where fape.policy_id = $1
          order by fape.created_at desc
          limit 50
        `,
        [policyId]
      );
      return result.rows.map(mapEvent);
    },

    async importFxRateSnapshotsAndEvaluate(snapshot, thresholds, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const rates = {};
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
              on conflict (provider, quote_currency, source_effective_at, payload_hash) do update
                set fetched_at = excluded.fetched_at
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
          rates[rate.currency] = mapRate(result.rows[0]);
        }
        const evaluation = await runEvaluationTransaction(client, {
          triggerType: "rate_snapshot",
          thresholds,
          snapshotBundle: { ...snapshot, rates },
          actor
        });
        await client.query("commit");
        return { insertedCount: Object.keys(rates).length, ...evaluation };
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

    async evaluateFxAutoPrices(thresholds, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const result = await runEvaluationTransaction(client, {
          triggerType: "manual_recheck",
          thresholds,
          actor
        });
        await client.query("commit");
        return result;
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

    async evaluateFxAutoPricesForProduct(productId, thresholds, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const result = await runEvaluationTransaction(client, {
          triggerType: "base_price_change",
          productId,
          thresholds,
          actor
        });
        await client.query("commit");
        return result;
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

    async setProductMarketPricingMode(productId, market, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const sourceResult = await client.query(
          `
            select id, updated_at
            from public.product_prices
            where product_id = $1 and market = 'KR' and currency = 'KRW'
            limit 1
          `,
          [productId]
        );
        const source = sourceResult.rows[0] || null;
        if (input.pricingMode === FX_PRICING_MODES.FX_AUTO && !source) {
          await client.query("rollback");
          return { missingSourcePrice: true };
        }
        const publishedResult = await client.query(
          `
            select id
            from public.product_prices
            where product_id = $1 and market = $2 and currency = $3
            limit 1
          `,
          [productId, market, input.currency]
        );
        const published = publishedResult.rows[0] || null;
        const upsertResult = await client.query(
          `
            insert into public.product_price_policies (
              product_id,
              target_market,
              target_currency,
              pricing_mode,
              source_price_id,
              published_price_id,
              status,
              source_price_updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            on conflict (product_id, target_market, target_currency) do update
              set pricing_mode = excluded.pricing_mode,
                  source_price_id = excluded.source_price_id,
                  published_price_id = excluded.published_price_id,
                  status = excluded.status,
                  source_price_updated_at = excluded.source_price_updated_at,
                  paused_at = null,
                  pause_reason = null,
                  updated_at = now()
            returning *
          `,
          [
            productId,
            market,
            input.currency,
            input.pricingMode,
            input.pricingMode === FX_PRICING_MODES.FX_AUTO ? source.id : null,
            published?.id || null,
            input.pricingMode === FX_PRICING_MODES.FX_AUTO ? "pending_rate" : "active",
            source?.updated_at || null
          ]
        );
        const auditLogId = await insertAudit(
          client,
          "fx.auto.mode.change",
          "product_price_policies",
          upsertResult.rows[0].id,
          null,
          { productId, market, currency: input.currency, pricingMode: input.pricingMode },
          actor
        );
        await client.query("commit");
        return { policy: mapPolicy(upsertResult.rows[0]), auditLogId };
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

    async pauseFxAutoPolicy(policyId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const updated = await client.query(
          `
            update public.product_price_policies
            set status = 'paused', paused_at = now(), pause_reason = $2, updated_at = now()
            where id = $1
            returning *
          `,
          [policyId, input.reason]
        );
        const auditLogId = await insertAudit(client, "fx.auto.pause", "product_price_policies", policyId, null, input, actor);
        await client.query("commit");
        return { policy: mapPolicy(updated.rows[0]), auditLogId };
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

    async resumeFxAutoPolicy(policyId, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);
      try {
        await client.query("begin");
        const updated = await client.query(
          `
            update public.product_price_policies
            set status = 'pending_rate', paused_at = null, pause_reason = null, updated_at = now()
            where id = $1
            returning *
          `,
          [policyId]
        );
        const auditLogId = await insertAudit(client, "fx.auto.resume", "product_price_policies", policyId, null, { resumed: true }, actor);
        await client.query("commit");
        return { policy: mapPolicy(updated.rows[0]), auditLogId };
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
