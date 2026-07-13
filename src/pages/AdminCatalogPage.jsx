import { ImagePlus, PackagePlus, Save, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCommerce } from '../commerce/commerceStore'
import { loadAdminCatalog, loadProductPrices, saveCatalogProduct, uploadProductImages } from '../services/adminCatalogService'

const marketDefaults = [
  { market: 'GLOBAL', currency: 'USD' },
  { market: 'KR', currency: 'KRW' },
  { market: 'JP', currency: 'JPY' },
  { market: 'US', currency: 'USD' },
  { market: 'TW', currency: 'TWD' },
]

const imageSlots = [
  ['thumb', 'Thumbnail', '300px'],
  ['card', 'Catalog card', '600px'],
  ['detail', 'Product detail', '1200px'],
  ['zoom', 'Zoom image', '1800px'],
]

const newProduct = () => ({
  product_id: '', code: '', name_ko: '', name_en: '', name_ja: '', name_zh: '', category_id: '', material: '',
  colors: [], sizes: [], moq_default: 1, lead_time: '', origin: 'KR', image_set: {}, image_alt: {},
  description_ko: '', description_en: '', description_ja: '', description_zh: '', is_visible: false, is_export_available: true, sort_order: 0,
})

const splitValues = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback

export function AdminCatalogPage() {
  const { isAdmin, isSupabaseConfigured } = useCommerce()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(newProduct)
  const [prices, setPrices] = useState(marketDefaults.map((market) => ({ ...market, wholesale_price: '', retail_price: '', moq: 1, min_order_amount: 0, is_active: true })))
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const activeProduct = useMemo(() => products.find((product) => product.product_id === form.product_id), [form.product_id, products])

  const refresh = async () => {
    setLoading(true)
    try { setProducts(await loadAdminCatalog()) } catch (error) { setMessage(error.message) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (isAdmin) void Promise.resolve().then(refresh)
  }, [isAdmin])

  const chooseProduct = async (product) => {
    setForm({ ...newProduct(), ...product })
    setImages({})
    setMessage('')
    try {
      const existingPrices = await loadProductPrices(product.product_id)
      setPrices(marketDefaults.map((defaultPrice) => ({
        ...defaultPrice,
        ...(existingPrices.find((price) => price.market === defaultPrice.market) ?? {}),
      })))
    } catch (error) { setMessage(error.message) }
  }

  const startNew = () => {
    setForm(newProduct())
    setPrices(marketDefaults.map((market) => ({ ...market, wholesale_price: '', retail_price: '', moq: 1, min_order_amount: 0, is_active: true })))
    setImages({})
    setMessage('')
  }

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updatePrice = (market, field, value) => setPrices((current) => current.map((price) => price.market === market ? { ...price, [field]: value } : price))

  const submit = async (event) => {
    event.preventDefault()
    const code = form.code.trim().toUpperCase()
    if (!code || !form.name_en.trim()) { setMessage('Product code and English product name are required.'); return }
    setSaving(true)
    setMessage('')
    try {
      const productId = form.product_id || code
      const uploadedImages = await uploadProductImages(productId, images)
      const imageSet = { ...(form.image_set ?? {}), ...uploadedImages }
      const fallbackImage = imageSet.detail || imageSet.card || imageSet.zoom || imageSet.thumb || ''
      imageSlots.forEach(([slot]) => { if (!imageSet[slot] && fallbackImage) imageSet[slot] = fallbackImage })
      const product = {
        ...form,
        product_id: productId,
        code,
        name_ko: form.name_ko.trim(), name_en: form.name_en.trim(), name_ja: form.name_ja.trim(), name_zh: form.name_zh.trim(),
        category_id: form.category_id.trim(), material: form.material.trim(), colors: Array.isArray(form.colors) ? form.colors : splitValues(form.colors),
        sizes: Array.isArray(form.sizes) ? form.sizes : splitValues(form.sizes), moq_default: Math.max(1, toNumber(form.moq_default, 1)),
        lead_time: form.lead_time.trim(), origin: form.origin.trim() || 'KR', image_set: imageSet,
        image_alt: { ...(form.image_alt ?? {}), default: form.name_en.trim() },
        description_ko: form.description_ko.trim(), description_en: form.description_en.trim(), description_ja: form.description_ja.trim(), description_zh: form.description_zh.trim(),
        is_visible: Boolean(form.is_visible), is_export_available: Boolean(form.is_export_available), sort_order: toNumber(form.sort_order),
      }
      const normalizedPrices = prices.map((price) => ({
        product_id: productId, market: price.market, currency: price.currency, wholesale_price: toNumber(price.wholesale_price),
        retail_price: price.retail_price === '' || price.retail_price == null ? null : toNumber(price.retail_price),
        moq: Math.max(1, toNumber(price.moq, product.moq_default)), min_order_amount: toNumber(price.min_order_amount),
        visible_to: 'approved_only', is_active: Boolean(price.is_active),
      })).filter((price) => price.wholesale_price > 0)
      await saveCatalogProduct({ product, prices: normalizedPrices })
      setForm(product)
      setImages({})
      await refresh()
      setMessage(`${code} was saved. ${product.is_visible ? 'It is visible in the catalog.' : 'It remains hidden until you publish it.'}`)
    } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }

  if (!isAdmin) return <main className="content"><div className="approval-page"><ShieldCheck size={25} /><h1>Administrator access required</h1><p>Catalog management is available only to approved Noblesse administrators.</p></div></main>
  if (!isSupabaseConfigured) return <main className="content"><div className="empty">Connect Supabase before using catalog management.</div></main>

  return <main className="content admin-catalog-page"><div className="page-title"><div><p>CATALOG ADMINISTRATION</p><h1>Manage products and Buyer prices</h1></div><button className="secondary-action" type="button" onClick={startNew}><PackagePlus size={17} />New product</button></div><section className="admin-catalog-layout"><aside className="admin-catalog-list"><strong>Products</strong>{loading && <div className="empty">Loading catalog...</div>}{products.map((product) => <button className={product.product_id === form.product_id ? 'active' : ''} key={product.product_id} type="button" onClick={() => chooseProduct(product)}><span><b>{product.code}</b><small>{product.name_en}</small></span><em>{product.is_visible ? 'Visible' : 'Hidden'}</em></button>)}</aside><form className="admin-catalog-form" onSubmit={submit}><section className="admin-form-section"><h2>Product information</h2><div className="admin-form-grid"><label>Product code<input value={form.code} onChange={(event) => updateForm('code', event.target.value)} placeholder="NB-EXAMPLE-001" required /></label><label>Category<input value={form.category_id} onChange={(event) => updateForm('category_id', event.target.value)} placeholder="barbell" /></label><label>English name<input value={form.name_en} onChange={(event) => updateForm('name_en', event.target.value)} required /></label><label>Korean name<input value={form.name_ko} onChange={(event) => updateForm('name_ko', event.target.value)} /></label><label>Japanese name<input value={form.name_ja} onChange={(event) => updateForm('name_ja', event.target.value)} /></label><label>Chinese name<input value={form.name_zh} onChange={(event) => updateForm('name_zh', event.target.value)} /></label><label>Material<input value={form.material} onChange={(event) => updateForm('material', event.target.value)} /></label><label>Origin<input value={form.origin} onChange={(event) => updateForm('origin', event.target.value)} /></label><label>Colors <small>comma separated</small><input value={Array.isArray(form.colors) ? form.colors.join(', ') : form.colors} onChange={(event) => updateForm('colors', event.target.value)} placeholder="Gold, Silver" /></label><label>Sizes <small>comma separated</small><input value={Array.isArray(form.sizes) ? form.sizes.join(', ') : form.sizes} onChange={(event) => updateForm('sizes', event.target.value)} placeholder="6mm, 8mm" /></label><label>Default MOQ<input min="1" type="number" value={form.moq_default} onChange={(event) => updateForm('moq_default', event.target.value)} /></label><label>Lead time<input value={form.lead_time} onChange={(event) => updateForm('lead_time', event.target.value)} placeholder="7-14 days" /></label><label className="full-span">English description<textarea value={form.description_en} onChange={(event) => updateForm('description_en', event.target.value)} /></label></div><div className="admin-switches"><label><input checked={Boolean(form.is_visible)} type="checkbox" onChange={(event) => updateForm('is_visible', event.target.checked)} />Publish in catalog</label><label><input checked={Boolean(form.is_export_available)} type="checkbox" onChange={(event) => updateForm('is_export_available', event.target.checked)} />Available for export</label></div></section><section className="admin-form-section"><h2><ImagePlus size={18} />Product images</h2><p>Upload optimized WebP files for each display size. A missing slot uses the first uploaded image as a temporary fallback.</p><div className="admin-image-grid">{imageSlots.map(([slot, label, dimension]) => <label key={slot}><span>{label}<small>{dimension} WebP</small></span>{form.image_set?.[slot] && <img alt="" src={form.image_set[slot]} />}{images[slot] && <small>{images[slot].name}</small>}<input accept="image/webp,image/jpeg,image/png" type="file" onChange={(event) => setImages((current) => ({ ...current, [slot]: event.target.files?.[0] }))} /></label>)}</div></section><section className="admin-form-section"><h2>Approved Buyer price books</h2><p>Only approved Buyers assigned to each market can view these prices or submit a quote request.</p><div className="admin-price-grid">{prices.map((price) => <div className="admin-price-row" key={price.market}><strong>{price.market}</strong><label>Currency<input maxLength="3" value={price.currency ?? ''} onChange={(event) => updatePrice(price.market, 'currency', event.target.value.toUpperCase())} /></label><label>Wholesale price<input min="0" step="0.01" type="number" value={price.wholesale_price ?? ''} onChange={(event) => updatePrice(price.market, 'wholesale_price', event.target.value)} /></label><label>MOQ<input min="1" type="number" value={price.moq ?? 1} onChange={(event) => updatePrice(price.market, 'moq', event.target.value)} /></label><label className="admin-price-toggle"><input checked={Boolean(price.is_active)} type="checkbox" onChange={(event) => updatePrice(price.market, 'is_active', event.target.checked)} />Active</label></div>)}</div></section>{message && <p className="admin-form-message" role="status">{message}</p>}<button className="primary-action" disabled={saving} type="submit"><Save size={17} />{saving ? 'Saving catalog item...' : activeProduct ? 'Save product changes' : 'Create product'}</button></form></section></main>
}
