import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLink, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'
import { useLocalePath } from '../../utils/locale'

const initialCategoryForm = {
  categoryId: '',
  nameEn: '',
  nameKo: '',
  nameJa: '',
  slug: '',
  sortOrder: '0',
  isVisible: true,
}

const initialProductForm = {
  code: '',
  nameEn: '',
  description: '',
  material: '',
  moqDefault: '1',
  isVisible: true,
  isExportAvailable: true,
}

const initialPriceForm = {
  market: 'KR',
  currency: 'KRW',
  wholesalePrice: '',
  retailPrice: '',
  moq: '1',
  minOrderAmount: '0',
  isActive: true,
}

const initialSaveStatus = {
  category: 'idle',
  product: 'idle',
  price: 'idle',
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getCategoryKey(category) {
  return category?.categoryId || category?.key || category?.slug || ''
}

function getCategoryName(category) {
  return category?.nameEn || category?.nameKo || category?.nameJa || getCategoryKey(category)
}

function getCreatedProductId(product, fallbackCode) {
  return product?.id || product?.productId || product?.code || fallbackCode
}

function getErrorKey(error) {
  if (error?.status === 401 || error?.code === 'UNAUTHORIZED') return 'unauthorized'
  if (error?.status === 403 || error?.code === 'FORBIDDEN') return 'forbidden'
  if (error?.status === 409 || error?.code === 'CONFLICT') return 'conflict'
  if (error?.status >= 500 || error?.code === 'INTERNAL_ERROR') return 'server'
  if (error?.code === 'NETWORK_ERROR') return 'network'
  return 'unknown'
}

function formatApiError(t, error) {
  return t.errors[getErrorKey(error)] || error?.message || t.errors.unknown
}

function normalizeCode(value) {
  return String(value || '').trim()
}

function isValidProductCode(value) {
  const code = normalizeCode(value)
  return code.length > 0 && code.length <= 80 && /^[A-Za-z0-9._-]+$/.test(code)
}

function parsePositiveMoney(value) {
  const text = String(value || '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const number = Number(text)
  if (!Number.isFinite(number) || number <= 0) return null
  return number
}

function parseOptionalPositiveMoney(value) {
  if (String(value || '').trim() === '') return undefined
  return parsePositiveMoney(value)
}

function parseOptionalNonnegativeMoney(value) {
  const text = String(value || '').trim()
  if (text === '') return undefined
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const number = Number(text)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}

function formatDisplayAmount(value, currency) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    style: 'currency',
    currency: currency || 'KRW',
  }).format(number)
}

export function AdminCatalogEntryPage() {
  const adminCopy = useAdminCopy()
  const t = adminCopy.catalogEntry
  const { toLocalePath } = useLocalePath()
  const navigate = useNavigate()
  const mutate = useAdminApiMutation()
  const [mode, setMode] = useState('existing')
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('')
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [productForm, setProductForm] = useState(initialProductForm)
  const [priceForm, setPriceForm] = useState(initialPriceForm)
  const [createdCategory, setCreatedCategory] = useState(null)
  const [createdProduct, setCreatedProduct] = useState(null)
  const [createdPrice, setCreatedPrice] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(initialSaveStatus)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const { data, error, status } = useAdminApiResource((api, token) => api.getCategories({ limit: 200 }, token), [refreshKey])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  const categories = useMemo(() => data?.categories || [], [data])
  const selectedCategory = categories.find((category) => getCategoryKey(category) === selectedCategoryKey) || createdCategory
  const activeCategoryKey = getCategoryKey(createdCategory) || selectedCategoryKey
  const productCode = normalizeCode(productForm.code)
  const productRouteId = getCreatedProductId(createdProduct, productCode)
  const parsedWholesalePrice = parsePositiveMoney(priceForm.wholesalePrice)
  const isDirty = Boolean(
    selectedCategoryKey ||
    createdCategory ||
    createdProduct ||
    createdPrice ||
    productForm.code ||
    productForm.nameEn ||
    productForm.description ||
    priceForm.wholesalePrice ||
    categoryForm.categoryId ||
    categoryForm.nameEn
  )

  useEffect(() => {
    if (!isDirty || isComplete) return undefined
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isComplete, isDirty])

  if (apiState) return apiState

  const setCategoryField = (field, value) => setCategoryForm((current) => ({
    ...current,
    [field]: value,
    ...(field === 'categoryId' && !current.slug ? { slug: slugify(value) } : {}),
  }))
  const setProductField = (field, value) => setProductForm((current) => ({ ...current, [field]: value }))
  const setPriceField = (field, value) => setPriceForm((current) => ({ ...current, [field]: value }))

  const updateSaveStatus = (resource, value) => {
    setSaveStatus((current) => ({ ...current, [resource]: value }))
  }

  const clearMessages = () => {
    setFieldErrors({})
    setMessage('')
  }

  const validateCategory = () => {
    const errors = {}
    if (mode === 'existing' && !selectedCategoryKey && !createdCategory) errors.category = t.validation.categoryRequired
    if (mode === 'new' && !createdCategory) {
      const categoryKey = categoryForm.categoryId.trim()
      const categoryName = categoryForm.nameEn.trim()
      if (!categoryKey) errors.categoryId = t.validation.categoryKeyRequired
      if (categoryKey && categoryKey.length > 80) errors.categoryId = t.validation.categoryKeyRequired
      if (!categoryName) errors.categoryName = t.validation.categoryNameRequired
      if (!categoryForm.slug.trim()) errors.slug = t.validation.slugRequired
      const duplicateKey = categories.find((category) => getCategoryKey(category).toLowerCase() === categoryKey.toLowerCase())
      const duplicateName = categories.find((category) => getCategoryName(category).toLowerCase() === categoryName.toLowerCase())
      if (duplicateKey) errors.categoryId = t.validation.categoryConflict
      if (duplicateName) errors.categoryName = t.validation.categoryNameConflict
    }
    return errors
  }

  const validateProduct = () => {
    const errors = {}
    if (!activeCategoryKey && mode !== 'new') errors.category = t.validation.categoryRequired
    if (!productCode) errors.code = t.validation.productCodeRequired
    else if (productCode.length > 80) errors.code = t.validation.productCodeInvalid
    else if (!isValidProductCode(productCode)) errors.code = t.validation.productCodeInvalid
    if (!productForm.nameEn.trim()) errors.productName = t.validation.productNameRequired
    if (Number(productForm.moqDefault || 0) < 1) errors.moqDefault = t.validation.moqRequired
    return errors
  }

  const validatePrice = () => {
    const errors = {}
    const wholesalePrice = parsePositiveMoney(priceForm.wholesalePrice)
    const retailPrice = parseOptionalPositiveMoney(priceForm.retailPrice)
    if (!priceForm.market) errors.market = t.validation.marketRequired
    if (!priceForm.currency) errors.currency = t.validation.currencyRequired
    if (wholesalePrice == null) errors.wholesalePrice = t.validation.priceRequired
    if (priceForm.retailPrice !== '' && retailPrice == null) errors.retailPrice = t.validation.retailPriceInvalid
    if (Number(priceForm.moq || 0) < 1) errors.moq = t.validation.moqRequired
    if (parseOptionalNonnegativeMoney(priceForm.minOrderAmount) == null) errors.minOrderAmount = t.validation.priceRequired
    return errors
  }

  const validateAll = () => {
    const errors = {
      ...validateCategory(),
      ...validateProduct(),
      ...validatePrice(),
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const selectMode = (nextMode) => {
    if (createdCategory || createdProduct || createdPrice) return
    clearMessages()
    setMode(nextMode)
    if (nextMode === 'existing') {
      setCategoryForm(initialCategoryForm)
    } else {
      setSelectedCategoryKey('')
    }
  }

  const createCategoryPayload = () => ({
    categoryId: categoryForm.categoryId.trim(),
    nameEn: categoryForm.nameEn.trim(),
    nameKo: categoryForm.nameKo.trim() || undefined,
    nameJa: categoryForm.nameJa.trim() || undefined,
    slug: categoryForm.slug.trim(),
    sortOrder: Number(categoryForm.sortOrder || 0),
    isVisible: categoryForm.isVisible,
  })

  const createProductPayload = (categoryKey) => ({
    code: productCode,
    nameEn: productForm.nameEn.trim(),
    categoryKey,
    material: productForm.material.trim() || undefined,
    moqDefault: Number(productForm.moqDefault || 1),
    colors: [],
    sizes: [],
    imageSet: {},
    imageAlt: {},
    isVisible: productForm.isVisible,
    isExportAvailable: productForm.isExportAvailable,
    descriptionEn: productForm.description.trim() || undefined,
  })

  const createPricePayload = () => ({
    productCode,
    market: priceForm.market,
    currency: priceForm.currency,
    wholesalePrice: parsePositiveMoney(priceForm.wholesalePrice),
    retailPrice: parseOptionalPositiveMoney(priceForm.retailPrice),
    moq: Number(priceForm.moq || 1),
    minOrderAmount: parseOptionalNonnegativeMoney(priceForm.minOrderAmount) ?? 0,
    isActive: priceForm.isActive,
  })

  const ensureProductCodeAvailable = async () => {
    const existingProducts = await mutate((api, token) => api.getProducts({ q: productCode, limit: 10 }, token))
    const duplicateProduct = (existingProducts.data?.products || []).find((product) => String(product.code || '').toLowerCase() === productCode.toLowerCase())
    if (duplicateProduct) {
      setFieldErrors((current) => ({ ...current, code: t.validation.productConflict }))
      throw Object.assign(new Error(t.validation.productConflict), { status: 409, code: 'CONFLICT', field: 'code' })
    }
  }

  const submitAll = async () => {
    clearMessages()
    if (!validateAll()) return
    setIsSaving(true)
    let activeResource = ''
    try {
      let categoryKey = activeCategoryKey

      if (!createdProduct) {
        await ensureProductCodeAvailable()
      }

      if (mode === 'new' && !createdCategory) {
        activeResource = 'category'
        updateSaveStatus('category', 'saving')
        const categoryResult = await mutate((api, token) => api.createCategory(createCategoryPayload(), token))
        const category = categoryResult.data?.category || { ...categoryForm, categoryId: categoryForm.categoryId.trim() }
        categoryKey = getCategoryKey(category)
        setCreatedCategory(category)
        setSelectedCategoryKey(categoryKey)
        setRefreshKey((current) => current + 1)
        updateSaveStatus('category', 'success')
      } else if (mode === 'new' && createdCategory) {
        updateSaveStatus('category', 'success')
      }

      if (!createdProduct) {
        activeResource = 'product'
        updateSaveStatus('product', 'saving')
        const productResult = await mutate((api, token) => api.createProduct(createProductPayload(categoryKey), token))
        const product = productResult.data?.product || { code: productCode, nameEn: productForm.nameEn.trim() }
        setCreatedProduct(product)
        updateSaveStatus('product', 'success')
      }

      if (!createdPrice) {
        activeResource = 'price'
        updateSaveStatus('price', 'saving')
        const priceResult = await mutate((api, token) => api.createPrice(createPricePayload(), token))
        setCreatedPrice(priceResult.data?.price || { productCode, ...priceForm })
        updateSaveStatus('price', 'success')
      }

      setIsComplete(true)
      setMessage(t.success.saved)
    } catch (error) {
      const key = error?.field || activeResource
      if (key && key !== 'code') updateSaveStatus(key, 'error')
      setMessage(formatApiError(t, error))
    } finally {
      setIsSaving(false)
    }
  }

  const continueAnother = () => {
    setMode('existing')
    setSelectedCategoryKey('')
    setCategoryForm(initialCategoryForm)
    setProductForm(initialProductForm)
    setPriceForm(initialPriceForm)
    setCreatedCategory(null)
    setCreatedProduct(null)
    setCreatedPrice(null)
    setFieldErrors({})
    setMessage('')
    setSaveStatus(initialSaveStatus)
    setIsComplete(false)
  }

  const cancel = () => {
    if (isDirty && !isComplete && !window.confirm(t.confirmCancel)) return
    navigate(toLocalePath('/admin/products'))
  }

  const categorySummary = selectedCategory ? getCategoryName(selectedCategory) : mode === 'new' ? categoryForm.nameEn || categoryForm.categoryId || '-' : '-'
  const saveButtonLabel = isSaving ? t.saving : Object.values(saveStatus).includes('error') ? t.retryFailed : t.save

  return <>
    <AdminPageHeader
      title={t.title}
      description={t.description}
      actions={<><AdminLink to="/admin/products">{t.productList}</AdminLink></>}
    />
    <AdminPreviewNote>{t.note}</AdminPreviewNote>

    <section className="catalog-entry-layout">
      <div className="catalog-entry-form-stack">
        <section className="admin-card catalog-entry-section">
          <div>
            <p className="eyebrow">{t.sections.categoryEyebrow}</p>
            <h2>{t.category.title}</h2>
          </div>
          <div className="admin-filter-tabs">
            <button className={mode === 'existing' ? 'active' : ''} disabled={Boolean(createdCategory || createdProduct || createdPrice)} type="button" onClick={() => selectMode('existing')}>{t.category.useExisting}</button>
            <button className={mode === 'new' ? 'active' : ''} disabled={Boolean(createdCategory || createdProduct || createdPrice)} type="button" onClick={() => selectMode('new')}>{t.category.createNew}</button>
          </div>
          {mode === 'existing' ? <label className="admin-search wide">{t.category.existingLabel}
            <select value={selectedCategoryKey} onChange={(event) => setSelectedCategoryKey(event.target.value)}>
              <option value="">{t.category.selectPlaceholder}</option>
              {categories.map((category) => <option key={category.id || getCategoryKey(category)} value={getCategoryKey(category)}>
                {getCategoryName(category)}
              </option>)}
            </select>
            {fieldErrors.category && <small className="admin-field-error">{fieldErrors.category}</small>}
          </label> : <div className="catalog-entry-grid">
            <label className="admin-search">{t.category.key}<input value={categoryForm.categoryId} onChange={(event) => setCategoryField('categoryId', event.target.value)} placeholder="earrings" />
              {fieldErrors.categoryId && <small className="admin-field-error">{fieldErrors.categoryId}</small>}
            </label>
            <label className="admin-search">{t.category.name}<input value={categoryForm.nameEn} onChange={(event) => setCategoryField('nameEn', event.target.value)} placeholder={t.category.name} />
              {fieldErrors.categoryName && <small className="admin-field-error">{fieldErrors.categoryName}</small>}
            </label>
            <label className="admin-search">{t.category.nameKo}<input value={categoryForm.nameKo} onChange={(event) => setCategoryField('nameKo', event.target.value)} placeholder={t.category.nameKo} /></label>
            <label className="admin-search">{t.category.nameJa}<input value={categoryForm.nameJa} onChange={(event) => setCategoryField('nameJa', event.target.value)} placeholder={t.category.nameJa} /></label>
            <label className="admin-search">{t.category.slug}<input value={categoryForm.slug} onChange={(event) => setCategoryField('slug', event.target.value)} placeholder="earrings" />
              {fieldErrors.slug && <small className="admin-field-error">{fieldErrors.slug}</small>}
            </label>
            <label className="admin-search">{t.category.sort}<input value={categoryForm.sortOrder} onChange={(event) => setCategoryField('sortOrder', event.target.value)} type="number" /></label>
            <label className="admin-check"><input checked={categoryForm.isVisible} onChange={(event) => setCategoryField('isVisible', event.target.checked)} type="checkbox" /> {t.category.visible}</label>
          </div>}
        </section>

        <section className="admin-card catalog-entry-section">
          <div>
            <p className="eyebrow">{t.sections.productEyebrow}</p>
            <h2>{t.product.title}</h2>
          </div>
          <div className="catalog-entry-grid">
            <label className="admin-search">{t.product.code}<input maxLength="80" value={productForm.code} onChange={(event) => setProductField('code', event.target.value)} placeholder="NB-001" />
              {fieldErrors.code && <small className="admin-field-error">{fieldErrors.code}</small>}
            </label>
            <label className="admin-search">{t.product.name}<input value={productForm.nameEn} onChange={(event) => setProductField('nameEn', event.target.value)} placeholder={t.product.name} />
              {fieldErrors.productName && <small className="admin-field-error">{fieldErrors.productName}</small>}
            </label>
            <label className="admin-search wide">{t.product.description}<textarea value={productForm.description} onChange={(event) => setProductField('description', event.target.value)} placeholder={t.product.descriptionPlaceholder} /></label>
            <label className="admin-search">{t.product.category}<input value={categorySummary} readOnly /></label>
            <label className="admin-search">{t.product.material}<input value={productForm.material} onChange={(event) => setProductField('material', event.target.value)} placeholder={t.product.material} /></label>
            <label className="admin-search">{t.product.moq}<input min="1" value={productForm.moqDefault} onChange={(event) => setProductField('moqDefault', event.target.value)} type="number" />
              {fieldErrors.moqDefault && <small className="admin-field-error">{fieldErrors.moqDefault}</small>}
            </label>
            <label className="admin-check"><input checked={productForm.isVisible} onChange={(event) => setProductField('isVisible', event.target.checked)} type="checkbox" /> {t.product.visible}</label>
            <label className="admin-check"><input checked={productForm.isExportAvailable} onChange={(event) => setProductField('isExportAvailable', event.target.checked)} type="checkbox" /> {t.product.active}</label>
          </div>
        </section>

        <section className="admin-card catalog-entry-section">
          <div>
            <p className="eyebrow">{t.sections.priceEyebrow}</p>
            <h2>{t.price.title}</h2>
          </div>
          <div className="catalog-entry-grid">
            <label className="admin-search">{t.price.market}<select value={priceForm.market} onChange={(event) => {
              const market = event.target.value
              setPriceForm((current) => ({ ...current, market, currency: market === 'KR' ? 'KRW' : market === 'JP' ? 'JPY' : 'USD' }))
            }}>
              {['KR', 'JP', 'US', 'GLOBAL'].map((market) => <option key={market} value={market}>{market}</option>)}
            </select></label>
            <label className="admin-search">{t.price.currency}<select value={priceForm.currency} onChange={(event) => setPriceField('currency', event.target.value)}>
              {['KRW', 'JPY', 'USD'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select></label>
            <label className="admin-search">{t.price.wholesale}<input inputMode="decimal" value={priceForm.wholesalePrice} onChange={(event) => setPriceField('wholesalePrice', event.target.value)} placeholder="12000" />
              {fieldErrors.wholesalePrice && <small className="admin-field-error">{fieldErrors.wholesalePrice}</small>}
            </label>
            <label className="admin-search">{t.price.retail}<input inputMode="decimal" value={priceForm.retailPrice} onChange={(event) => setPriceField('retailPrice', event.target.value)} placeholder="15000" />
              {fieldErrors.retailPrice && <small className="admin-field-error">{fieldErrors.retailPrice}</small>}
            </label>
            <label className="admin-search">{t.price.moq}<input min="1" value={priceForm.moq} onChange={(event) => setPriceField('moq', event.target.value)} type="number" />
              {fieldErrors.moq && <small className="admin-field-error">{fieldErrors.moq}</small>}
            </label>
            <label className="admin-search">{t.price.minOrderAmount}<input inputMode="decimal" value={priceForm.minOrderAmount} onChange={(event) => setPriceField('minOrderAmount', event.target.value)} placeholder="0" />
              {fieldErrors.minOrderAmount && <small className="admin-field-error">{fieldErrors.minOrderAmount}</small>}
            </label>
            <label className="admin-check"><input checked={priceForm.isActive} onChange={(event) => setPriceField('isActive', event.target.checked)} type="checkbox" /> {t.price.active}</label>
          </div>
        </section>
      </div>

      <aside className="admin-card catalog-entry-summary-panel">
        <div>
          <p className="eyebrow">{t.confirm.title}</p>
          <h2>{t.summaryTitle}</h2>
        </div>
        <dl className="admin-definition-list catalog-entry-summary">
          <dt>{t.confirm.category}</dt><dd>{categorySummary}</dd>
          <dt>{t.confirm.productCode}</dt><dd>{productCode || '-'}</dd>
          <dt>{t.confirm.productName}</dt><dd>{productForm.nameEn || '-'}</dd>
          <dt>{t.confirm.visibility}</dt><dd>{productForm.isVisible ? adminCopy.common.visible : adminCopy.common.hidden}</dd>
          <dt>{t.confirm.market}</dt><dd>{priceForm.market}</dd>
          <dt>{t.confirm.currency}</dt><dd>{priceForm.currency}</dd>
          <dt>{t.confirm.price}</dt><dd>{parsedWholesalePrice == null ? '-' : formatDisplayAmount(parsedWholesalePrice, priceForm.currency)}</dd>
        </dl>
        <div className="catalog-entry-status-list" aria-label={t.saveStatus.title}>
          {['category', 'product', 'price'].map((resource) => <p className={`catalog-entry-status ${saveStatus[resource]}`} key={resource}>
            <span>{t.saveStatus[resource]}</span>
            <strong>{t.saveStatus[saveStatus[resource]]}</strong>
          </p>)}
        </div>
        {message && <p className="admin-inline-message" role="status">{message}</p>}
        {!isComplete ? <div className="admin-actions catalog-entry-actions">
          <button type="button" onClick={cancel}>{t.cancel}</button>
          <button className="primary-action" disabled={isSaving} type="button" onClick={submitAll}>{saveButtonLabel}</button>
        </div> : <div className="admin-actions catalog-entry-actions">
          <AdminLink className="primary-action" to={`/products/${productRouteId}`}>{t.success.viewProduct}</AdminLink>
          <AdminLink to="/admin/products">{t.success.productList}</AdminLink>
          <button type="button" onClick={continueAnother}>{t.success.continueAnother}</button>
        </div>}
      </aside>
    </section>
  </>
}
