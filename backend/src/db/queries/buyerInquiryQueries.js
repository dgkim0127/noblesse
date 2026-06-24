import { applyDiscount, multiplyMoney, sumMoney, toMinorUnits } from "../../utils/money.js";

function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for buyer inquiry queries.");
  }
}

function assertTransactionPool(pool) {
  assertPool(pool);
  if (typeof pool.connect !== "function") {
    throw new Error("PostgreSQL pool must support transactions for buyer inquiry writes.");
  }
}

function toNumber(value) {
  return Number(value) || 0;
}

function mapItem(row) {
  return {
    id: row.id,
    productId: row.product_code,
    productCode: row.product_code,
    productName: row.product_name,
    categoryId: row.category_id,
    material: row.material,
    color: row.color,
    size: row.size,
    quantity: row.quantity,
    moq: row.moq,
    market: row.market,
    currency: row.currency,
    priceSnapshot: toNumber(row.price_snapshot),
    subtotal: toNumber(row.subtotal)
  };
}

function mapItems(value) {
  return Array.isArray(value) ? value.map(mapItem) : [];
}

function mapInquiry(row) {
  return {
    id: row.id,
    inquiryId: row.id,
    inquiryNumber: row.inquiry_number,
    buyerId: row.buyer_id,
    buyerCompanyName: row.company_name || null,
    buyerCountry: row.country || null,
    market: row.market,
    currency: row.currency,
    status: row.status,
    totalItems: row.total_items,
    totalQuantity: row.total_quantity,
    estimatedTotal: toNumber(row.estimated_total),
    requestMemo: row.request_memo || "",
    adminMemo: row.admin_memo || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: mapItems(row.items)
  };
}

function mapProductPrice(row) {
  return {
    id: row.id,
    productId: row.product_code,
    productCode: row.product_code,
    market: row.market,
    currency: row.currency,
    wholesalePrice: toNumber(row.wholesale_price),
    retailPrice: row.retail_price === null ? null : toNumber(row.retail_price),
    moq: row.moq,
    minOrderAmount: toNumber(row.min_order_amount),
    visibleTo: row.visible_to,
    isActive: row.is_active === true
  };
}

function createInquiryNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  return `INQ-${date}-${suffix}`;
}

async function loadPricedProduct(client, productCode, market, currency) {
  const result = await client.query(
    `
      select
        p.id as product_id,
        p.code as product_code,
        p.name_en,
        p.name_ko,
        p.category_id,
        p.material,
        pp.id,
        pp.market,
        pp.currency,
        pp.wholesale_price,
        pp.moq,
        pp.visible_to,
        pp.is_active
      from public.products p
      join public.product_prices pp on pp.product_id = p.id
      where p.code = $1
        and p.is_visible = true
        and pp.market = $2
        and pp.currency = $3
        and pp.visible_to = 'approved_only'
        and pp.is_active = true
      limit 1
    `,
    [productCode, market, currency]
  );
  return result.rows[0] || null;
}

export function createBuyerInquiryQueries(pool) {
  return {
    async listProductPrices(viewer) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            pp.id,
            p.code as product_code,
            pp.market,
            pp.currency,
            pp.wholesale_price,
            pp.retail_price,
            pp.moq,
            pp.min_order_amount,
            pp.visible_to,
            pp.is_active
          from public.product_prices pp
          join public.products p on p.id = pp.product_id
          where p.is_visible = true
            and pp.market = $1
            and pp.currency = $2
            and pp.visible_to = 'approved_only'
            and pp.is_active = true
          order by
            p.sort_order asc,
            p.created_at desc
        `,
        [viewer.assignedMarket, viewer.currency]
      );
      return result.rows.map(mapProductPrice);
    },

    async listInquiries(viewer, filters) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            i.id,
            i.inquiry_number,
            i.buyer_id,
            b.company_name,
            b.country,
            i.market,
            i.currency,
            i.status,
            i.total_items,
            i.total_quantity,
            i.estimated_total,
            i.request_memo,
            i.admin_memo,
            i.created_at,
            i.updated_at,
            coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', ii.id,
                  'product_code', ii.product_code,
                  'product_name', ii.product_name,
                  'category_id', ii.category_id,
                  'material', ii.material,
                  'color', ii.color,
                  'size', ii.size,
                  'quantity', ii.quantity,
                  'moq', ii.moq,
                  'market', i.market,
                  'currency', i.currency,
                  'price_snapshot', ii.price_snapshot,
                  'subtotal', ii.subtotal
                )
                order by ii.created_at asc
              ) filter (where ii.id is not null),
              '[]'::jsonb
            ) as items
          from public.inquiries i
          left join public.buyers b on b.id = i.buyer_id
          left join public.inquiry_items ii on ii.inquiry_id = i.id
          where i.buyer_id = $1
            and ($2::text is null or i.status = $2)
          group by i.id, b.company_name, b.country
          order by i.created_at desc
          limit $3 offset $4
        `,
        [viewer.buyerId, filters.status || null, filters.dbLimit || filters.limit, filters.offset]
      );
      return result.rows.map(mapInquiry);
    },

    async getInquiryById(viewer, inquiryId) {
      assertPool(pool);
      const result = await pool.query(
        `
          select
            i.id,
            i.inquiry_number,
            i.buyer_id,
            b.company_name,
            b.country,
            i.market,
            i.currency,
            i.status,
            i.total_items,
            i.total_quantity,
            i.estimated_total,
            i.request_memo,
            i.admin_memo,
            i.created_at,
            i.updated_at,
            coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', ii.id,
                  'product_code', ii.product_code,
                  'product_name', ii.product_name,
                  'category_id', ii.category_id,
                  'material', ii.material,
                  'color', ii.color,
                  'size', ii.size,
                  'quantity', ii.quantity,
                  'moq', ii.moq,
                  'market', i.market,
                  'currency', i.currency,
                  'price_snapshot', ii.price_snapshot,
                  'subtotal', ii.subtotal
                )
                order by ii.created_at asc
              ) filter (where ii.id is not null),
              '[]'::jsonb
            ) as items
          from public.inquiries i
          left join public.buyers b on b.id = i.buyer_id
          left join public.inquiry_items ii on ii.inquiry_id = i.id
          where i.buyer_id = $1
            and i.id = $2
          group by i.id, b.company_name, b.country
          limit 1
        `,
        [viewer.buyerId, inquiryId]
      );
      return result.rows[0] ? mapInquiry(result.rows[0]) : null;
    },

    async createInquiry(viewer, input) {
      assertTransactionPool(pool);
      const client = await pool.connect();

      try {
        await client.query("begin");

        const pricedItems = [];
        for (const item of input.items) {
          const pricedProduct = await loadPricedProduct(client, item.productCode, viewer.assignedMarket, viewer.currency);
          if (!pricedProduct) {
            await client.query("rollback");
            return null;
          }
          if (pricedProduct.market !== viewer.assignedMarket || pricedProduct.currency !== viewer.currency) {
            await client.query("rollback");
            return null;
          }

          const moq = Number(pricedProduct.moq) || 1;
          const quantity = Math.max(moq, Math.ceil(item.quantity / moq) * moq);
          const unitPrice = applyDiscount(pricedProduct.wholesale_price, viewer.discountRate, pricedProduct.currency);
          const subtotal = multiplyMoney(unitPrice, quantity, pricedProduct.currency);
          const subtotalMinor = toMinorUnits(subtotal, pricedProduct.currency);
          if (unitPrice === null || subtotal === null || subtotalMinor === null) {
            await client.query("rollback");
            return null;
          }

          pricedItems.push({
            productId: pricedProduct.product_id,
            productCode: pricedProduct.product_code,
            productName: pricedProduct.name_en || pricedProduct.name_ko || pricedProduct.product_code,
            categoryId: pricedProduct.category_id,
            material: pricedProduct.material || "",
            color: item.color || "",
            size: item.size || "",
            quantity,
            moq,
            market: pricedProduct.market,
            currency: pricedProduct.currency,
            priceSnapshot: unitPrice,
            subtotal,
            subtotalMinor
          });
        }

        const totalItems = pricedItems.length;
        const totalQuantity = pricedItems.reduce((sum, item) => sum + item.quantity, 0);
        const estimatedTotal = sumMoney(pricedItems.map((item) => item.subtotal), viewer.currency);
        if (estimatedTotal === null) {
          await client.query("rollback");
          return null;
        }
        const inquiryResult = await client.query(
          `
            insert into public.inquiries (
              inquiry_number,
              buyer_id,
              market,
              currency,
              status,
              total_items,
              total_quantity,
              estimated_total,
              request_memo
            )
            values ($1, $2, $3, $4, 'requested', $5, $6, $7, $8)
            returning
              id,
              inquiry_number,
              buyer_id,
              market,
              currency,
              status,
              total_items,
              total_quantity,
              estimated_total,
              request_memo,
              admin_memo,
              created_at,
              updated_at
          `,
          [
            createInquiryNumber(),
            viewer.buyerId,
            viewer.assignedMarket,
            viewer.currency,
            totalItems,
            totalQuantity,
            estimatedTotal,
            input.requestMemo || null
          ]
        );

        const inquiry = inquiryResult.rows[0];
        const insertedItems = [];
        for (const item of pricedItems) {
          const itemResult = await client.query(
            `
              insert into public.inquiry_items (
                inquiry_id,
                product_id,
                product_code,
                product_name,
                category_id,
                material,
                color,
                size,
                quantity,
                moq,
                price_snapshot,
                subtotal
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              returning
                id,
                product_code,
                product_name,
                category_id,
                material,
                color,
                size,
                quantity,
                moq,
                price_snapshot,
                subtotal
            `,
            [
              inquiry.id,
              item.productId,
              item.productCode,
              item.productName,
              item.categoryId,
              item.material,
              item.color,
              item.size,
              item.quantity,
              item.moq,
              item.priceSnapshot,
              item.subtotal
            ]
          );
          insertedItems.push(itemResult.rows[0]);
        }

        await client.query("commit");
        return mapInquiry({
          ...inquiry,
          company_name: viewer.companyName || null,
          country: viewer.country || null,
          items: insertedItems
        });
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
