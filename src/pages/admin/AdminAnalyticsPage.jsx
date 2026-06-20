import { useMemo } from 'react'
import { AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

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
  const t = useAdminCopy()
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
      statusRows: toRows(countBy(inquiries, (inquiry) => getAdminStatusLabel(t, inquiry.status))),
      marketRows: toRows(countBy(inquiries, (inquiry) => inquiry.market || inquiry.country)),
      buyerRows: toRows(countBy(buyers, (buyer) => getAdminStatusLabel(t, buyer.status))),
      productRows: toRows(countBy(products, (product) => product.isVisible ? t.common.visible : t.common.hidden)),
    }
  }, [data, t])

  if (loading) return loading

  return <>
    <AdminPageHeader
      title={t.analytics.title}
      description={t.analytics.description}
    />
    <AdminPreviewNote>{t.analytics.note}</AdminPreviewNote>

    <section className="admin-metric-grid">
      <article className="admin-card"><p className="eyebrow">{t.analytics.inquiries}</p><h2>{data.dashboard?.inquiries?.total ?? data.inquiries.length}</h2><span>{t.analytics.totalRequestRecords}</span></article>
      <article className="admin-card"><p className="eyebrow">{t.analytics.buyers}</p><h2>{data.dashboard?.buyers?.total ?? data.buyers.length}</h2><span>{t.analytics.tradeAccounts}</span></article>
      <article className="admin-card"><p className="eyebrow">{t.analytics.products}</p><h2>{data.dashboard?.products?.total ?? data.products.length}</h2><span>{t.analytics.catalogRecords}</span></article>
      <article className="admin-card"><p className="eyebrow">{t.analytics.estimatedTotal}</p><h2><AdminMoney value={analytics.totalEstimated} currency="USD" /></h2><span>{t.analytics.mixedCurrency}</span></article>
    </section>

    <section className="admin-layout two">
      <article className="admin-card">
        <h2>{t.analytics.inquiryStatus}</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t.common.status}</th><th>{t.common.count}</th></tr></thead><tbody>{analytics.statusRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>{t.analytics.markets}</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t.fields.market}</th><th>{t.common.count}</th></tr></thead><tbody>{analytics.marketRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>{t.analytics.buyerStatus}</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t.common.status}</th><th>{t.common.count}</th></tr></thead><tbody>{analytics.buyerRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>{t.analytics.productVisibility}</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t.analytics.visibility}</th><th>{t.common.count}</th></tr></thead><tbody>{analytics.productRows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      </article>
    </section>
  </>
}
