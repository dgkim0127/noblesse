const inquiryStatuses = ["requested", "checking", "quoted", "confirmed", "cancelled"];
const quoteStatuses = ["draft", "sent", "accepted", "rejected", "cancelled"];
const buyerStatuses = ["draft", "pending", "approved", "rejected", "suspended"];

function assertPool(pool) {
  if (!pool) {
    throw new Error("PostgreSQL pool is not configured for admin analytics queries.");
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function completeStatusRows(rows, statuses) {
  const counts = new Map(rows.map((row) => [row.status, toNumber(row.count)]));
  return statuses.map((status) => ({ status, count: counts.get(status) || 0 }));
}

export function createAdminAnalyticsQueries(pool) {
  return {
    async getAnalyticsSummary() {
      assertPool(pool);
      const [overviewResult, inquiryResult, quoteResult, buyerResult, marketResult, currencyResult] = await Promise.all([
        pool.query(`
          select
            (select count(*)::int from public.inquiries) as inquiry_total,
            (select count(*)::int from public.admin_quotes) as quote_total,
            (select count(*)::int from public.admin_quotes where current_document_id is not null) as quote_issued,
            (select count(*)::int from public.buyers) as buyer_total,
            (select count(*)::int from public.products) as product_total,
            (select count(*)::int from public.products where is_visible = true) as product_visible,
            (select count(*)::int from public.products where is_visible = false) as product_hidden
        `),
        pool.query(`select status, count(*)::int as count from public.inquiries group by status`),
        pool.query(`select status, count(*)::int as count from public.admin_quotes group by status`),
        pool.query(`
          select coalesce(verification_status, 'pending') as status, count(*)::int as count
          from public.buyers
          group by coalesce(verification_status, 'pending')
        `),
        pool.query(`
          select coalesce(nullif(market, ''), 'GLOBAL') as market, count(*)::int as count
          from public.inquiries
          group by coalesce(nullif(market, ''), 'GLOBAL')
          order by count desc, market asc
        `),
        pool.query(`
          with inquiry_totals as (
            select
              currency,
              count(*)::int as request_count,
              coalesce(sum(estimated_total), 0) as requested_total
            from public.inquiries
            where currency is not null and currency <> ''
            group by currency
          ),
          issued_totals as (
            select
              aq.currency,
              count(*)::int as issued_count,
              coalesce(sum(coalesce(nullif(d.snapshot ->> 'total', '')::numeric, 0)), 0) as issued_total
            from public.admin_quotes aq
            join public.admin_quote_documents d on d.id = aq.current_document_id
            where aq.currency is not null and aq.currency <> ''
            group by aq.currency
          )
          select
            coalesce(i.currency, q.currency) as currency,
            coalesce(i.request_count, 0)::int as request_count,
            coalesce(i.requested_total, 0) as requested_total,
            coalesce(q.issued_count, 0)::int as issued_count,
            coalesce(q.issued_total, 0) as issued_total
          from inquiry_totals i
          full outer join issued_totals q on q.currency = i.currency
          order by currency asc
        `)
      ]);

      const overview = overviewResult.rows[0] || {};
      const inquiries = completeStatusRows(inquiryResult.rows, inquiryStatuses);
      const quotes = completeStatusRows(quoteResult.rows, quoteStatuses);
      const buyers = completeStatusRows(buyerResult.rows, buyerStatuses);
      const inquiryCount = Object.fromEntries(inquiries.map((row) => [row.status, row.count]));
      const quoteCount = Object.fromEntries(quotes.map((row) => [row.status, row.count]));
      const buyerCount = Object.fromEntries(buyers.map((row) => [row.status, row.count]));

      return {
        generatedAt: new Date().toISOString(),
        overview: {
          openInquiries: inquiryCount.requested + inquiryCount.checking,
          draftQuotes: quoteCount.draft,
          awaitingBuyer: quoteCount.sent,
          acceptedQuotes: quoteCount.accepted,
          pendingBuyers: buyerCount.pending
        },
        inquiries: {
          total: toNumber(overview.inquiry_total),
          statuses: inquiries
        },
        quotes: {
          total: toNumber(overview.quote_total),
          issued: toNumber(overview.quote_issued),
          statuses: quotes
        },
        buyers: {
          total: toNumber(overview.buyer_total),
          statuses: buyers
        },
        products: {
          total: toNumber(overview.product_total),
          visible: toNumber(overview.product_visible),
          hidden: toNumber(overview.product_hidden)
        },
        markets: marketResult.rows.map((row) => ({
          market: row.market,
          count: toNumber(row.count)
        })),
        currencyTotals: currencyResult.rows.map((row) => ({
          currency: row.currency,
          requestCount: toNumber(row.request_count),
          requestedTotal: toNumber(row.requested_total),
          issuedCount: toNumber(row.issued_count),
          issuedTotal: toNumber(row.issued_total)
        }))
      };
    }
  };
}
