import { useMemo, useState } from 'react'
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

const steps = ['category', 'product', 'price', 'confirm']

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

function normalizeCreateMessage(t, resourceName) {
  return t.createdResource.replace('{resource}', resourceName)
}

export function AdminCatalogEntryPage() {
  const adminCopy = useAdminCopy()
  const t = adminCopy.catalogEntry
  const { toLocalePath } = useLocalePath()
  const navigate = useNavigate()
  const mutate = useAdminApiMutation()
  const [stepIndex, setStepIndex] = useState(0)
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const { data, error, status } = useAdminApiResource((api, token) => api.getCategories({ limit: 200 }, token), [refreshKey])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  const categories = useMemo(() => data?.categories || [], [data])
  const selectedCategory = categories.find((category) => getCategoryKey(category) === selectedCategoryKey) || createdCategory
  const activeCategoryKey = getCategoryKey(createdCategory) || selectedCategoryKey
  const currentStep = steps[stepIndex]
  const isDirty = selectedCategoryKey || createdCategory || createdProduct || productForm.code || productForm.nameEn || priceForm.wholesalePrice || categoryForm.categoryId || categoryForm.nameEn

  if (apiState) return apiState

  const setCategoryField = (field, value) => setCategoryForm((current) => ({
    ...current,
    [field]: value,
    ...(field === 'categoryId' && !current.slug ? { slug: slugify(value) } : {}),
  }))
  const setProductField = (field, value) => setProductForm((current) => ({ ...current, [field]: value }))
  const setPriceField = (field, value) => setPriceForm((current) => ({ ...current, [field]: value }))

  const clearMessages = () => {
    setFieldErrors({})
    setMessage('')
  }

  const validateCategory = () => {
    const errors = {}
    if (mode === 'existing' && !selectedCategoryKey) errors.category = t.validation.categoryRequired
    if (mode === 'new') {
      if (!categoryForm.categoryId.trim()) errors.categoryId = t.validation.categoryKeyRequired
      if (!categoryForm.nameEn.trim()) errors.categoryName = t.validation.categoryNameRequired
      if (!categoryForm.slug.trim()) errors.slug = t.validation.slugRequired
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateProduct = () => {
    const errors = {}
    if (!activeCategoryKey) errors.category = t.validation.categoryRequired
    if (!productForm.code.trim()) errors.code = t.validation.productCodeRequired
    if (!productForm.nameEn.trim()) errors.productName = t.validation.productNameRequired
    if (Number(productForm.moqDefault || 0) < 1) errors.moqDefault = t.validation.moqRequired
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validatePrice = () => {
    const errors = {}
    const wholesalePrice = Number(priceForm.wholesalePrice)
    const retailPrice = priceForm.retailPrice === '' ? null : Number(priceForm.retailPrice)
    if (!priceForm.market) errors.market = t.validation.marketRequired
    if (!priceForm.currency) errors.currency = t.validation.currencyRequired
    if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) errors.wholesalePrice = t.validation.priceRequired
    if (retailPrice != null && (!Number.isFinite(retailPrice) || retailPrice <= 0)) errors.retailPrice = t.validation.retailPriceInvalid
    if (Number(priceForm.moq || 0) < 1) errors.moq = t.validation.moqRequired
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateCurrentStep = () => {
    if (currentStep === 'category') return validateCategory()
    if (currentStep === 'product') return validateProduct()
    if (currentStep === 'price') return validatePrice()
    return validateCategory() && validateProduct() && validatePrice()
  }

  const goNext = () => {
    clearMessages()
    if (!validateCurrentStep()) return
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  const goPrevious = () => {
    clearMessages()
    setStepIndex((current) => Math.max(0, current - 1))
  }

  const createCategoryNow = async () => {
    clearMessages()
    if (!validateCategory()) return
    const duplicate = categories.find((category) => getCategoryKey(category).toLowerCase() === categoryForm.categoryId.trim().toLowerCase())
    if (duplicate) {
      setFieldErrors({ categoryId: t.validation.categoryConflict })
      return
    }
    setIsSaving(true)
    try {
      const result = await mutate((api, token) => api.createCategory({
        categoryId: categoryForm.categoryId.trim(),
        nameEn: categoryForm.nameEn.trim(),
        nameKo: categoryForm.nameKo.trim() || undefined,
        nameJa: categoryForm.nameJa.trim() || undefined,
        slug: categoryForm.slug.trim(),
        sortOrder: Number(categoryForm.sortOrder || 0),
        isVisible: categoryForm.isVisible,
      }, token))
      const category = result.data?.category || { ...categoryForm, categoryId: categoryForm.categoryId.trim() }
      setCreatedCategory(category)
      setSelectedCategoryKey(getCategoryKey(category))
      setRefreshKey((current) => current + 1)
      setMessage(normalizeCreateMessage(t, t.category.resource))
    } catch (error) {
      setMessage(formatApiError(t, error))
    } finally {
      setIsSaving(false)
    }
  }

  const submitAll = async () => {
    clearMessages()
    if (!validateCategory() || !validateProduct() || !validatePrice()) {
      setStepIndex(0)
      return
    }
    setIsSaving(true)
    try {
      const code = productForm.code.trim()
      const existingProducts = await mutate((api, token) => api.getProducts({ q: code, limit: 10 }, token))
      const duplicateProduct = (existingProducts.data?.products || []).find((product) => String(product.code || '').toLowerCase() === code.toLowerCase())
      if (duplicateProduct) {
        setStepIndex(1)
        setFieldErrors({ code: t.validation.productConflict })
        setMessage(t.validation.productConflict)
        return
      }

      let categoryKey = activeCategoryKey
      if (mode === 'new' && !createdCategory) {
        const categoryResult = await mutate((api, token) => api.createCategory({
          categoryId: categoryForm.categoryId.trim(),
          nameEn: categoryForm.nameEn.trim(),
          nameKo: categoryForm.nameKo.trim() || undefined,
          nameJa: categoryForm.nameJa.trim() || undefined,
          slug: categoryForm.slug.trim(),
          sortOrder: Number(categoryForm.sortOrder || 0),
          isVisible: categoryForm.isVisible,
        }, token))
        const category = categoryResult.data?.category || { ...categoryForm, categoryId: categoryForm.categoryId.trim() }
        categoryKey = getCategoryKey(category)
        setCreatedCategory(category)
        setSelectedCategoryKey(categoryKey)
      }

      const productResult = await mutate((api, token) => api.createProduct({
        code,
        nameEn: productForm.nameEn.trim(),
        categoryKey,
        material: productForm.material.trim() || undefined,
        moqDefault: Number(productForm.moqDefault || 1),
        colors: [],
        sizes: [],
        imageSet: {},
        imageAlt: {},
        isVisible: productForm.isVisible,
        descriptionEn: productForm.description.trim() || undefined,
      }, token))
      const product = productResult.data?.product || { code, nameEn: productForm.nameEn.trim() }
      setCreatedProduct(product)

      const priceResult = await mutate((api, token) => api.createPrice({
        productCode: code,
        market: priceForm.market,
        currency: priceForm.currency,
        wholesalePrice: Number(priceForm.wholesalePrice),
        retailPrice: priceForm.retailPrice === '' ? undefined : Number(priceForm.retailPrice),
        moq: Number(priceForm.moq || 1),
        minOrderAmount: Number(priceForm.minOrderAmount || 0),
        isActive: priceForm.isActive,
      }, token))
      setCreatedPrice(priceResult.data?.price || { productCode: code, ...priceForm })
      setIsComplete(true)
      setMessage(t.success.saved)
    } catch (error) {
      setMessage(formatApiError(t, error))
    } finally {
      setIsSaving(false)
    }
  }

  const continueAnother = () => {
    setStepIndex(0)
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
    setIsComplete(false)
  }

  const cancel = () => {
    if (isDirty && !window.confirm(t.confirmCancel)) return
    navigate(toLocalePath('/admin/products'))
  }

  const productRouteId = getCreatedProductId(createdProduct, productForm.code.trim())

  return <>
    <AdminPageHeader
      title={t.title}
      description={t.description}
      actions={<><AdminLink to="/admin/products">{t.productList}</AdminLink></>}
    />
    <AdminPreviewNote>{t.note}</AdminPreviewNote>

    <section className="admin-card catalog-entry-card">
      <div className="admin-workflow catalog-entry-steps" aria-label={t.progressLabel}>
        {steps.map((step, index) => <span className={`admin-workflow-step ${index === stepIndex ? 'active' : ''} ${index < stepIndex || isComplete ? 'done' : ''}`.trim()} key={step}>
          {index + 1}. {t.steps[step]}
        </span>)}
      </div>

      {message && <p className="admin-inline-message" role="status">{message}</p>}

      {!isComplete && currentStep === 'category' && <section className="catalog-entry-section">
        <h2>{t.category.title}</h2>
        <div className="admin-filter-tabs">
          <button className={mode === 'existing' ? 'active' : ''} type="button" onClick={() => setMode('existing')}>{t.category.useExisting}</button>
          <button className={mode === 'new' ? 'active' : ''} type="button" onClick={() => setMode('new')}>{t.category.createNew}</button>
        </div>
        {mode === 'existing' ? <label className="admin-search">{t.category.existingLabel}
          <select value={selectedCategoryKey} onChange={(event) => setSelectedCategoryKey(event.target.value)}>
            <option value="">{t.category.selectPlaceholder}</option>
            {categories.map((category) => <option key={category.id || getCategoryKey(category)} value={getCategoryKey(category)}>
              {category.nameEn || category.nameKo || category.nameJa || getCategoryKey(category)}
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
          <button className="primary-action" disabled={isSaving || Boolean(createdCategory)} type="button" onClick={createCategoryNow}>
            {createdCategory ? t.category.created : isSaving ? t.saving : t.category.createNow}
          </button>
        </div>}
      </section>}

      {!isComplete && currentStep === 'product' && <section className="catalog-entry-section">
        <h2>{t.product.title}</h2>
        <div className="catalog-entry-grid">
          <label className="admin-search">{t.product.code}<input value={productForm.code} onChange={(event) => setProductField('code', event.target.value)} placeholder="NB-001" />
            {fieldErrors.code && <small className="admin-field-error">{fieldErrors.code}</small>}
          </label>
          <label className="admin-search">{t.product.name}<input value={productForm.nameEn} onChange={(event) => setProductField('nameEn', event.target.value)} placeholder={t.product.name} />
            {fieldErrors.productName && <small className="admin-field-error">{fieldErrors.productName}</small>}
          </label>
          <label className="admin-search wide">{t.product.description}<textarea value={productForm.description} onChange={(event) => setProductField('description', event.target.value)} placeholder={t.product.descriptionPlaceholder} /></label>
          <label className="admin-search">{t.product.category}<input value={activeCategoryKey} readOnly /></label>
          <label className="admin-search">{t.product.material}<input value={productForm.material} onChange={(event) => setProductField('material', event.target.value)} placeholder={t.product.material} /></label>
          <label className="admin-search">{t.product.moq}<input min="1" value={productForm.moqDefault} onChange={(event) => setProductField('moqDefault', event.target.value)} type="number" />
            {fieldErrors.moqDefault && <small className="admin-field-error">{fieldErrors.moqDefault}</small>}
          </label>
          <label className="admin-check"><input checked={productForm.isVisible} onChange={(event) => setProductField('isVisible', event.target.checked)} type="checkbox" /> {t.product.visible}</label>
        </div>
      </section>}

      {!isComplete && currentStep === 'price' && <section className="catalog-entry-section">
        <h2>{t.price.title}</h2>
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
          <label className="admin-search">{t.price.wholesale}<input min="1" value={priceForm.wholesalePrice} onChange={(event) => setPriceField('wholesalePrice', event.target.value)} type="number" />
            {fieldErrors.wholesalePrice && <small className="admin-field-error">{fieldErrors.wholesalePrice}</small>}
          </label>
          <label className="admin-search">{t.price.retail}<input min="1" value={priceForm.retailPrice} onChange={(event) => setPriceField('retailPrice', event.target.value)} type="number" />
            {fieldErrors.retailPrice && <small className="admin-field-error">{fieldErrors.retailPrice}</small>}
          </label>
          <label className="admin-search">{t.price.moq}<input min="1" value={priceForm.moq} onChange={(event) => setPriceField('moq', event.target.value)} type="number" />
            {fieldErrors.moq && <small className="admin-field-error">{fieldErrors.moq}</small>}
          </label>
          <label className="admin-search">{t.price.minOrderAmount}<input min="0" value={priceForm.minOrderAmount} onChange={(event) => setPriceField('minOrderAmount', event.target.value)} type="number" /></label>
          <label className="admin-check"><input checked={priceForm.isActive} onChange={(event) => setPriceField('isActive', event.target.checked)} type="checkbox" /> {t.price.active}</label>
        </div>
      </section>}

      {!isComplete && currentStep === 'confirm' && <section className="catalog-entry-section">
        <h2>{t.confirm.title}</h2>
        <dl className="admin-definition-list catalog-entry-summary">
          <dt>{t.confirm.category}</dt><dd>{selectedCategory?.nameEn || selectedCategory?.nameKo || activeCategoryKey}</dd>
          <dt>{t.confirm.productCode}</dt><dd>{productForm.code || '-'}</dd>
          <dt>{t.confirm.productName}</dt><dd>{productForm.nameEn || '-'}</dd>
          <dt>{t.confirm.market}</dt><dd>{priceForm.market}</dd>
          <dt>{t.confirm.currency}</dt><dd>{priceForm.currency}</dd>
          <dt>{t.confirm.price}</dt><dd>{priceForm.wholesalePrice || '-'}</dd>
          <dt>{t.confirm.visibility}</dt><dd>{productForm.isVisible ? adminCopy.common.visible : adminCopy.common.hidden}</dd>
        </dl>
      </section>}

      {isComplete && <section className="catalog-entry-section">
        <h2>{t.success.title}</h2>
        <dl className="admin-definition-list catalog-entry-summary">
          <dt>{t.confirm.productCode}</dt><dd>{createdProduct?.code || productForm.code}</dd>
          <dt>{t.confirm.market}</dt><dd>{createdPrice?.market || priceForm.market}</dd>
          <dt>{t.confirm.currency}</dt><dd>{createdPrice?.currency || priceForm.currency}</dd>
          <dt>{t.confirm.price}</dt><dd>{createdPrice?.wholesalePrice || priceForm.wholesalePrice}</dd>
        </dl>
        <div className="admin-actions">
          <AdminLink className="primary-action" to={`/products/${productRouteId}`}>{t.success.viewProduct}</AdminLink>
          <AdminLink to="/admin/products">{t.success.productList}</AdminLink>
          <button type="button" onClick={continueAnother}>{t.success.continueAnother}</button>
        </div>
      </section>}

      {!isComplete && <div className="admin-actions catalog-entry-actions">
        <button type="button" onClick={cancel}>{t.cancel}</button>
        {stepIndex > 0 && <button type="button" onClick={goPrevious}>{t.previous}</button>}
        {stepIndex < steps.length - 1 && <button className="primary-action" type="button" onClick={goNext}>{t.next}</button>}
        {stepIndex === steps.length - 1 && <button className="primary-action" disabled={isSaving} type="button" onClick={submitAll}>
          {isSaving ? t.saving : t.save}
        </button>}
      </div>}
    </section>
  </>
}
