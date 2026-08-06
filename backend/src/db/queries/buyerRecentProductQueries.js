function mapRecentProduct(row) {
  return {
    productCode: row.product_code,
    viewedAt: row.viewed_at
  };
}

function assertTransactionPool(pool) {
  if (!pool?.connect) {
    throw new Error("PostgreSQL transaction pool is not configured.");
  }
}

async function pruneBuyerHistory(client, buyerId, limit, retentionDays) {
  await client.query(
    `
      delete from public.buyer_recent_product_views views
      using public.products products
      where views.buyer_id = $1
        and views.product_id = products.id
        and (
          products.is_visible = false
          or coalesce(products.is_export_available, true) = false
        )
    `,
    [buyerId]
  );

  await client.query(
    `
      delete from public.buyer_recent_product_views
      where buyer_id = $1
        and viewed_at < now() - make_interval(days => $2::int)
    `,
    [buyerId, retentionDays]
  );

  await client.query(
    `
      with ranked as (
        select
          product_id,
          row_number() over (order by viewed_at desc, product_id) as recent_rank
        from public.buyer_recent_product_views
        where buyer_id = $1
      )
      delete from public.buyer_recent_product_views views
      using ranked
      where views.buyer_id = $1
        and views.product_id = ranked.product_id
        and ranked.recent_rank > $2
    `,
    [buyerId, limit]
  );
}

export function createBuyerRecentProductQueries(pool) {
  return {
    async listRecentProducts(viewer, { limit, retentionDays }) {
      assertTransactionPool(pool);
      const client = await pool.connect();

      try {
        await client.query("begin");
        await pruneBuyerHistory(client, viewer.buyerId, limit, retentionDays);
        const result = await client.query(
          `
            select
              p.code as product_code,
              views.viewed_at
            from public.buyer_recent_product_views views
            join public.products p on p.id = views.product_id
            where views.buyer_id = $1
              and p.is_visible = true
              and coalesce(p.is_export_available, true) = true
            order by views.viewed_at desc, p.code
            limit $2
          `,
          [viewer.buyerId, limit]
        );
        await client.query("commit");
        return result.rows.map(mapRecentProduct);
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },

    async recordProductView(viewer, productCode, { limit, retentionDays }) {
      assertTransactionPool(pool);
      const client = await pool.connect();

      try {
        await client.query("begin");
        const productResult = await client.query(
          `
            select id, code
            from public.products
            where code = $1
              and is_visible = true
              and coalesce(is_export_available, true) = true
            limit 1
          `,
          [productCode]
        );
        const product = productResult.rows[0];
        if (!product) {
          await client.query("rollback");
          return null;
        }

        const viewResult = await client.query(
          `
            insert into public.buyer_recent_product_views (buyer_id, product_id, viewed_at)
            values ($1, $2, now())
            on conflict (buyer_id, product_id)
            do update set viewed_at = excluded.viewed_at
            returning viewed_at
          `,
          [viewer.buyerId, product.id]
        );
        await pruneBuyerHistory(client, viewer.buyerId, limit, retentionDays);
        await client.query("commit");

        return {
          productCode: product.code,
          viewedAt: viewResult.rows[0].viewed_at
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
