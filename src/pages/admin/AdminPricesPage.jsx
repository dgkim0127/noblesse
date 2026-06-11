import { useMemo, useState } from 'react'
import { getAdminPriceSummary } from '../../services'
import { AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'

const marketTabs = ['ALL', 'JP', 'US', 'GLOBAL', 'KR']

export function AdminPricesPage() {
  const prices = getAdminPriceSummary()
  const [market, setMarket] = useState('ALL')
  const filteredPrices = useMemo(() => prices.filter((price) => market === 'ALL' || price.market === market), [market, prices])

  return <>
    <AdminPageHeader title="Price Management Preview" description="Market price rows are display-only and remain separated from public product metadata." />
    <AdminPreviewNote>Client-side price editing is preview-only. Production price changes must be validated and written through trusted admin API/RPC.</AdminPreviewNote>

    <div className="admin-filter-tabs">
      {marketTabs.map((tab) => <button className={market === tab ? 'active' : ''} key={tab} type="button" onClick={() => setMarket(tab)}>{tab}</button>)}
    </div>

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Market</th><th>Currency</th><th>Wholesale Price</th><th>Retail Price</th><th>MOQ</th><th>Min Request Amount</th><th>Visible To</th><th>Active</th></tr></thead>
          <tbody>{filteredPrices.map((price) => <tr key={`${price.productId}-${price.market}`}>
            <td>{price.product?.code}</td>
            <td>{price.product?.nameEn}</td>
            <td>{price.market}</td>
            <td>{price.currency}</td>
            <td><AdminMoney value={price.wholesalePrice} currency={price.currency} /></td>
            <td><AdminMoney value={price.retailPrice} currency={price.currency} /></td>
            <td>{price.moq}</td>
            <td><AdminMoney value={price.minOrderAmount} currency={price.currency} /></td>
            <td>{price.visibleTo}</td>
            <td>{price.isActive ? 'Active' : 'Inactive'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
