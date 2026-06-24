import { useMemo, useState } from 'react'
import { formatMarketLabel, getCurrencyInputStep, getMarketDisplay, marketCurrency, supportedCurrencies, supportedMarkets } from '../../config/currency.js'
import { AdminMoney, AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

const marketTabs = ['ALL', 'KR', 'JP', 'US', 'CN', 'GLOBAL']
const initialPriceForm = {
  productCode: '',
  market: 'KR',
  currency: 'KRW',
  wholesalePrice: '',
  retailPrice: '',
  moq: '1',
  minOrderAmount: '0',
  isActive: true,
}
const pageSize = 20

export function AdminPricesPage() {
  const t = useAdminCopy()
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
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const prices = data?.prices || []
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const priceInputStep = getCurrencyInputStep(form.currency)
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
      setMessage(t.prices.created)
      setForm(initialPriceForm)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.prices.createFailed)
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
      setMessage(error?.message || t.prices.updateFailed)
    } finally {
      setSavingPriceId('')
    }
  }

  return <>
    <AdminPageHeader
      title={t.prices.title}
      description={t.prices.description}
    />
    <AdminPreviewNote>{t.prices.note}</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createPrice}>
      <label className="admin-search">{t.prices.productCode}<input value={form.productCode} onChange={(event) => setField('productCode', event.target.value)} placeholder="NB-001" required /></label>
      <label className="admin-search">{t.prices.market}<select value={form.market} onChange={(event) => {
        const nextMarket = event.target.value
        setForm((current) => ({ ...current, market: nextMarket, currency: marketCurrency[nextMarket] || 'USD' }))
      }}>
        {supportedMarkets.map((tab) => <option key={tab} value={tab}>{formatMarketLabel(tab)}</option>)}
      </select></label>
      <label className="admin-search">{t.prices.currency}<select value={form.currency} onChange={(event) => setField('currency', event.target.value)}>
        {supportedCurrencies.map((currency) => <option disabled={currency !== marketCurrency[form.market]} key={currency} value={currency}>{currency}</option>)}
      </select></label>
      <label className="admin-search">{t.prices.wholesale}<input min="0" step={priceInputStep} value={form.wholesalePrice} onChange={(event) => setField('wholesalePrice', event.target.value)} required type="number" /></label>
      <label className="admin-search">{t.products.moq}<input min="1" value={form.moq} onChange={(event) => setField('moq', event.target.value)} required type="number" /></label>
      <label className="admin-check"><input checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} type="checkbox" /> {t.common.active}</label>
      <button className="primary-action" type="submit">{t.prices.create}</button>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">{t.prices.searchLabel}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder={t.prices.searchPlaceholder} /></label>
      <label className="admin-toggle"><input checked={activeOnly} onChange={(event) => resetPage(setActiveOnly)(event.target.checked)} type="checkbox" /> {t.prices.activeOnly}</label>
      <div className="admin-filter-tabs">
        {marketTabs.map((tab) => {
          const display = getMarketDisplay(tab)
          return <button className={market === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setMarket)(tab)}>{tab === 'ALL' ? t.common.all : <img alt={display.label} className="admin-market-flag" src={display.flagSrc} />}</button>
        })}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.fields.productName}</th><th>{t.fields.market}</th><th>{t.fields.currency}</th><th>{t.prices.wholesale}</th><th>{t.prices.retail}</th><th>{t.products.moq}</th><th>{t.prices.minRequestAmount}</th><th>{t.prices.visibleTo}</th><th>{t.common.active}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{prices.map((price) => <tr key={price.id}>
            <td>{price.productCode}</td>
            <td>{price.productNameEn || price.productNameKo || '-'}</td>
            <td><img alt={getMarketDisplay(price.market).label} className="admin-market-flag" src={getMarketDisplay(price.market).flagSrc} title={price.market} /></td>
            <td>{price.currency}</td>
            <td><AdminMoney value={price.wholesalePrice} currency={price.currency} /></td>
            <td>{price.retailPrice == null ? '-' : <AdminMoney value={price.retailPrice} currency={price.currency} />}</td>
            <td>{price.moq}</td>
            <td><AdminMoney value={price.minOrderAmount || 0} currency={price.currency} /></td>
            <td>{price.visibleTo}</td>
            <td>{price.isActive ? t.common.active : t.common.inactive}</td>
            <td>
              <div className="admin-actions tight">
                <button
                  disabled={savingPriceId === price.id}
                  onClick={() => updatePrice(price.id, { isActive: !price.isActive }, price.isActive ? t.prices.deactivated : t.prices.activated)}
                  type="button"
                >
                  {price.isActive ? t.common.deactivate : t.common.activate}
                </button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {prices.length === 0 && <p className="admin-empty">{t.prices.empty}</p>}
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
