import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLink, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'
import { formatCurrency, formatMarketLabel, getCurrencyInputStep, getMarketDisplay, isValidMarketCurrencyPair, marketCurrency, supportedCurrencies, supportedMarkets } from '../../config/currency.js'
import { getDimensionLabel, getTaxonomyLabel, taxonomyDimensions } from '../../data/productTaxonomy.js'
import { useLocalePath } from '../../utils/locale'

const maxImageCount = 8
const maxImageBytes = 10 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

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
  nameKo: '',
  description: '',
  material: '',
  colorsText: '',
  sizesText: '',
  badge: '',
  moqDefault: '1',
  isVisible: true,
  isExportAvailable: true,
  isNew: true,
  isBest: false,
}

const initialTaxonomyForm = {
  productGroup: 'piercing',
  piercingType: 'ball',
  baseMaterial: '',
  allSurgical: false,
  decorationMaterials: [],
  structures: [],
  styles: [],
  shapes: [],
  saleType: 'single',
}

const initialSpecForm = {
  gauge: '',
  length: '',
  barLength: '',
  postLength: '',
  ballSize: '',
  charmSize: '',
  totalLength: '',
  innerDiameter: '',
  barThickness: '',
  unit: 'mm',
  specNote: '',
  decorationType: '',
  decorationColor: '',
  decorationSize: '',
  decorationCount: '',
  settingMethod: '',
  decorationNote: '',
}

const initialDetailForm = {
  headline: '',
  body: '',
  description: '',
  materialInfo: '',
  sizeGuide: '',
  careGuide: '',
  exchangeNotice: '',
  wholesaleNotice: '',
  care: '',
  fit: '',
  decoration: '',
}

const initialHomePlacementForm = {
  showInSnap: false,
  showInNewArrivals: true,
  showInWeeklyPick: false,
  showInBuyerSelection: false,
  showInPiercing: false,
  showInSteadySelection: false,
  homeNote: '',
  sortPriority: '0',
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

const priceMarketOrder = ['JP', 'US', 'TW', 'GLOBAL']
const autoPriceMarkets = new Set(['JP', 'US', 'TW'])

function createInitialMarketPriceForms() {
  return Object.fromEntries(priceMarketOrder.map((market) => [market, {
    market,
    currency: marketCurrency[market] || 'USD',
    pricingMode: market === 'GLOBAL' ? 'unavailable' : 'fx_auto',
    wholesalePrice: '',
    retailPrice: '',
    moq: '1',
    minOrderAmount: '0',
    isActive: true,
  }]))
}

const initialSaveStatus = {
  category: 'idle',
  product: 'idle',
  images: 'idle',
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
  if (error?.status === 413 || error?.code === 'PAYLOAD_TOO_LARGE') return 'tooLarge'
  if (error?.status === 415 || error?.code === 'UNSUPPORTED_MEDIA_TYPE') return 'unsupportedImage'
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

function getMoneyPattern(currency) {
  return currency === 'KRW' || currency === 'JPY' ? /^\d+$/ : /^\d+(\.\d{1,2})?$/
}

function parsePositiveMoney(value, currency = 'KRW') {
  const text = String(value || '').trim()
  if (!getMoneyPattern(currency).test(text)) return null
  const number = Number(text)
  if (!Number.isFinite(number) || number <= 0) return null
  return number
}

function parseOptionalPositiveMoney(value, currency = 'KRW') {
  if (String(value || '').trim() === '') return undefined
  return parsePositiveMoney(value, currency)
}

function parseOptionalNonnegativeMoney(value, currency = 'KRW') {
  const text = String(value || '').trim()
  if (text === '') return undefined
  if (!getMoneyPattern(currency).test(text)) return null
  const number = Number(text)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}

function parseDelimitedList(value) {
  return String(value || '')
    .split(/[,/\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const positiveSpecFields = new Set(['length', 'barLength', 'postLength', 'ballSize', 'charmSize', 'totalLength', 'innerDiameter', 'barThickness', 'decorationSize'])

function isOptionalPositiveNumber(value) {
  const text = String(value || '').trim()
  if (!text) return true
  const number = Number(text)
  return Number.isFinite(number) && number > 0
}

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'boolean') return true
    return value !== undefined && value !== null && String(value).trim() !== ''
  }))
}

function toggleArrayValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function formatDisplayAmount(value, currency) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return formatCurrency(number, currency || 'KRW', { showCode: true })
}

function detectImageMime(bytes) {
  const data = new Uint8Array(bytes)
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) return 'image/png'
  if (
    data.length >= 12 &&
    String.fromCharCode(...data.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
  ) return 'image/webp'
  return ''
}

function readImage(previewUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('invalid_image'))
    image.src = previewUrl
  })
}

async function createImageItem(file, t) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error(t.validation.imageType)
  }
  if (file.size > maxImageBytes) {
    throw new Error(t.validation.imageTooLarge)
  }
  const detectedType = detectImageMime(await file.slice(0, 12).arrayBuffer())
  if (!detectedType || detectedType !== file.type) {
    throw new Error(t.validation.imageSignature)
  }
  const previewUrl = URL.createObjectURL(file)
  try {
    const dimensions = await readImage(previewUrl)
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl,
      altText: '',
      isPrimary: false,
      status: 'ready',
      error: '',
      ...dimensions,
    }
  } catch (error) {
    URL.revokeObjectURL(previewUrl)
    throw error
  }
}

function buildImagesFormData(images, productName) {
  const formData = new FormData()
  images.forEach((image) => formData.append('images', image.file, image.file.name))
  formData.append('metadata', JSON.stringify({
    primaryIndex: Math.max(0, images.findIndex((image) => image.isPrimary)),
    altTexts: images.map((image) => image.altText.trim() || productName),
  }))
  return formData
}

export function AdminCatalogEntryPage() {
  const adminCopy = useAdminCopy()
  const t = adminCopy.catalogEntry
  const { locale, toLocalePath } = useLocalePath()
  const navigate = useNavigate()
  const mutate = useAdminApiMutation()
  const imageInputRef = useRef(null)
  const imagesRef = useRef([])
  const [mode, setMode] = useState('existing')
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('')
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [productForm, setProductForm] = useState(initialProductForm)
  const [taxonomyForm, setTaxonomyForm] = useState(initialTaxonomyForm)
  const [specForm, setSpecForm] = useState(initialSpecForm)
  const [detailForm, setDetailForm] = useState(initialDetailForm)
  const [homePlacementForm, setHomePlacementForm] = useState(initialHomePlacementForm)
  const [priceForm, setPriceForm] = useState(initialPriceForm)
  const [marketPriceForms, setMarketPriceForms] = useState(createInitialMarketPriceForms)
  const [images, setImages] = useState([])
  const [createdCategory, setCreatedCategory] = useState(null)
  const [createdProduct, setCreatedProduct] = useState(null)
  const [createdPrice, setCreatedPrice] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(initialSaveStatus)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isDropActive, setIsDropActive] = useState(false)

  const { data, error, status } = useAdminApiResource((api, token) => api.getCategories({ limit: 200 }, token), [refreshKey])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  const categories = useMemo(() => data?.categories || [], [data])
  const selectedCategory = categories.find((category) => getCategoryKey(category) === selectedCategoryKey) || createdCategory
  const activeCategoryKey = getCategoryKey(createdCategory) || selectedCategoryKey
  const productCode = normalizeCode(productForm.code)
  const productRouteId = getCreatedProductId(createdProduct, productCode)
  const parsedWholesalePrice = parsePositiveMoney(priceForm.wholesalePrice, priceForm.currency)
  const primaryImage = images.find((image) => image.isPrimary) || images[0] || null
  const canEditImages = !uploadedImages.length && !isSaving && !isComplete
  const isDirty = Boolean(
    selectedCategoryKey ||
    createdCategory ||
    createdProduct ||
    createdPrice ||
    uploadedImages.length ||
    images.length ||
    productForm.code ||
    productForm.nameEn ||
    productForm.nameKo ||
    productForm.description ||
    productForm.colorsText ||
    productForm.sizesText ||
    JSON.stringify(taxonomyForm) !== JSON.stringify(initialTaxonomyForm) ||
    Object.values(specForm).some(Boolean) ||
    Object.values(detailForm).some(Boolean) ||
    Object.values(homePlacementForm).some((value) => value === true || (typeof value === 'string' && value && value !== '0')) ||
    priceForm.wholesalePrice ||
    Object.values(marketPriceForms).some((entry) => entry.pricingMode === 'manual_fixed' || entry.wholesalePrice) ||
    categoryForm.categoryId ||
    categoryForm.nameEn
  )

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [])

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
  const setTaxonomyField = (field, value) => setTaxonomyForm((current) => ({ ...current, [field]: value }))
  const toggleTaxonomyValue = (field, value) => setTaxonomyForm((current) => ({ ...current, [field]: toggleArrayValue(current[field] || [], value) }))
  const setSpecField = (field, value) => setSpecForm((current) => ({ ...current, [field]: value }))
  const setDetailField = (field, value) => setDetailForm((current) => ({ ...current, [field]: value }))
  const setHomePlacementField = (field, value) => setHomePlacementForm((current) => ({ ...current, [field]: value }))
  const setPriceField = (field, value) => setPriceForm((current) => ({ ...current, [field]: value }))
  const setMarketPriceField = (market, field, value) => setMarketPriceForms((current) => {
    const entry = current[market]
    if (!entry) return current
    const shouldSwitchManual = ['wholesalePrice', 'retailPrice', 'moq', 'minOrderAmount'].includes(field) && String(value || '').trim() !== ''
    return {
      ...current,
      [market]: {
        ...entry,
        [field]: value,
        ...(field === 'pricingMode' && value === 'unavailable' ? {
          wholesalePrice: '',
          retailPrice: '',
          minOrderAmount: '0',
          moq: '1',
          isActive: true,
        } : {}),
        ...(shouldSwitchManual && entry.pricingMode === 'fx_auto' ? { pricingMode: 'manual_fixed' } : {}),
      },
    }
  })

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
    if (productForm.isVisible && !productForm.nameKo.trim()) errors.productNameKo = t.validation.productNameKoRequired
    if (Number(productForm.moqDefault || 0) < 1) errors.moqDefault = t.validation.moqRequired
    for (const field of positiveSpecFields) {
      if (!isOptionalPositiveNumber(specForm[field])) errors[field] = t.validation.specPositiveInvalid
    }
    if (homePlacementForm.sortPriority && !Number.isInteger(Number(homePlacementForm.sortPriority))) errors.sortPriority = t.validation.sortPriorityInvalid
    return errors
  }

  const validateImages = () => {
    const errors = {}
    if (!images.length && !uploadedImages.length) errors.images = t.validation.imageRequired
    if (images.length > maxImageCount) errors.images = t.validation.imageCount
    if (images.some((image) => image.error)) errors.images = t.validation.imageInvalid
    return errors
  }

  const validatePrice = () => {
    const errors = {}
    const wholesalePrice = parsePositiveMoney(priceForm.wholesalePrice, priceForm.currency)
    const retailPrice = parseOptionalPositiveMoney(priceForm.retailPrice, priceForm.currency)
    if (!priceForm.market) errors.market = t.validation.marketRequired
    if (!priceForm.currency) errors.currency = t.validation.currencyRequired
    if (priceForm.market && priceForm.market !== 'KR') errors.market = t.validation.marketRequired
    if (priceForm.currency && priceForm.currency !== 'KRW') errors.currency = t.validation.currencyRequired
    if (priceForm.market && priceForm.currency && !isValidMarketCurrencyPair(priceForm.market, priceForm.currency)) errors.currency = t.validation.currencyRequired
    if (wholesalePrice == null) errors.wholesalePrice = t.validation.priceRequired
    if (priceForm.retailPrice !== '' && retailPrice == null) errors.retailPrice = t.validation.retailPriceInvalid
    if (Number(priceForm.moq || 0) < 1) errors.moq = t.validation.moqRequired
    if (parseOptionalNonnegativeMoney(priceForm.minOrderAmount, priceForm.currency) == null) errors.minOrderAmount = t.validation.priceRequired
    for (const market of priceMarketOrder) {
      const entry = marketPriceForms[market]
      if (!entry) continue
      const currency = entry.currency
      if (entry.pricingMode === 'unavailable') {
        if (market !== 'GLOBAL') errors[`${market}Mode`] = t.validation.marketModeRequired
        continue
      }
      if (entry.pricingMode === 'fx_auto') {
        if (!autoPriceMarkets.has(market)) errors[`${market}Mode`] = t.validation.marketModeRequired
        continue
      }
      if (entry.pricingMode !== 'manual_fixed') {
        errors[`${market}Mode`] = t.validation.marketModeRequired
        continue
      }
      if (!isValidMarketCurrencyPair(market, currency)) errors[`${market}Currency`] = t.validation.currencyRequired
      if (parsePositiveMoney(entry.wholesalePrice, currency) == null) errors[`${market}WholesalePrice`] = t.validation.priceRequired
      if (entry.retailPrice !== '' && parseOptionalPositiveMoney(entry.retailPrice, currency) == null) errors[`${market}RetailPrice`] = t.validation.retailPriceInvalid
      if (Number(entry.moq || 0) < 1) errors[`${market}Moq`] = t.validation.moqRequired
      if (parseOptionalNonnegativeMoney(entry.minOrderAmount, currency) == null) errors[`${market}MinOrderAmount`] = t.validation.priceRequired
    }
    return errors
  }

  const validateAll = () => {
    const errors = {
      ...validateCategory(),
      ...validateProduct(),
      ...validateImages(),
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

  const addImageFiles = async (fileList) => {
    clearMessages()
    const files = Array.from(fileList || [])
    if (!files.length || !canEditImages) return
    const remainingSlots = maxImageCount - images.length
    const acceptedFiles = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      setFieldErrors((current) => ({ ...current, images: t.validation.imageCount }))
    }

    const nextImages = []
    for (const file of acceptedFiles) {
      try {
        nextImages.push(await createImageItem(file, t))
      } catch (error) {
        setFieldErrors((current) => ({ ...current, images: error.message || t.validation.imageInvalid }))
      }
    }
    if (!nextImages.length) return
    setImages((current) => {
      const merged = [...current, ...nextImages].slice(0, maxImageCount)
      if (!merged.some((image) => image.isPrimary) && merged[0]) merged[0] = { ...merged[0], isPrimary: true }
      return merged
    })
  }

  const removeImage = (imageId) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === imageId)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = current.filter((image) => image.id !== imageId)
      if (removed?.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true }
      return next
    })
  }

  const setPrimaryImage = (imageId) => {
    setImages((current) => current.map((image) => ({ ...image, isPrimary: image.id === imageId })))
  }

  const moveImage = (imageId, direction) => {
    setImages((current) => {
      const index = current.findIndex((image) => image.id === imageId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      const [image] = next.splice(index, 1)
      next.splice(target, 0, image)
      return next
    })
  }

  const setImageAltText = (imageId, altText) => {
    setImages((current) => current.map((image) => image.id === imageId ? { ...image, altText } : image))
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
    nameKo: productForm.nameKo.trim() || undefined,
    categoryKey,
    material: productForm.material.trim() || undefined,
    moqDefault: Number(productForm.moqDefault || 1),
    colors: parseDelimitedList(productForm.colorsText),
    sizes: parseDelimitedList(productForm.sizesText),
    imageSet: {},
    imageAlt: {},
    taxonomy: compactObject({
      ...taxonomyForm,
      allSurgical: Boolean(taxonomyForm.allSurgical),
    }),
    specs: compactObject(specForm),
    detailContent: compactObject(detailForm),
    homePlacement: compactObject({
      ...homePlacementForm,
      sortPriority: Number(homePlacementForm.sortPriority || 0),
    }),
    badge: productForm.badge.trim() || undefined,
    isVisible: productForm.isVisible,
    isExportAvailable: productForm.isExportAvailable,
    isNew: productForm.isNew,
    isBest: productForm.isBest,
    descriptionEn: productForm.description.trim() || undefined,
    descriptionKo: detailForm.description.trim() || productForm.description.trim() || undefined,
  })

  const createPricePayload = () => ({
    productCode,
    market: priceForm.market,
    currency: priceForm.currency,
    wholesalePrice: parsePositiveMoney(priceForm.wholesalePrice),
    retailPrice: parseOptionalPositiveMoney(priceForm.retailPrice, priceForm.currency),
    moq: Number(priceForm.moq || 1),
    minOrderAmount: parseOptionalNonnegativeMoney(priceForm.minOrderAmount, priceForm.currency) ?? 0,
    isActive: priceForm.isActive,
  })

  const createPriceBookPayload = () => ({
    kr: {
      wholesalePrice: parsePositiveMoney(priceForm.wholesalePrice, priceForm.currency),
      retailPrice: parseOptionalPositiveMoney(priceForm.retailPrice, priceForm.currency),
      moq: Number(priceForm.moq || 1),
      minOrderAmount: parseOptionalNonnegativeMoney(priceForm.minOrderAmount, priceForm.currency) ?? 0,
      isActive: priceForm.isActive,
    },
    markets: priceMarketOrder.flatMap((market) => {
      const entry = marketPriceForms[market]
      if (!entry || entry.pricingMode === 'unavailable') return []
      if (entry.pricingMode === 'fx_auto') return [{ market, currency: entry.currency, pricingMode: 'fx_auto' }]
      return [{
        market,
        currency: entry.currency,
        pricingMode: 'manual_fixed',
        wholesalePrice: parsePositiveMoney(entry.wholesalePrice, entry.currency),
        retailPrice: parseOptionalPositiveMoney(entry.retailPrice, entry.currency),
        moq: Number(entry.moq || 1),
        minOrderAmount: parseOptionalNonnegativeMoney(entry.minOrderAmount, entry.currency) ?? 0,
        isActive: entry.isActive,
      }]
    }),
  })

  const ensureProductCodeAvailable = async () => {
    const existingProducts = await mutate((api, token) => api.getProducts({ q: productCode, limit: 10 }, token))
    const duplicateProduct = (existingProducts.data?.products || []).find((product) => String(product.code || '').toLowerCase() === productCode.toLowerCase())
    if (duplicateProduct) {
      setFieldErrors((current) => ({ ...current, code: t.validation.productConflict }))
      throw Object.assign(new Error(t.validation.productConflict), { status: 409, code: 'CONFLICT', field: 'code' })
    }
  }

  const uploadImagesForProduct = async (product) => {
    const productId = product?.id
    if (!productId) {
      throw Object.assign(new Error(t.validation.imageUploadNeedsProduct), { field: 'images' })
    }
    const formData = buildImagesFormData(images, productForm.nameKo.trim() || productForm.nameEn.trim())
    const result = await mutate((api, token) => api.uploadProductImages(productId, formData, token))
    setUploadedImages(result.data?.images || [])
    if (result.data?.product) setCreatedProduct(result.data.product)
    return result
  }

  const submitAll = async () => {
    clearMessages()
    if (!validateAll()) return
    setIsSaving(true)
    let activeResource = ''
    try {
      let categoryKey = activeCategoryKey
      let product = createdProduct

      if (!product) {
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

      if (!product) {
        activeResource = 'product'
        updateSaveStatus('product', 'saving')
        const productResult = await mutate((api, token) => api.createProduct(createProductPayload(categoryKey), token))
        product = productResult.data?.product || { code: productCode, nameEn: productForm.nameEn.trim(), nameKo: productForm.nameKo.trim() }
        setCreatedProduct(product)
        updateSaveStatus('product', 'success')
      }

      if (!uploadedImages.length) {
        activeResource = 'images'
        updateSaveStatus('images', 'saving')
        setImages((current) => current.map((image) => ({ ...image, status: 'uploading', error: '' })))
        await uploadImagesForProduct(product)
        setImages((current) => current.map((image) => ({ ...image, status: 'uploaded' })))
        updateSaveStatus('images', 'success')
      }

      if (!createdPrice) {
        activeResource = 'price'
        updateSaveStatus('price', 'saving')
        const productId = product?.id
        const priceResult = productId
          ? await mutate((api, token) => api.setupProductPriceBooks(productId, createPriceBookPayload(), token))
          : await mutate((api, token) => api.createPrice(createPricePayload(), token))
        const createdKrPrice = (priceResult.data?.prices || []).find((price) => price.market === 'KR') || priceResult.data?.price
        setCreatedPrice(createdKrPrice || { productCode, ...priceForm })
        updateSaveStatus('price', 'success')
      }

      setIsComplete(true)
      setMessage(t.success.saved)
    } catch (error) {
      const key = error?.field || activeResource
      if (key && key !== 'code') updateSaveStatus(key, 'error')
      if (key === 'images') {
        setImages((current) => current.map((image) => ({ ...image, status: 'error', error: formatApiError(t, error) })))
      }
      setMessage(formatApiError(t, error))
    } finally {
      setIsSaving(false)
    }
  }

  const continueAnother = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setMode('existing')
    setSelectedCategoryKey('')
    setCategoryForm(initialCategoryForm)
    setProductForm(initialProductForm)
    setTaxonomyForm(initialTaxonomyForm)
    setSpecForm(initialSpecForm)
    setDetailForm(initialDetailForm)
    setHomePlacementForm(initialHomePlacementForm)
    setPriceForm(initialPriceForm)
    setMarketPriceForms(createInitialMarketPriceForms())
    setImages([])
    setUploadedImages([])
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
  const saveDisabled = isSaving || (!images.length && !uploadedImages.length)
  const priceInputStep = getCurrencyInputStep(priceForm.currency)
  const getTaxonomyValues = (key) => taxonomyDimensions.find((dimension) => dimension.key === key)?.values || []
  const renderSingleTaxonomy = (key) => <div className="catalog-taxonomy-row" key={key}>
    <strong>{getDimensionLabel(key, locale)}</strong>
    <div>
      {getTaxonomyValues(key).map((value) => <button
        className={taxonomyForm[key] === value ? 'active' : ''}
        key={value}
        type="button"
        onClick={() => setTaxonomyField(key, value)}
      >{getTaxonomyLabel(key, value, locale)}</button>)}
    </div>
  </div>
  const renderMultiTaxonomy = (key) => <div className="catalog-taxonomy-row" key={key}>
    <strong>{getDimensionLabel(key, locale)}</strong>
    <div>
      {getTaxonomyValues(key).map((value) => <button
        className={(taxonomyForm[key] || []).includes(value) ? 'active' : ''}
        key={value}
        type="button"
        onClick={() => toggleTaxonomyValue(key, value)}
      >{getTaxonomyLabel(key, value, locale)}</button>)}
    </div>
  </div>
  const editorProgressItems = [
    t.progress.category,
    t.progress.product,
    t.progress.classification,
    t.progress.specs,
    t.progress.detail,
    t.progress.images,
    t.progress.price,
    t.progress.placement,
  ]

  return <>
    <AdminPageHeader
      title={t.title}
      description={t.description}
      actions={<><AdminLink to="/admin/products">{t.productList}</AdminLink></>}
    />
    <AdminPreviewNote>{t.note}</AdminPreviewNote>

    <ol className="catalog-editor-progress" aria-label={t.progress.title}>
      {editorProgressItems.map((label, index) => <li key={label}>
        <span>{index + 1}</span>
        <strong>{label}</strong>
      </li>)}
    </ol>

    <ol className="catalog-entry-progress" aria-label={t.saveStatus.title}>
      {['category', 'product', 'images', 'price'].map((resource, index) => <li className={saveStatus[resource]} key={resource}>
        <span>{index + 1}</span>
        <strong>{t.saveStatus[resource]}</strong>
      </li>)}
    </ol>

    <section className="catalog-entry-layout">
      <div className="catalog-entry-form-stack">
        <section className="admin-card catalog-entry-section">
          <div className="catalog-entry-section-heading">
            <span className="catalog-entry-step-badge">1</span>
            <div>
              <p className="eyebrow">{t.sections.categoryEyebrow}</p>
              <h2>{t.category.title}</h2>
            </div>
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
          <div className="catalog-entry-section-heading">
            <span className="catalog-entry-step-badge">2</span>
            <div>
              <p className="eyebrow">{t.sections.productEyebrow}</p>
              <h2>{t.product.title}</h2>
            </div>
          </div>
          <div className="catalog-entry-grid">
            <label className="admin-search">{t.product.code}<input maxLength="80" value={productForm.code} onChange={(event) => setProductField('code', event.target.value)} placeholder="NB-001" />
              {fieldErrors.code && <small className="admin-field-error">{fieldErrors.code}</small>}
            </label>
            <label className="admin-search">{t.product.name}<input value={productForm.nameEn} onChange={(event) => setProductField('nameEn', event.target.value)} placeholder={t.product.name} />
              {fieldErrors.productName && <small className="admin-field-error">{fieldErrors.productName}</small>}
            </label>
            <label className="admin-search">{t.product.nameKo}<input value={productForm.nameKo} onChange={(event) => setProductField('nameKo', event.target.value)} placeholder={t.product.nameKoPlaceholder} />
              {fieldErrors.productNameKo && <small className="admin-field-error">{fieldErrors.productNameKo}</small>}
            </label>
            <label className="admin-search wide">{t.product.description}<textarea value={productForm.description} onChange={(event) => setProductField('description', event.target.value)} placeholder={t.product.descriptionPlaceholder} /></label>
            <label className="admin-search">{t.product.category}<input value={categorySummary} readOnly /></label>
            <label className="admin-search">{t.product.material}<input value={productForm.material} onChange={(event) => setProductField('material', event.target.value)} placeholder={t.product.material} /></label>
            <label className="admin-search">{t.attributes.colors}<input value={productForm.colorsText} onChange={(event) => setProductField('colorsText', event.target.value)} placeholder={t.attributes.colorsPlaceholder} /></label>
            <label className="admin-search">{t.attributes.sizes}<input value={productForm.sizesText} onChange={(event) => setProductField('sizesText', event.target.value)} placeholder={t.attributes.sizesPlaceholder} /></label>
            <label className="admin-search">{t.attributes.badge}<input value={productForm.badge} onChange={(event) => setProductField('badge', event.target.value)} placeholder="NEW, BEST, HOT" /></label>
            <label className="admin-search">{t.product.moq}<input min="1" value={productForm.moqDefault} onChange={(event) => setProductField('moqDefault', event.target.value)} type="number" />
              {fieldErrors.moqDefault && <small className="admin-field-error">{fieldErrors.moqDefault}</small>}
            </label>
            <label className="admin-check"><input checked={productForm.isVisible} onChange={(event) => setProductField('isVisible', event.target.checked)} type="checkbox" /> {t.product.visible}</label>
            <label className="admin-check"><input checked={productForm.isExportAvailable} onChange={(event) => setProductField('isExportAvailable', event.target.checked)} type="checkbox" /> {t.product.active}</label>
            <label className="admin-check"><input checked={productForm.isNew} onChange={(event) => setProductField('isNew', event.target.checked)} type="checkbox" /> {t.product.newArrival}</label>
            <label className="admin-check"><input checked={productForm.isBest} onChange={(event) => setProductField('isBest', event.target.checked)} type="checkbox" /> {t.product.weeklyBest}</label>
          </div>
        </section>

        <section className="admin-card catalog-entry-section">
          <div className="catalog-entry-section-heading">
            <span className="catalog-entry-step-badge">3</span>
            <div>
              <p className="eyebrow">{t.attributes.eyebrow}</p>
              <h2>{t.attributes.title}</h2>
              <p className="admin-muted">{t.attributes.description}</p>
            </div>
          </div>
          <div className="catalog-taxonomy-editor">
            <div className="catalog-entry-subheading">
              <strong>{t.attributes.classificationTitle}</strong>
              <span>{t.attributes.classificationDescription}</span>
            </div>
            {renderSingleTaxonomy('productGroup')}
            {renderSingleTaxonomy('piercingType')}
            {renderSingleTaxonomy('baseMaterial')}
            <div className="catalog-taxonomy-row">
              <strong>{getDimensionLabel('allSurgical', locale)}</strong>
              <div>
                <button className={taxonomyForm.allSurgical ? 'active' : ''} type="button" onClick={() => setTaxonomyField('allSurgical', !taxonomyForm.allSurgical)}>
                  {getTaxonomyLabel('allSurgical', 'true', locale)}
                </button>
              </div>
            </div>
            {renderMultiTaxonomy('decorationMaterials')}
            {renderMultiTaxonomy('structures')}
            {renderMultiTaxonomy('styles')}
            {renderMultiTaxonomy('shapes')}
            {renderSingleTaxonomy('saleType')}
          </div>
          <div className="catalog-entry-grid catalog-entry-detail-grid">
            <div className="catalog-entry-subheading wide">
              <strong>{t.attributes.optionsSpecsTitle}</strong>
              <span>{t.attributes.optionsSpecsDescription}</span>
            </div>
            <label className="admin-search">{t.attributes.gauge}<input value={specForm.gauge} onChange={(event) => setSpecField('gauge', event.target.value)} placeholder="16G" /></label>
            <label className="admin-search">{t.attributes.length}<input value={specForm.length} onChange={(event) => setSpecField('length', event.target.value)} placeholder="6" />
              {fieldErrors.length && <small className="admin-field-error">{fieldErrors.length}</small>}
            </label>
            <label className="admin-search">{t.attributes.barLength}<input value={specForm.barLength} onChange={(event) => setSpecField('barLength', event.target.value)} placeholder="6" />
              {fieldErrors.barLength && <small className="admin-field-error">{fieldErrors.barLength}</small>}
            </label>
            <label className="admin-search">{t.attributes.postLength}<input value={specForm.postLength} onChange={(event) => setSpecField('postLength', event.target.value)} placeholder="6" />
              {fieldErrors.postLength && <small className="admin-field-error">{fieldErrors.postLength}</small>}
            </label>
            <label className="admin-search">{t.attributes.ballSize}<input value={specForm.ballSize} onChange={(event) => setSpecField('ballSize', event.target.value)} placeholder="4" />
              {fieldErrors.ballSize && <small className="admin-field-error">{fieldErrors.ballSize}</small>}
            </label>
            <label className="admin-search">{t.attributes.charmSize}<input value={specForm.charmSize} onChange={(event) => setSpecField('charmSize', event.target.value)} placeholder="4" />
              {fieldErrors.charmSize && <small className="admin-field-error">{fieldErrors.charmSize}</small>}
            </label>
            <label className="admin-search">{t.attributes.totalLength}<input value={specForm.totalLength} onChange={(event) => setSpecField('totalLength', event.target.value)} placeholder="12" />
              {fieldErrors.totalLength && <small className="admin-field-error">{fieldErrors.totalLength}</small>}
            </label>
            <label className="admin-search">{t.attributes.innerDiameter}<input value={specForm.innerDiameter} onChange={(event) => setSpecField('innerDiameter', event.target.value)} placeholder="8" />
              {fieldErrors.innerDiameter && <small className="admin-field-error">{fieldErrors.innerDiameter}</small>}
            </label>
            <label className="admin-search">{t.attributes.barThickness}<input value={specForm.barThickness} onChange={(event) => setSpecField('barThickness', event.target.value)} placeholder="1.2" />
              {fieldErrors.barThickness && <small className="admin-field-error">{fieldErrors.barThickness}</small>}
            </label>
            <label className="admin-search">{t.attributes.unit}<input value={specForm.unit} onChange={(event) => setSpecField('unit', event.target.value)} placeholder="mm" /></label>
            <label className="admin-search wide">{t.attributes.specNote}<input value={specForm.specNote} onChange={(event) => setSpecField('specNote', event.target.value)} placeholder={t.attributes.specNotePlaceholder} /></label>
            <label className="admin-search">{t.attributes.decorationType}<input value={specForm.decorationType} onChange={(event) => setSpecField('decorationType', event.target.value)} placeholder={t.attributes.decorationTypePlaceholder} /></label>
            <label className="admin-search">{t.attributes.decorationColor}<input value={specForm.decorationColor} onChange={(event) => setSpecField('decorationColor', event.target.value)} placeholder={t.attributes.decorationColorPlaceholder} /></label>
            <label className="admin-search">{t.attributes.decorationSize}<input value={specForm.decorationSize} onChange={(event) => setSpecField('decorationSize', event.target.value)} placeholder="3" />
              {fieldErrors.decorationSize && <small className="admin-field-error">{fieldErrors.decorationSize}</small>}
            </label>
            <label className="admin-search">{t.attributes.decorationCount}<input value={specForm.decorationCount} onChange={(event) => setSpecField('decorationCount', event.target.value)} placeholder="4" /></label>
            <label className="admin-search">{t.attributes.settingMethod}<input value={specForm.settingMethod} onChange={(event) => setSpecField('settingMethod', event.target.value)} placeholder={t.attributes.settingMethodPlaceholder} /></label>
            <label className="admin-search wide">{t.attributes.decorationNote}<input value={specForm.decorationNote} onChange={(event) => setSpecField('decorationNote', event.target.value)} placeholder={t.attributes.decorationNotePlaceholder} /></label>
            <div className="catalog-entry-subheading wide">
              <strong>{t.attributes.detailPageTitle}</strong>
              <span>{t.attributes.detailPageDescription}</span>
            </div>
            <label className="admin-search wide">{t.attributes.detailHeadline}<input value={detailForm.headline} onChange={(event) => setDetailField('headline', event.target.value)} placeholder={t.attributes.detailHeadlinePlaceholder} /></label>
            <label className="admin-search wide">{t.attributes.detailBody}<textarea value={detailForm.body} onChange={(event) => setDetailField('body', event.target.value)} placeholder={t.attributes.detailBodyPlaceholder} /></label>
            <label className="admin-search wide">{t.attributes.descriptionDetail}<textarea value={detailForm.description} onChange={(event) => setDetailField('description', event.target.value)} placeholder={t.attributes.descriptionDetailPlaceholder} /></label>
            <label className="admin-search wide">{t.attributes.materialInfo}<textarea value={detailForm.materialInfo} onChange={(event) => setDetailField('materialInfo', event.target.value)} placeholder={t.attributes.materialInfoPlaceholder} /></label>
            <label className="admin-search">{t.attributes.sizeGuide}<input value={detailForm.sizeGuide} onChange={(event) => setDetailField('sizeGuide', event.target.value)} placeholder={t.attributes.sizeGuidePlaceholder} /></label>
            <label className="admin-search">{t.attributes.careGuide}<input value={detailForm.careGuide} onChange={(event) => setDetailField('careGuide', event.target.value)} placeholder={t.attributes.careGuidePlaceholder} /></label>
            <label className="admin-search wide">{t.attributes.exchangeNotice}<textarea value={detailForm.exchangeNotice} onChange={(event) => setDetailField('exchangeNotice', event.target.value)} placeholder={t.attributes.exchangeNoticePlaceholder} /></label>
            <label className="admin-search wide">{t.attributes.wholesaleNotice}<textarea value={detailForm.wholesaleNotice} onChange={(event) => setDetailField('wholesaleNotice', event.target.value)} placeholder={t.attributes.wholesaleNoticePlaceholder} /></label>
            <label className="admin-search">{t.attributes.care}<input value={detailForm.care} onChange={(event) => setDetailField('care', event.target.value)} placeholder={t.attributes.carePlaceholder} /></label>
            <label className="admin-search">{t.attributes.fit}<input value={detailForm.fit} onChange={(event) => setDetailField('fit', event.target.value)} placeholder={t.attributes.fitPlaceholder} /></label>
            <label className="admin-search">{t.attributes.decoration}<input value={detailForm.decoration} onChange={(event) => setDetailField('decoration', event.target.value)} placeholder={t.attributes.decorationPlaceholder} /></label>
          </div>
          <div className="catalog-entry-home-placement">
            <div className="catalog-entry-subheading">
              <strong>{t.attributes.placementTitle}</strong>
              <span>{t.attributes.placementDescription}</span>
            </div>
            <div>
              {['showInSnap', 'showInNewArrivals', 'showInWeeklyPick', 'showInBuyerSelection', 'showInPiercing', 'showInSteadySelection'].map((field) => <label className="admin-check" key={field}>
                <input checked={Boolean(homePlacementForm[field])} onChange={(event) => setHomePlacementField(field, event.target.checked)} type="checkbox" /> {t.attributes[field]}
              </label>)}
            </div>
            <label className="admin-search wide">{t.attributes.homeNote}<input value={homePlacementForm.homeNote} onChange={(event) => setHomePlacementField('homeNote', event.target.value)} placeholder={t.attributes.homeNotePlaceholder} /></label>
            <label className="admin-search">{t.attributes.sortPriority}<input value={homePlacementForm.sortPriority} onChange={(event) => setHomePlacementField('sortPriority', event.target.value)} type="number" />
              {fieldErrors.sortPriority && <small className="admin-field-error">{fieldErrors.sortPriority}</small>}
            </label>
          </div>
        </section>

        <section className="admin-card catalog-entry-section">
          <div className="catalog-entry-section-heading">
            <span className="catalog-entry-step-badge">4</span>
            <div>
              <p className="eyebrow">{t.sections.imageEyebrow}</p>
              <h2>{t.images.title}</h2>
              <p className="admin-muted">{t.images.description}</p>
            </div>
          </div>
          <div
            className={`catalog-entry-dropzone ${isDropActive ? 'active' : ''}`}
            onDragLeave={() => setIsDropActive(false)}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDropActive(true)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setIsDropActive(false)
              addImageFiles(event.dataTransfer.files)
            }}
          >
            <input
              accept="image/jpeg,image/png,image/webp"
              hidden
              multiple
              onChange={(event) => {
                addImageFiles(event.target.files)
                event.target.value = ''
              }}
              ref={imageInputRef}
              type="file"
            />
            <strong>{t.images.dropTitle}</strong>
            <span>{t.images.dropDescription}</span>
            <button disabled={!canEditImages || images.length >= maxImageCount} type="button" onClick={() => imageInputRef.current?.click()}>{t.images.choose}</button>
            {fieldErrors.images && <small className="admin-field-error">{fieldErrors.images}</small>}
          </div>
          <div className="catalog-entry-image-grid">
            {images.map((image, index) => <article className={`catalog-entry-image-card ${image.isPrimary ? 'primary' : ''}`} key={image.id}>
              <img alt={image.altText || productForm.nameEn || t.images.previewAlt} src={image.previewUrl} />
              <div className="catalog-entry-image-meta">
                <strong>{image.isPrimary ? t.images.primary : `${t.images.photo} ${index + 1}`}</strong>
                <span>{image.file.type} · {(image.file.size / 1024 / 1024).toFixed(2)}MB · {image.width}×{image.height}</span>
                <label className="admin-search">{t.images.altText}
                  <input value={image.altText} onChange={(event) => setImageAltText(image.id, event.target.value)} placeholder={productForm.nameEn || t.images.altPlaceholder} />
                </label>
              </div>
              <div className="admin-actions compact">
                <button disabled={!canEditImages || image.isPrimary} type="button" onClick={() => setPrimaryImage(image.id)}>{t.images.setPrimary}</button>
                <button disabled={!canEditImages || index === 0} type="button" onClick={() => moveImage(image.id, -1)}>{t.images.moveUp}</button>
                <button disabled={!canEditImages || index === images.length - 1} type="button" onClick={() => moveImage(image.id, 1)}>{t.images.moveDown}</button>
                <button disabled={!canEditImages} type="button" onClick={() => removeImage(image.id)}>{t.images.remove}</button>
              </div>
              {image.status !== 'ready' && <p className={`catalog-entry-image-status ${image.status}`}>{t.images.status[image.status] || image.status}</p>}
              {image.error && <small className="admin-field-error">{image.error}</small>}
            </article>)}
          </div>
        </section>

        <section className="admin-card catalog-entry-section">
          <div className="catalog-entry-section-heading">
            <span className="catalog-entry-step-badge">5</span>
            <div>
              <p className="eyebrow">{t.sections.priceEyebrow}</p>
              <h2>{t.price.title}</h2>
            </div>
          </div>
          <div className="catalog-entry-grid">
            <label className="admin-search">{t.price.market}<select value={priceForm.market} onChange={(event) => {
              const market = event.target.value
              setPriceForm((current) => ({ ...current, market, currency: marketCurrency[market] || 'USD' }))
            }}>
              {supportedMarkets.filter((market) => market === 'KR').map((market) => <option key={market} value={market}>{formatMarketLabel(market)}</option>)}
            </select></label>
            <label className="admin-search">{t.price.currency}<select value={priceForm.currency} onChange={(event) => setPriceField('currency', event.target.value)}>
              {supportedCurrencies.filter((currency) => currency === 'KRW').map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select></label>
            <label className="admin-search">{t.price.wholesale}<input inputMode="decimal" step={priceInputStep} value={priceForm.wholesalePrice} onChange={(event) => setPriceField('wholesalePrice', event.target.value)} placeholder="12000" />
              {fieldErrors.wholesalePrice && <small className="admin-field-error">{fieldErrors.wholesalePrice}</small>}
            </label>
            <label className="admin-search">{t.price.retail}<input inputMode="decimal" step={priceInputStep} value={priceForm.retailPrice} onChange={(event) => setPriceField('retailPrice', event.target.value)} placeholder="15000" />
              {fieldErrors.retailPrice && <small className="admin-field-error">{fieldErrors.retailPrice}</small>}
            </label>
            <label className="admin-search">{t.price.moq}<input min="1" value={priceForm.moq} onChange={(event) => setPriceField('moq', event.target.value)} type="number" />
              {fieldErrors.moq && <small className="admin-field-error">{fieldErrors.moq}</small>}
            </label>
            <label className="admin-search">{t.price.minOrderAmount}<input inputMode="decimal" step={priceInputStep} value={priceForm.minOrderAmount} onChange={(event) => setPriceField('minOrderAmount', event.target.value)} placeholder="0" />
              {fieldErrors.minOrderAmount && <small className="admin-field-error">{fieldErrors.minOrderAmount}</small>}
            </label>
            <label className="admin-check"><input checked={priceForm.isActive} onChange={(event) => setPriceField('isActive', event.target.checked)} type="checkbox" /> {t.price.active}</label>
          </div>
          <div className="catalog-entry-market-prices">
            {priceMarketOrder.map((market) => {
              const entry = marketPriceForms[market]
              const display = getMarketDisplay(market)
              const step = getCurrencyInputStep(entry.currency)
              const modeOptions = autoPriceMarkets.has(market)
                ? ['fx_auto', 'manual_fixed']
                : ['unavailable', 'manual_fixed']
              return <article className="catalog-entry-market-card" key={market}>
                <header>
                  <span><img alt={display.label} className="admin-market-flag" src={display.flagSrc} /> {formatMarketLabel(market)} / {entry.currency}</span>
                  <select aria-label={`${formatMarketLabel(market)} ${t.price.mode}`} value={entry.pricingMode} onChange={(event) => setMarketPriceField(market, 'pricingMode', event.target.value)}>
                    {modeOptions.map((modeValue) => <option key={modeValue} value={modeValue}>{t.price.modes[modeValue]}</option>)}
                  </select>
                </header>
                {fieldErrors[`${market}Mode`] && <small className="admin-field-error">{fieldErrors[`${market}Mode`]}</small>}
                {entry.pricingMode === 'fx_auto' ? <p className="admin-muted">{t.price.autoNote}</p> : entry.pricingMode === 'unavailable' ? <p className="admin-muted">{t.price.unavailableNote}</p> : <div className="catalog-entry-market-grid">
                  <label className="admin-search">{t.price.wholesale}<input inputMode="decimal" step={step} value={entry.wholesalePrice} onChange={(event) => setMarketPriceField(market, 'wholesalePrice', event.target.value)} placeholder={entry.currency === 'JPY' ? '1200' : '8.80'} />
                    {fieldErrors[`${market}WholesalePrice`] && <small className="admin-field-error">{fieldErrors[`${market}WholesalePrice`]}</small>}
                  </label>
                  <label className="admin-search">{t.price.retail}<input inputMode="decimal" step={step} value={entry.retailPrice} onChange={(event) => setMarketPriceField(market, 'retailPrice', event.target.value)} placeholder={entry.currency === 'JPY' ? '1800' : '12.00'} />
                    {fieldErrors[`${market}RetailPrice`] && <small className="admin-field-error">{fieldErrors[`${market}RetailPrice`]}</small>}
                  </label>
                  <label className="admin-search">{t.price.moq}<input min="1" type="number" value={entry.moq} onChange={(event) => setMarketPriceField(market, 'moq', event.target.value)} />
                    {fieldErrors[`${market}Moq`] && <small className="admin-field-error">{fieldErrors[`${market}Moq`]}</small>}
                  </label>
                  <label className="admin-search">{t.price.minOrderAmount}<input inputMode="decimal" step={step} value={entry.minOrderAmount} onChange={(event) => setMarketPriceField(market, 'minOrderAmount', event.target.value)} placeholder="0" />
                    {fieldErrors[`${market}MinOrderAmount`] && <small className="admin-field-error">{fieldErrors[`${market}MinOrderAmount`]}</small>}
                  </label>
                  <label className="admin-check"><input checked={entry.isActive} type="checkbox" onChange={(event) => setMarketPriceField(market, 'isActive', event.target.checked)} /> {t.price.active}</label>
                </div>}
              </article>
            })}
          </div>
        </section>
      </div>

      <aside className="admin-card catalog-entry-summary-panel">
        <div>
          <p className="eyebrow">{t.confirm.title}</p>
          <h2>{t.summaryTitle}</h2>
        </div>
        {primaryImage && <div className="catalog-entry-summary-image">
          <img alt={primaryImage.altText || productForm.nameEn || t.images.previewAlt} src={primaryImage.previewUrl} />
          <span>{t.images.primary}</span>
        </div>}
        <dl className="admin-definition-list catalog-entry-summary">
          <dt>{t.confirm.category}</dt><dd>{categorySummary}</dd>
          <dt>{t.confirm.productCode}</dt><dd>{productCode || '-'}</dd>
          <dt>{t.confirm.productName}</dt><dd>{productForm.nameEn || '-'}</dd>
          <dt>{t.confirm.visibility}</dt><dd>{productForm.isVisible ? adminCopy.common.visible : adminCopy.common.hidden}</dd>
          <dt>{t.confirm.images}</dt><dd>{uploadedImages.length || images.length}</dd>
          <dt>{t.confirm.market}</dt><dd><img alt={getMarketDisplay(priceForm.market).label} className="admin-market-flag" src={getMarketDisplay(priceForm.market).flagSrc} title={priceForm.market} /></dd>
          <dt>{t.confirm.currency}</dt><dd>{priceForm.currency}</dd>
          <dt>{t.confirm.price}</dt><dd>{parsedWholesalePrice == null ? '-' : formatDisplayAmount(parsedWholesalePrice, priceForm.currency)}</dd>
          <dt>{t.confirm.markets}</dt><dd>{priceMarketOrder.map((market) => {
            const entry = marketPriceForms[market]
            const value = entry.pricingMode === 'manual_fixed' && entry.wholesalePrice
              ? formatDisplayAmount(parsePositiveMoney(entry.wholesalePrice, entry.currency), entry.currency)
              : t.price.modes[entry.pricingMode]
            return <span className="catalog-entry-summary-market" key={market}><img alt={getMarketDisplay(market).label} className="admin-market-flag" src={getMarketDisplay(market).flagSrc} /> {value}</span>
          })}</dd>
        </dl>
        <div className="catalog-entry-status-list" aria-label={t.saveStatus.title}>
          {['category', 'product', 'images', 'price'].map((resource) => <p className={`catalog-entry-status ${saveStatus[resource]}`} key={resource}>
            <span>{t.saveStatus[resource]}</span>
            <strong>{t.saveStatus[saveStatus[resource]]}</strong>
          </p>)}
        </div>
        {message && <p className="admin-inline-message" role="status">{message}</p>}
        {!isComplete ? <div className="admin-actions catalog-entry-actions">
          <button type="button" onClick={cancel}>{t.cancel}</button>
          <button className="primary-action" disabled={saveDisabled} type="button" onClick={submitAll}>{saveButtonLabel}</button>
        </div> : <div className="admin-actions catalog-entry-actions">
          <AdminLink className="primary-action" to={`/products/${productRouteId}`}>{t.success.viewProduct}</AdminLink>
          <AdminLink to="/admin/products">{t.success.productList}</AdminLink>
          <button type="button" onClick={continueAnother}>{t.success.continueAnother}</button>
        </div>}
      </aside>
    </section>
  </>
}
