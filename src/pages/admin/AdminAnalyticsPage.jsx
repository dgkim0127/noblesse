import { getAdminAnalyticsSummary } from '../../services'
import { AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'

const viewCards = [
  ['v_top_requested_products_30d', 'Recent 30-day most requested products.'],
  ['v_top_requested_products_by_market', 'Popular requested products by market.'],
  ['v_buyer_inquiry_summary', 'Buyer-level Request Quote summary.'],
  ['v_category_inquiry_summary', 'Requested quantity and amount by category.'],
  ['v_quote_conversion_monthly', 'Monthly requested to quoted to confirmed conversion.'],
  ['v_popular_option_combinations', 'Requested color and size option combinations.'],
  ['v_monthly_inquiry_trend', 'Monthly market and currency request trend.'],
]

export function AdminAnalyticsPage() {
  const analytics = getAdminAnalyticsSummary()

  return <>
    <AdminPageHeader title="Analytics Preview" description="Mock analytics cards prepared for future PostgreSQL/Supabase views." />
    <AdminPreviewNote>No database query runs in this preview. Production analytics should read from trusted PostgreSQL/Supabase views through a protected admin API/RPC.</AdminPreviewNote>

    <section className="admin-analytics-grid">
      {viewCards.map(([viewName, description]) => <article className="admin-card" key={viewName}>
        <p className="eyebrow">Reference View</p>
        <h2>{viewName}</h2>
        <span>{description}</span>
      </article>)}
    </section>

    <section className="admin-layout two">
      <article className="admin-card">
        <h2>Top Requested Products</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product Code</th><th>Product Name</th><th>Quantity</th><th>Estimated Total</th></tr></thead><tbody>{analytics.topRequestedProducts.map((item) => <tr key={item.productCode}><td>{item.productCode}</td><td>{item.productName}</td><td>{item.totalQuantity}</td><td><AdminMoney value={item.estimatedTotal} currency="JPY" /></td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>Top Markets</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Market</th><th>Buyer Count</th><th>Inquiry Count</th><th>Estimated Total</th></tr></thead><tbody>{analytics.topMarkets.map((market) => <tr key={market.market}><td>{market.market}</td><td>{market.buyerCount}</td><td>{market.inquiryCount}</td><td><AdminMoney value={market.estimatedTotal} currency={market.currency} /></td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>Buyer Inquiry Summary</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Buyer</th><th>Inquiry Count</th><th>Estimated Total</th></tr></thead><tbody>{analytics.buyerInquirySummary.map((buyer) => <tr key={buyer.buyerId}><td>{buyer.companyName}</td><td>{buyer.inquiryCount}</td><td><AdminMoney value={buyer.estimatedTotal} currency="JPY" /></td></tr>)}</tbody></table></div>
      </article>
      <article className="admin-card">
        <h2>Popular Option Combinations</h2>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Option</th><th>Total Quantity</th></tr></thead><tbody>{analytics.popularOptionCombinations.map((option) => <tr key={option.option}><td>{option.option}</td><td>{option.totalQuantity}</td></tr>)}</tbody></table></div>
      </article>
    </section>
  </>
}
