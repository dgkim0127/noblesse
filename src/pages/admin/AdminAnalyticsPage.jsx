import { useMemo } from 'react'
import { AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiResource } from './adminApiPageUtils'

function countBy(rows, getKey) {
  return rows.reduce((counts, row) => {
    const key = getKey(row) || 'unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
    return counts
  }, new Map())
}

function toRows(counts) {
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function AdminAnalyticsPage() {
  const { data, error, status } = useAdminApiResource(async (api, token) => {
    const [dashboard, inquiries, buyers, products] = await Promise.all([
      api.getDashboard(token),
      api.getInquiries({ limit: 100 }, token),
      api.getBuyers({ limit: 100 }, token),
      api.getProducts({ limit: 100 }, token),
    ])

    return {
      data: {
        dashboard: dashboard.data || dashboard,
        inquiries: inquiries.data?.inquiries || [],
        buyers: buyers.data?.buyers || [],
        products: products.data?.products || [],
      },
    }
  }, [])

  const loading = <AdminApiState error={error} status={status} />
  const analytics = useMemo(() => {
    const inquiries = data?.inquiries || []
    const buyers = data?.buyers || []
    const products = data?.products || []
    const totalEstimated = inquiries.reduce((sum, inquiry) => sum + Number(inquiry.estimatedTotal || 0), 0)

    return {
      totalEstimated,
      statusRows: toRows(countBy(inquiries, (inquiry) => inquiry.status)),
      marketRows: toRows(countBy(inquiries, (inquiry) => inquiry.market || inquiry.country)),
      buyerRows: toRows(countBy(buyers, (buyer) => buyer.status)),
      productRows: toRows(countBy(products, (product) => product.isVisible ? 'visible' : 'hidden')),
    }
  }, [data])

  if (loading) return loading

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title="Analytics"
      description="Read-only operational summary based on protected Admin API responses."
    />
    <AdminPreviewNote>Analytics uses existing admin read endpoints. No browser direct database access or write operation runs here.</AdminPreviewNote>

    <section className="admin-metric-grid">
      <article className="admin-card"><p className="eyebrow">Inquiries</p><h2>{data.dashboard?.inquiries?.total ?? data.inquiries.length}</h2><span>Total request records</span></article>
      <article className="admin-card"><p className="eyebrow">Buyers</p><h2>{data.dashboard?.buyers?.total ?? data.buyers.length}</h2><span>Trade accounts</span></article>
      <article className="admin-card"><p className="eyebrow">Products</p><h2>{data.dashboard?.products?.total ?? data.products.length}</h2><span>Catalog records</span></article>
      <article className="admin-card"><p className="eyebrow">Estimated Total</p><h2><AdminMoney value={analytics.totalEstimated} currency="USD" /></h2><span>Mixed-currency reference only</span></article>
    </section>

    <section className="admin-layout two">
      <article className="admin-card">
        <h2>Inquiry Status</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>{analytics.statusRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>Markets</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Market</th><th>Count</th></tr></thead><tbody>{analytics.marketRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>Buyer Status</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>{analytics.buyerRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>Product Visibility</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Visibility</th><th>Count</th></tr></thead><tbody>{analytics.productRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
    </section>
  </>
}
