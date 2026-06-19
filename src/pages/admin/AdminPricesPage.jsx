import { useMemo, useState } from 'react'
import { AdminMoney, AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const marketTabs = ['ALL', 'JP', 'US', 'GLOBAL', 'KR']
const initialPriceForm = {
  productCode: '',
  market: 'JP',
  currency: 'JPY',
  wholesalePrice: '',
  retailPrice: '',
  moq: '1',
  minOrderAmount: '0',
  isActive: true,
}
const pageSize = 20

export function AdminPricesPage() {
  const [market, setMarket] = useState('ALL')
  const [query, setQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState(initialPriceForm)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingPriceId, setSavingPriceId] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    market: market === 'ALL' ? '' : market,
    q: query.trim(),
    active: activeOnly ? 'true' : '',
    limit: pageSize,
    offset,
  }), [activeOnly, market, offset, query])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getPrices(filters, token), [activeOnly, market, query, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const prices = data?.prices || []
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const createPrice = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      await mutate((api, token) => api.createPrice({
        productCode: form.productCode.trim(),
        market: form.market,
        currency: form.currency,
        wholesalePrice: Number(form.wholesalePrice),
        retailPrice: form.retailPrice === '' ? undefined : Number(form.retailPrice),
        moq: Number(form.moq || 1),
        minOrderAmount: Number(form.minOrderAmount || 0),
        isActive: form.isActive,
      }, token))
      setMessage('Price row created.')
      setForm(initialPriceForm)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to create price row.')
    }
  }

  const updatePrice = async (priceId, input, successMessage) => {
    setSavingPriceId(priceId)
    setMessage('')
    try {
      await mutate((api, token) => api.updatePrice(priceId, input, token))
      setMessage(successMessage)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to update price row.')
    } finally {
      setSavingPriceId('')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title="Price Management"
      description="Review market price rows from the backend. Public catalog metadata remains separate from approved buyer pricing."
    />
    <AdminPreviewNote>Price rows are managed through protected admin API writes. Public catalog reads still never expose approved buyer prices.</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createPrice}>
      <label className="admin-search">Product Code<input value={form.productCode} onChange={(event) => setField('productCode', event.target.value)} placeholder="NB-001" required /></label>
      <label className="admin-search">Market<select value={form.market} onChange={(event) => {
        const nextMarket = event.target.value
        setForm((current) => ({ ...current, market: nextMarket, currency: nextMarket === 'KR' ? 'KRW' : nextMarket === 'JP' ? 'JPY' : 'USD' }))
      }}>
        {marketTabs.filter((tab) => tab !== 'ALL').map((tab) => <option key={tab} value={tab}>{tab}</option>)}
      </select></label>
      <label className="admin-search">Currency<select value={form.currency} onChange={(event) => setField('currency', event.target.value)}>
        {['KRW', 'JPY', 'USD'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
      </select></label>
      <label className="admin-search">Wholesale<input min="0" value={form.wholesalePrice} onChange={(event) => setField('wholesalePrice', event.target.value)} required type="number" /></label>
      <label className="admin-search">MOQ<input min="1" value={form.moq} onChange={(event) => setField('moq', event.target.value)} required type="number" /></label>
      <label className="admin-check"><input checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} type="checkbox" /> Active</label>
      <button className="primary-action" type="submit">Create Price</button>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">Search prices<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Product code or name" /></label>
      <label className="admin-toggle"><input checked={activeOnly} onChange={(event) => resetPage(setActiveOnly)(event.target.checked)} type="checkbox" /> Active only</label>
      <div className="admin-filter-tabs">
        {marketTabs.map((tab) => <button className={market === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setMarket)(tab)}>{tab}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Market</th><th>Currency</th><th>Wholesale Price</th><th>Retail Price</th><th>MOQ</th><th>Min Request Amount</th><th>Visible To</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>{prices.map((price) => <tr key={price.id}>
            <td>{price.productCode}</td>
            <td>{price.productNameEn || price.productNameKo || '-'}</td>
            <td>{price.market}</td>
            <td>{price.currency}</td>
            <td><AdminMoney value={price.wholesalePrice} currency={price.currency} /></td>
            <td>{price.retailPrice == null ? '-' : <AdminMoney value={price.retailPrice} currency={price.currency} />}</td>
            <td>{price.moq}</td>
            <td><AdminMoney value={price.minOrderAmount || 0} currency={price.currency} /></td>
            <td>{price.visibleTo}</td>
            <td>{price.isActive ? 'Active' : 'Inactive'}</td>
            <td>
              <div className="admin-actions tight">
                <button
                  disabled={savingPriceId === price.id}
                  onClick={() => updatePrice(price.id, { isActive: !price.isActive }, price.isActive ? 'Price row deactivated.' : 'Price row activated.')}
                  type="button"
                >
                  {price.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  disabled={savingPriceId === price.id}
                  onClick={() => updatePrice(price.id, { wholesalePrice: Number(price.wholesalePrice || 0) + 1 }, 'Wholesale price adjusted.')}
                  type="button"
                >
                  Adjust +1
                </button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {prices.length === 0 && <p className="admin-empty">No price rows found.</p>}
        <AdminPagination
          disabled={status === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>
  </>
}
