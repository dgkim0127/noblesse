function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin price queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for admin price writes.");
  }
}

function mapPrice(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    productNameKo: row.product_name_ko,
    productNameEn: row.product_name_en,
    market: row.market,
    currency: row.currency,
    wholesalePrice: row.wholesale_price,
    retailPrice: row.retail_price,
    moq: row.moq,
    minOrderAmount: row.min_order_amount,
    visibleTo: row.visible_to,
    isActive: row.is_active,
    updatedAt: row.updated_at
  };
}

function createPriceSnapshot(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    market: row.market,
    currency: row.currency,
    wholesalePrice: row.wholesale_price,
    moq: row.moq,
    isActive: row.is_active,
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

const priceSelect = `
  select
    pp.id,
    pp.product_id,
    p.code as product_code,
    p.name_ko as product_name_ko,
    p.name_en as product_name_en,
    pp.market,
    pp.currency,
    pp.wholesale_price,
    pp.retail_price,
    pp.moq,
    pp.min_order_amount,
    pp.visible_to,
    pp.is_active,
    pp.updated_at
  from public.product_prices pp
  join public.products p on p.id = pp.product_id
`;

async function insertAudit(client, action, priceId, beforeSnapshot, afterSnapshot, actor) {
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
      "product_prices",
      priceId,
      beforeSnapshot,
      afterSnapshot,
      actor.requestId,
      actor.ipAddress,
      actor.userAgent
    ]
  );
  return auditResult.rows[0].id;
}

async function upsertManualPricePolicy(client, row) {
  const sourceResult = row.market === "KR" && row.currency === "KRW"
    ? { rows: [{ id: row.id }] }
    : await client.query(
        `
          select id
          from public.product_prices
          where product_id = $1 and market = 'KR' and currency = 'KRW'
          limit 1
        `,
        [row.product_id]
      );
  await client.query(
    `
      insert into public.product_price_policies (
        product_id,
        target_market,
        target_currency,
        pricing_mode,
        source_price_id,
        published_price_id,
        status
      )
      values ($1, $2, $3, 'manual_fixed', $4, $5, 'active')
      on conflict (product_id, target_market, target_currency) do update
        set pricing_mode = 'manual_fixed',
            source_price_id = excluded.source_price_id,
            published_price_id = excluded.published_price_id,
            status = 'active',
            paused_at = null,
            pause_reason = null,
            updated_at = now()
    `,
    [row.product_id, row.market, row.currency, sourceResult.rows[0]?.id || null, row.id]
  );
}

async function upsertPriceRow(client, productId, input) {
  const result = await client.query(
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
      values ($1, $2, $3, $4, $5, $6, $7, 'approved_only', $8)
      on conflict (product_id, market) do update
        set currency = excluded.currency,
            wholesale_price = excluded.wholesale_price,
            retail_price = excluded.retail_price,
            moq = excluded.moq,
            min_order_amount = excluded.min_order_amount,
            is_active = excluded.is_active,
            updated_at = now()
      returning id
    `,
    [
      productId,
      input.market,
      input.currency,
      input.wholesalePrice,
      input.retailPrice,
      input.moq,
      input.minOrderAmount,
      input.isActive
    ]
  );
  const rowResult = await client.query(`${priceSelect} where pp.id = $1 limit 1`, [result.rows[0].id]);
  return rowResult.rows[0];
}

async function upsertFxAutoPolicy(client, productId, marketConfig, sourcePrice) {
  const result = await client.query(
    `
      insert into public.product_price_policies (
        product_id,
        target_market,
        target_currency,
        pricing_mode,
        source_price_id,
        published_price_id,
        status,
        latest_source_price_updated_at
      )
      values ($1, $2, $3, 'fx_auto', $4, null, 'pending_rate', $5)
      on conflict (product_id, target_market, target_currency) do update
        set pricing_mode = 'fx_auto',
            source_price_id = excluded.source_price_id,
            published_price_id = null,
            status = 'pending_rate',
            paused_at = null,
            pause_reason = null,
            latest_source_price_updated_at = excluded.latest_source_price_updated_at,
            updated_at = now()
      returning *
    `,
    [productId, marketConfig.market, marketConfig.currency, sourcePrice.id, sourcePrice.updated_at]
  );
  return result.rows[0];
}

export function createAdminPriceQueries(pool) {
  return {
    async listPrices(filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          ${priceSelect}
          where ($1::text is null or pp.market = $1)
            and ($2::boolean is null or pp.is_active = $2)
            and (
              $3::text is null
              or p.code ilike $3
              or p.name_ko ilike $3
              or p.name_en ilike $3
            )
          order by p.code asc, pp.market asc
          limit $4 offset $5
        `,
        [
          filters.market || null,
          filters.active ?? null,
          filters.q ? `%${filters.q}%` : null,
          filters.dbLimit || filters.limit,
          filters.offset
        ]
      );
      return result.rows.map(mapPrice);
    },

    async getPriceById(priceId) {
      assertPool(pool);
      const result = await pool.query(
        `${priceSelect} where pp.id = $1 limit 1`,
        [priceId]
      );
      return result.rows[0] ? mapPrice(result.rows[0]) : null;
    },

    async createPrice(input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const productResult = await client.query(
          "select id, code from public.products where code = $1 limit 1",
          [input.productCode]
        );
        const product = productResult.rows[0];
        if (!product) {
          await client.query("rollback");
          return { missingProduct: true };
        }

        const insertResult = await client.query(
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
            values ($1, $2, $3, $4, $5, $6, $7, 'approved_only', $8)
            on conflict (product_id, market) do nothing
            returning id
          `,
          [
            product.id,
            input.market,
            input.currency,
            input.wholesalePrice,
            input.retailPrice,
            input.moq,
            input.minOrderAmount,
            input.isActive
          ]
        );
        if (!insertResult.rows[0]) {
          await client.query("rollback");
          return { conflict: "product_market" };
        }

        const createdResult = await client.query(
          `${priceSelect} where pp.id = $1 limit 1`,
          [insertResult.rows[0].id]
        );
        const row = createdResult.rows[0];
        await upsertManualPricePolicy(client, row);
        const auditLogId = await insertAudit(
          client,
          "admin.product_price.create",
          row.id,
          null,
          createPriceSnapshot(row),
          actor
        );

        await client.query("commit");
        return { price: mapPrice(row), auditLogId };
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

    async updatePrice(priceId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const existingResult = await client.query(
          `${priceSelect} where pp.id = $1 for update of pp`,
          [priceId]
        );
        const existingRow = existingResult.rows[0];
        if (!existingRow) {
          await client.query("rollback");
          return null;
        }

        const updateResult = await client.query(
          `
            update public.product_prices
            set
              currency = coalesce($2, currency),
              wholesale_price = coalesce($3, wholesale_price),
              retail_price = coalesce($4, retail_price),
              moq = coalesce($5, moq),
              min_order_amount = coalesce($6, min_order_amount),
              is_active = coalesce($7, is_active),
              updated_at = now()
            where id = $1
            returning id
          `,
          [
            priceId,
            input.currency,
            input.wholesalePrice,
            input.retailPrice,
            input.moq,
            input.minOrderAmount,
            input.isActive
          ]
        );
        const updatedResult = await client.query(
          `${priceSelect} where pp.id = $1 limit 1`,
          [updateResult.rows[0].id]
        );
        const row = updatedResult.rows[0];
        await upsertManualPricePolicy(client, row);
        const auditLogId = await insertAudit(
          client,
          "admin.product_price.update",
          priceId,
          createPriceSnapshot(existingRow),
          createPriceSnapshot(row),
          actor
        );

        await client.query("commit");
        return { price: mapPrice(row), auditLogId };
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

    async setupProductPriceBooks(productId, input, adminViewer = {}) {
      assertTransactionPool(pool);
      const client = await pool.connect();
      const actor = getAdminActor(adminViewer);

      try {
        await client.query("begin");
        const productResult = await client.query(
          "select id, code, moq_default from public.products where id = $1 for update",
          [productId]
        );
        const product = productResult.rows[0];
        if (!product) {
          await client.query("rollback");
          return null;
        }

        const krRow = await upsertPriceRow(client, productId, input.kr);
        await upsertManualPricePolicy(client, krRow);

        const prices = [mapPrice(krRow)];
        const policies = [];
        let autoPolicyCount = 0;
        for (const marketConfig of input.markets) {
          if (marketConfig.pricingMode === "manual_fixed") {
            const manualRow = await upsertPriceRow(client, productId, {
              ...marketConfig,
              moq: marketConfig.moq ?? krRow.moq ?? product.moq_default ?? 1,
              minOrderAmount: marketConfig.minOrderAmount ?? 0,
              isActive: marketConfig.isActive ?? true
            });
            await upsertManualPricePolicy(client, manualRow);
            prices.push(mapPrice(manualRow));
            continue;
          }
          const policy = await upsertFxAutoPolicy(client, productId, marketConfig, krRow);
          policies.push(policy);
          autoPolicyCount += 1;
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
            values ($1, $2, 'admin.product_price_books.setup', 'products', $3, null, $4::jsonb, $5, $6, $7)
            returning id
          `,
          [
            actor.userId,
            actor.role,
            productId,
            {
              productId,
              markets: [input.kr.market, ...input.markets.map((entry) => entry.market)],
              autoPolicyCount
            },
            actor.requestId,
            actor.ipAddress,
            actor.userAgent
          ]
        );

        await client.query("commit");
        return {
          prices,
          policies: policies.map((policy) => ({
            id: policy.id,
            productId: policy.product_id,
            targetMarket: policy.target_market,
            targetCurrency: policy.target_currency,
            pricingMode: policy.pricing_mode,
            status: policy.status
          })),
          autoPolicyCount,
          auditLogId: auditResult.rows[0].id
        };
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
