import { ImagePlus, Monitor, PackageCheck, Settings2, Smartphone, Trash2, UploadCloud, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { ProductDetailView } from '../ProductDetailPage'
import { useLocalePath } from '../../utils/locale'
import {
  AdminConfirmDialog,
  AdminLink,
  AdminNotice,
  AdminPageHeader,
  AdminSaveBar,
  AdminToast,
} from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const localeTabs = [
  { key: 'kr', label: '한국어' },
  { key: 'en', label: 'English' },
  { key: 'jp', label: '日本語' },
  { key: 'zh-TW', label: '繁體中文' },
]
const maxImages = 8
const maxImageBytes = 10 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const emptyTranslation = { name: '', summary: '', headline: '', body: '' }
const emptyPrice = { wholesalePrice: '', retailPrice: '', moq: '1', minOrderAmount: '0', isActive: true }
const emptyForm = {
  code: '',
  categoryKey: '',
  material: '',
  colorsText: '',
  sizesText: '',
  moqDefault: '1',
  leadTime: '',
  origin: 'KR',
  badge: '',
  isExportAvailable: true,
  isNew: false,
  isBest: false,
  sortOrder: '0',
  translations: Object.fromEntries(localeTabs.map(({ key }) => [key, { ...emptyTranslation }])),
  taxonomy: { productGroup: 'piercing', piercingType: '', baseMaterial: '', saleType: 'single' },
  specs: { gauge: '', length: '', unit: 'mm', specNote: '' },
  homePlacement: {
    showInNewArrivals: false,
    showInWeeklyPick: false,
    showInBuyerSelection: false,
    showInPiercing: false,
    showInSteadySelection: false,
    sortPriority: 0,
  },
  detailContentBase: {},
}

function parseList(value) {
  return String(value || '').split(/[,/\n]/).map((item) => item.trim()).filter(Boolean)
}

function toTextList(value) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function getTranslation(product, locale) {
  const nameFields = { kr: 'nameKo', en: 'nameEn', jp: 'nameJa', 'zh-TW': 'nameZhTw' }
  const descriptionFields = { kr: 'descriptionKo', en: 'descriptionEn', jp: 'descriptionJa', 'zh-TW': 'descriptionZhTw' }
  const translatedDetail = product?.detailContent?.translations?.[locale] || {}
  const legacyDetail = locale === 'kr' ? product?.detailContent || {} : {}
  return {
    name: product?.[nameFields[locale]] || '',
    summary: product?.[descriptionFields[locale]] || '',
    headline: translatedDetail.headline || legacyDetail.headline || '',
    body: translatedDetail.body || translatedDetail.description || legacyDetail.body || legacyDetail.description || '',
  }
}

function productToForm(product) {
  if (!product) return structuredClone(emptyForm)
  const { translations: _translations, ...detailContentBase } = product.detailContent || {}
  return {
    code: product.code || '',
    categoryKey: product.categoryKey || '',
    material: product.material || '',
    colorsText: toTextList(product.colors),
    sizesText: toTextList(product.sizes),
    moqDefault: String(product.moqDefault || 1),
    leadTime: product.leadTime || '',
    origin: product.origin || 'KR',
    badge: product.badge || '',
    isExportAvailable: product.isExportAvailable !== false,
    isNew: Boolean(product.isNew),
    isBest: Boolean(product.isBest),
    sortOrder: String(product.sortOrder || 0),
    translations: Object.fromEntries(localeTabs.map(({ key }) => [key, getTranslation(product, key)])),
    taxonomy: { ...emptyForm.taxonomy, ...(product.taxonomy || {}) },
    specs: { ...emptyForm.specs, ...(product.specs || {}) },
    homePlacement: { ...emptyForm.homePlacement, ...(product.homePlacement || {}) },
    detailContentBase,
  }
}

function priceToForm(price, product) {
  if (!price) return { ...emptyPrice, moq: String(product?.moqDefault || 1) }
  return {
    wholesalePrice: String(price.wholesalePrice ?? ''),
    retailPrice: String(price.retailPrice ?? ''),
    moq: String(price.moq || product?.moqDefault || 1),
    minOrderAmount: String(price.minOrderAmount ?? 0),
    isActive: price.isActive !== false,
  }
}

function getCurrentImage(product) {
  return product?.imageSet?.detail || product?.imageSet?.primary || product?.imageSet?.card || product?.imageSet?.thumb || ''
}

function buildDraftProduct({ category, form, previewImage, product }) {
  const productId = product?.productId || product?.id || 'draft-product'
  const imageSet = previewImage
    ? { thumb: previewImage, card: previewImage, detail: previewImage, zoom: previewImage }
    : product?.imageSet || {}
  return {
    ...(product || {}),
    id: productId,
    productId,
    code: form.code.trim() || 'NB-PRODUCT-CODE',
    nameKo: form.translations.kr.name,
    nameEn: form.translations.en.name,
    nameJa: form.translations.jp.name,
    nameZhTw: form.translations['zh-TW'].name,
    descriptionKo: form.translations.kr.summary,
    descriptionEn: form.translations.en.summary,
    descriptionJa: form.translations.jp.summary,
    descriptionZhTw: form.translations['zh-TW'].summary,
    categoryId: form.categoryKey,
    categoryKey: form.categoryKey,
    categoryNameKo: category?.nameKo || category?.nameEn || category?.categoryId || '',
    categoryNameEn: category?.nameEn || category?.nameKo || category?.categoryId || '',
    categoryNameJa: category?.nameJa || category?.nameEn || category?.nameKo || category?.categoryId || '',
    categoryNameZhTw: category?.nameZhTw || category?.nameEn || category?.nameKo || category?.categoryId || '',
    material: form.material,
    colors: parseList(form.colorsText),
    sizes: parseList(form.sizesText),
    moqDefault: Math.max(1, Number(form.moqDefault || 1)),
    leadTime: form.leadTime,
    origin: form.origin,
    badge: form.badge,
    isExportAvailable: Boolean(form.isExportAvailable),
    isNew: Boolean(form.isNew),
    isBest: Boolean(form.isBest),
    imageSet,
    specs: form.specs,
    taxonomy: form.taxonomy,
    detailContent: {
      ...form.detailContentBase,
      translations: Object.fromEntries(localeTabs.map(({ key }) => [key, {
        headline: form.translations[key].headline,
        body: form.translations[key].body,
      }])),
    },
  }
}

function buildProductPayload(form) {
  return {
    code: form.code.trim(),
    nameKo: form.translations.kr.name.trim() || undefined,
    nameEn: form.translations.en.name.trim() || undefined,
    nameJa: form.translations.jp.name.trim() || undefined,
    nameZhTw: form.translations['zh-TW'].name.trim() || undefined,
    descriptionKo: form.translations.kr.summary.trim() || undefined,
    descriptionEn: form.translations.en.summary.trim() || undefined,
    descriptionJa: form.translations.jp.summary.trim() || undefined,
    descriptionZhTw: form.translations['zh-TW'].summary.trim() || undefined,
    categoryKey: form.categoryKey || undefined,
    material: form.material.trim() || undefined,
    colors: parseList(form.colorsText),
    sizes: parseList(form.sizesText),
    moqDefault: Math.max(1, Number(form.moqDefault || 1)),
    leadTime: form.leadTime.trim() || undefined,
    origin: form.origin.trim() || 'KR',
    taxonomy: form.taxonomy,
    specs: form.specs,
    detailContent: {
      ...form.detailContentBase,
      translations: Object.fromEntries(localeTabs.map(({ key }) => [key, {
        headline: form.translations[key].headline.trim(),
        body: form.translations[key].body.trim(),
      }])),
    },
    homePlacement: { ...form.homePlacement, sortPriority: Number(form.homePlacement.sortPriority || 0) },
    badge: form.badge.trim() || undefined,
    isExportAvailable: Boolean(form.isExportAvailable),
    isNew: Boolean(form.isNew),
    isBest: Boolean(form.isBest),
    sortOrder: Math.max(0, Number(form.sortOrder || 0)),
  }
}

function buildImageFormData(images, translations) {
  const formData = new FormData()
  images.forEach((image) => formData.append('images', image.file, image.file.name))
  formData.append('metadata', JSON.stringify({
    primaryIndex: Math.max(0, images.findIndex((image) => image.isPrimary)),
    altTexts: images.map((image) => image.altText.trim() || translations.kr.name.trim() || translations.en.name.trim()),
    localizedAlt: Object.fromEntries(localeTabs.map(({ key }) => [key, translations[key].name.trim()]).filter(([, value]) => value)),
  }))
  return formData
}

function getReadiness(form, { hasImage, hasPrice }) {
  const missing = []
  for (const { key, label } of localeTabs) {
    if (!form.translations[key].name.trim() || !form.translations[key].summary.trim()) missing.push(`${label} 상품명과 요약`)
  }
  if (!form.categoryKey) missing.push('카테고리')
  if (!hasImage) missing.push('대표 이미지')
  if (!hasPrice) missing.push('활성 KR 가격')
  for (const field of ['headline', 'body']) {
    const anyUsed = localeTabs.some(({ key }) => form.translations[key][field].trim())
    if (!anyUsed) continue
    for (const { key, label } of localeTabs) {
      if (!form.translations[key][field].trim()) missing.push(`${label} 상세 ${field === 'headline' ? '제목' : '본문'}`)
    }
  }
  return { ready: missing.length === 0, missing }
}

export function AdminProductEditorPage() {
  const { productId } = useParams()
  const isEditing = Boolean(productId)
  const { hasPermission } = useAdminAccess()
  const canReadPrices = hasPermission('prices.read')
  const canWritePrices = hasPermission('prices.write')
  const { toLocalePath } = useLocalePath()
  const navigate = useNavigate()
  const mutate = useAdminApiMutation()
  const fileInputRef = useRef(null)
  const imageFilesRef = useRef([])
  const inlineSnapshotRef = useRef(null)
  const settingsCloseRef = useRef(null)
  const settingsDrawerRef = useRef(null)
  const settingsTriggerRef = useRef(null)
  const initialRef = useRef({ form: structuredClone(emptyForm), price: { ...emptyPrice } })
  const initializedKeyRef = useRef('')
  const [form, setForm] = useState(() => structuredClone(emptyForm))
  const [price, setPrice] = useState(emptyPrice)
  const [priceSaved, setPriceSaved] = useState(false)
  const [product, setProduct] = useState(null)
  const [activeLocale, setActiveLocale] = useState('kr')
  const [activeEditor, setActiveEditor] = useState(null)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [images, setImages] = useState([])
  const [dirty, setDirty] = useState(false)
  const [priceDirty, setPriceDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const [confirm, setConfirm] = useState(null)

  const resource = useAdminApiResource(async (api, token) => {
    const categoriesResult = await api.getCategories({ limit: 200 }, token)
    if (!productId) return { data: { categories: categoriesResult.data?.categories || [] } }
    const productResult = await api.getProduct(productId, token)
    const loadedProduct = productResult.data?.product
    if (!canReadPrices) return { data: { categories: categoriesResult.data?.categories || [], product: loadedProduct, price: null } }
    const pricesResult = await api.getPrices({ market: 'KR', q: loadedProduct?.code || '', limit: 20 }, token)
    const krPrice = (pricesResult.data?.prices || []).find((item) => item.productId === productId || item.productCode === loadedProduct?.code)
    return { data: { categories: categoriesResult.data?.categories || [], product: loadedProduct, price: krPrice || null } }
  }, [productId, canReadPrices])

  useEffect(() => {
    if (resource.status !== 'ready') return
    const key = productId || 'new'
    if (initializedKeyRef.current === key) return
    initializedKeyRef.current = key
    const nextProduct = resource.data?.product || null
    const nextForm = productToForm(nextProduct)
    const nextPrice = priceToForm(resource.data?.price, nextProduct)
    initialRef.current = { form: structuredClone(nextForm), price: { ...nextPrice } }
    setProduct(nextProduct)
    setForm(nextForm)
    setPrice(nextPrice)
    setPriceSaved(Boolean(resource.data?.price?.isActive))
    setDirty(false)
    setPriceDirty(false)
  }, [productId, resource.data, resource.status])

  useEffect(() => {
    imageFilesRef.current = images
  }, [images])

  useEffect(() => () => {
    imageFilesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [])

  useEffect(() => {
    if (!dirty) return undefined
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (activeEditor?.kind !== 'popover') return undefined
    const closeOnOutsidePointer = (event) => {
      if (event.target.closest('.admin-product-popover, .pd-editor-target-trigger')) return
      setActiveEditor(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [activeEditor])

  useEffect(() => {
    if (!settingsOpen) return undefined
    const focusTimer = window.setTimeout(() => settingsCloseRef.current?.focus(), 0)
    const handleDrawerKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSettingsOpen(false)
        window.setTimeout(() => settingsTriggerRef.current?.focus(), 0)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(settingsDrawerRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]') || [])]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleDrawerKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleDrawerKeyDown)
    }
  }, [settingsOpen])

  const apiState = shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} status={resource.status} /> : null
  const categories = resource.data?.categories || []
  const hasImage = images.length > 0 || Boolean(getCurrentImage(product))
  const hasPrice = priceDirty
    ? price.isActive && price.wholesalePrice !== '' && Number(price.wholesalePrice) >= 0
    : priceSaved
  const readiness = useMemo(() => getReadiness(form, { hasImage, hasPrice }), [form, hasImage, hasPrice])
  const previewImage = images.find((image) => image.isPrimary)?.previewUrl || images[0]?.previewUrl || getCurrentImage(product)
  const previewCategory = categories.find((item) => item.categoryId === form.categoryKey)

  if (apiState) return apiState

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setDirty(true)
  }
  const setNestedField = (group, field, value) => {
    setForm((current) => ({ ...current, [group]: { ...current[group], [field]: value } }))
    setDirty(true)
  }
  const setTranslationField = (locale, field, value) => {
    setForm((current) => ({
      ...current,
      translations: { ...current.translations, [locale]: { ...current.translations[locale], [field]: value } },
    }))
    setDirty(true)
  }
  const setPriceField = (field, value) => {
    setPrice((current) => ({ ...current, [field]: value }))
    setPriceDirty(true)
    setDirty(true)
  }

  const selectImages = (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (files.length === 0) return
    if (files.length > maxImages) {
      setToast({ message: `이미지는 최대 ${maxImages}개까지 등록할 수 있습니다.`, tone: 'error' })
      return
    }
    if (files.some((file) => !allowedImageTypes.has(file.type) || file.size > maxImageBytes)) {
      setToast({ message: 'JPG, PNG, WebP 파일을 장당 10MB 이하로 등록해 주세요.', tone: 'error' })
      return
    }
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setImages(files.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      altText: '',
      isPrimary: index === 0,
    })))
    setDirty(true)
  }

  const removeImage = (imageId) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === imageId)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = current.filter((image) => image.id !== imageId)
      if (next.length > 0 && !next.some((image) => image.isPrimary)) next[0] = { ...next[0], isPrimary: true }
      return next
    })
    setDirty(true)
  }

  const discardChanges = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setImages([])
    setForm(structuredClone(initialRef.current.form))
    setPrice({ ...initialRef.current.price })
    setActiveEditor(null)
    setSettingsOpen(false)
    inlineSnapshotRef.current = null
    setDirty(false)
    setPriceDirty(false)
    setToast({ message: '변경사항을 되돌렸습니다.', tone: 'success' })
  }

  const saveProduct = async ({ publish = false } = {}) => {
    if (!form.code.trim()) {
      setToast({ message: '상품 코드를 입력해 주세요.', tone: 'error' })
      return
    }
    if (!localeTabs.some(({ key }) => form.translations[key].name.trim())) {
      setToast({ message: '한 개 이상의 언어로 상품명을 입력해 주세요.', tone: 'error' })
      return
    }
    if (publish && !readiness.ready) {
      setToast({ message: `공개 전에 ${readiness.missing.join(', ')} 항목을 완료해 주세요.`, tone: 'error' })
      setConfirm(null)
      return
    }

    setSaving(true)
    try {
      const payload = buildProductPayload(form)
      let savedProduct = product
      if (isEditing) {
        const result = await mutate((api, token) => api.updateProduct(productId, payload, token))
        savedProduct = result.data?.product || { ...product, ...payload }
      } else {
        const result = await mutate((api, token) => api.createProduct({ ...payload, imageSet: {}, imageAlt: {}, isVisible: false }, token))
        savedProduct = result.data?.product
      }
      const savedProductId = savedProduct?.id || productId
      if (!savedProductId) throw new Error('저장된 상품 ID를 확인할 수 없습니다.')

      if (images.length > 0) {
        const imageResult = await mutate((api, token) => api.uploadProductImages(savedProductId, buildImageFormData(images, form.translations), token))
        savedProduct = imageResult.data?.product || savedProduct
      }
      if (priceDirty && price.wholesalePrice !== '') {
        await mutate((api, token) => api.setupProductPriceBooks(savedProductId, {
          kr: {
            wholesalePrice: Number(price.wholesalePrice),
            retailPrice: price.retailPrice === '' ? undefined : Number(price.retailPrice),
            moq: Math.max(1, Number(price.moq || 1)),
            minOrderAmount: Math.max(0, Number(price.minOrderAmount || 0)),
            isActive: Boolean(price.isActive),
          },
          markets: [],
        }, token))
        setPriceSaved(Boolean(price.isActive))
      }
      if (publish && !savedProduct?.isVisible) {
        const visibilityResult = await mutate((api, token) => api.updateProductVisibility(savedProductId, true, token))
        savedProduct = visibilityResult.data?.product || { ...savedProduct, isVisible: true }
      }

      images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      setImages([])
      setProduct(savedProduct)
      const nextForm = productToForm(savedProduct || { ...payload, id: savedProductId })
      initialRef.current = { form: structuredClone(nextForm), price: { ...price } }
      setForm(nextForm)
      setActiveEditor(null)
      setSettingsOpen(false)
      inlineSnapshotRef.current = null
      setDirty(false)
      setPriceDirty(false)
      setConfirm(null)
      setToast({ message: publish ? '상품을 저장하고 공개했습니다.' : '초안을 저장했습니다.', tone: 'success' })
      if (!isEditing) navigate(toLocalePath(`/admin/products/${savedProductId}/edit`), { replace: true })
    } catch (error) {
      setConfirm(null)
      setToast({ message: error?.message || '상품을 저장하지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const requestPublish = () => setConfirm({
    title: '상품을 공개할까요?',
    description: readiness.ready
      ? '저장 후 승인 회원이 상품 목록과 상세에서 확인할 수 있습니다.'
      : `아직 완료되지 않은 항목: ${readiness.missing.join(', ')}`,
    confirmLabel: '저장 후 공개',
    action: () => saveProduct({ publish: true }),
  })

  const currentTranslation = form.translations[activeLocale]
  const draftProduct = buildDraftProduct({ category: previewCategory, form, previewImage, product })
  const draftPrice = price.isActive && price.wholesalePrice !== ''
    ? {
      currency: 'KRW',
      market: 'KR',
      moq: Math.max(1, Number(price.moq || form.moqDefault || 1)),
      wholesalePrice: Number(price.wholesalePrice),
    }
    : null
  const previewContentLocale = activeLocale === 'zh-TW' ? 'cn' : activeLocale

  const beginInline = (field, value) => {
    inlineSnapshotRef.current = { field, value, wasDirty: dirty }
    setActiveEditor({ field, kind: 'inline' })
  }
  const changeInline = (field, value) => setTranslationField(activeLocale, field, value)
  const commitInline = (field) => {
    if (inlineSnapshotRef.current?.field === field) inlineSnapshotRef.current = null
    setActiveEditor((current) => current?.field === field ? null : current)
  }
  const cancelInline = (field) => {
    const snapshot = inlineSnapshotRef.current
    if (snapshot?.field === field) {
      setForm((current) => ({
        ...current,
        translations: {
          ...current.translations,
          [activeLocale]: { ...current.translations[activeLocale], [field]: snapshot.value },
        },
      }))
      setDirty(snapshot.wasDirty)
      inlineSnapshotRef.current = null
    }
    setActiveEditor(null)
  }
  const openPopover = (field, target) => {
    const rect = target.getBoundingClientRect()
    const side = rect.bottom + 380 > window.innerHeight && rect.top > 380 ? 'top' : 'bottom'
    setActiveEditor({ field, kind: 'popover', side })
  }
  const closePopover = () => setActiveEditor(null)
  const renderPopover = (field) => {
    const popover = (title, body) => <section
      aria-label={`${title} 편집`}
      className={`admin-product-popover is-${activeEditor?.side || 'bottom'}`}
      role="dialog"
    >
      <header><div><strong>{title}</strong><span>변경 내용은 초안 저장 전까지 공개되지 않습니다.</span></div><button aria-label="편집창 닫기" title="편집창 닫기" type="button" onClick={closePopover}><X size={16} /></button></header>
      <div className="admin-product-popover-body">{body}</div>
    </section>

    if (field === 'image') return popover('상품 이미지', <>
      <div className="admin-product-popover-image">
        {previewImage ? <img alt="현재 상품" src={previewImage} /> : <span><ImagePlus size={24} />등록된 이미지 없음</span>}
      </div>
      <button className="secondary-action" type="button" onClick={() => fileInputRef.current?.click()}><UploadCloud size={16} /> 이미지 선택 또는 교체</button>
      {images.length > 0 && <div className="admin-product-popover-thumbs">{images.map((image) => <article className={image.isPrimary ? 'is-primary' : ''} key={image.id}>
        <img alt="업로드 미리보기" src={image.previewUrl} />
        <label><input checked={image.isPrimary} name="visualPrimaryImage" type="radio" onChange={() => { setImages((current) => current.map((item) => ({ ...item, isPrimary: item.id === image.id }))); setDirty(true) }} /> 대표</label>
        <input aria-label="이미지 대체 문구" placeholder="대체 문구" value={image.altText} onChange={(event) => { setImages((current) => current.map((item) => item.id === image.id ? { ...item, altText: event.target.value } : item)); setDirty(true) }} />
        <button aria-label="이미지 제거" title="이미지 제거" type="button" onClick={() => removeImage(image.id)}><Trash2 size={14} /></button>
      </article>)}</div>}
      <small>JPG, PNG, WebP · 최대 8개 · 장당 10MB</small>
    </>)

    if (field === 'category') return popover('카테고리', <label className="admin-field"><span>카테고리</span><select value={form.categoryKey} onChange={(event) => setField('categoryKey', event.target.value)}><option value="">선택</option>{categories.map((item) => <option key={item.id} value={item.categoryId}>{item.nameKo || item.nameEn || item.nameZhTw || item.categoryId}</option>)}</select></label>)
    if (field === 'code') return popover('상품 코드', <label className="admin-field"><span>상품 코드 <b>*</b></span><input disabled={isEditing} maxLength="80" placeholder="NB-001" value={form.code} onChange={(event) => setField('code', event.target.value)} /><small>{isEditing ? '등록된 상품 코드는 변경할 수 없습니다.' : '저장 후에는 상품 코드를 변경할 수 없습니다.'}</small></label>)
    if (field === 'productInfo') return popover('상품 정보', <div className="admin-form-grid">
      <label className="admin-field"><span>소재</span><input value={form.material} onChange={(event) => setField('material', event.target.value)} /></label>
      <label className="admin-field"><span>원산지</span><input maxLength="20" value={form.origin} onChange={(event) => setField('origin', event.target.value)} /></label>
      <label className="admin-field admin-field-wide"><span>예상 납기</span><input placeholder="영업일 기준 7-10일" value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
      <label className="admin-switch admin-field-wide"><input checked={form.isExportAvailable} type="checkbox" onChange={(event) => setField('isExportAvailable', event.target.checked)} /><span>수출 가능</span></label>
    </div>)
    if (field === 'colors') return popover('색상 옵션', <label className="admin-field"><span>색상</span><input placeholder="골드, 실버, 오알" value={form.colorsText} onChange={(event) => setField('colorsText', event.target.value)} /><small>쉼표로 구분해 입력합니다.</small></label>)
    if (field === 'sizes') return popover('사이즈 옵션', <label className="admin-field"><span>사이즈</span><input placeholder="6mm, 8mm" value={form.sizesText} onChange={(event) => setField('sizesText', event.target.value)} /><small>쉼표로 구분해 입력합니다.</small></label>)
    if (field === 'moq') return popover('MOQ', <div className="admin-form-grid">
      <label className="admin-field"><span>상품 최소 수량</span><input min="1" type="number" value={form.moqDefault} onChange={(event) => setField('moqDefault', event.target.value)} /></label>
      <label className="admin-field"><span>가격 MOQ</span><input disabled={!canWritePrices} min="1" type="number" value={price.moq} onChange={(event) => setPriceField('moq', event.target.value)} /></label>
    </div>)
    if (field === 'price') return popover('승인 회원 가격', <>
      <div className="admin-form-grid">
        <label className="admin-field"><span>KR 도매가 (KRW)</span><input disabled={!canWritePrices} inputMode="numeric" min="0" type="number" value={price.wholesalePrice} onChange={(event) => setPriceField('wholesalePrice', event.target.value)} /></label>
        <label className="admin-field"><span>권장 소비자가</span><input disabled={!canWritePrices} inputMode="numeric" min="0" type="number" value={price.retailPrice} onChange={(event) => setPriceField('retailPrice', event.target.value)} /></label>
        <label className="admin-field"><span>최소 견적 금액</span><input disabled={!canWritePrices} inputMode="numeric" min="0" type="number" value={price.minOrderAmount} onChange={(event) => setPriceField('minOrderAmount', event.target.value)} /></label>
        <label className="admin-switch"><input checked={price.isActive} disabled={!canWritePrices} type="checkbox" onChange={(event) => setPriceField('isActive', event.target.checked)} /><span>KR 가격 활성화</span></label>
      </div>
      {!canWritePrices && <p className="admin-help-text">가격 수정 권한이 없어 읽기 전용으로 표시됩니다.</p>}
    </>)
    if (field === 'specs') return popover('상세 스펙', <div className="admin-form-grid">
      <label className="admin-field"><span>게이지</span><input placeholder="16G" value={form.specs.gauge || ''} onChange={(event) => setNestedField('specs', 'gauge', event.target.value)} /></label>
      <label className="admin-field"><span>길이</span><input value={form.specs.length || ''} onChange={(event) => setNestedField('specs', 'length', event.target.value)} /></label>
      <label className="admin-field"><span>단위</span><select value={form.specs.unit || 'mm'} onChange={(event) => setNestedField('specs', 'unit', event.target.value)}><option value="mm">mm</option><option value="cm">cm</option><option value="inch">inch</option></select></label>
      <label className="admin-field admin-field-wide"><span>스펙 메모</span><textarea rows="3" value={form.specs.specNote || ''} onChange={(event) => setNestedField('specs', 'specNote', event.target.value)} /></label>
    </div>)
    return null
  }

  const editorBridge = {
    active: activeEditor,
    beginInline,
    cancelInline,
    changeInline,
    commitInline,
    localeLabel: localeTabs.find(({ key }) => key === activeLocale)?.label || activeLocale,
    openPopover,
    renderPopover,
    values: currentTranslation,
  }

  return <>
    <AdminPageHeader
      eyebrow="상품 운영"
      title={isEditing ? getTranslation(product, 'kr').name || product?.code || '상품 수정' : '새 상품'}
      description={isEditing ? `${product?.code || ''} 상품 정보와 공개 준비 상태를 관리합니다.` : '필수 정보부터 입력하고 초안으로 저장하세요.'}
      actions={<>
        <AdminLink to="/admin/products">목록</AdminLink>
        {hasPermission('catalog.publish') && !product?.isVisible && <button className="primary-action" disabled={saving} type="button" onClick={requestPublish}><PackageCheck size={17} />검토 후 공개</button>}
      </>}
    />

    {product?.isVisible && !readiness.ready && <AdminNotice tone="warning">
      <strong>현재 공개 중인 기존 상품이지만 새 공개 기준에는 미완성입니다.</strong>
      <p>{readiness.missing.join(', ')} 항목을 보완해 주세요. 저장만으로 상품이 자동 비공개되지는 않습니다.</p>
    </AdminNotice>}

    <form className="admin-product-visual-editor" onSubmit={(event) => { event.preventDefault(); saveProduct() }}>
      <section className="admin-product-visual-toolbar" aria-label="상품 상세 편집 도구">
        <div className="admin-language-tabs" role="tablist" aria-label="상품 언어">
          {localeTabs.map(({ key, label }) => <button aria-selected={activeLocale === key} className={activeLocale === key ? 'is-active' : ''} key={key} role="tab" type="button" onClick={() => { if (activeEditor?.kind === 'inline') commitInline(activeEditor.field); else setActiveEditor(null); setActiveLocale(key) }}>{label}</button>)}
        </div>
        <div className="admin-product-visual-actions">
          <button className={`admin-product-readiness-button${readiness.ready ? ' is-ready' : ''}`} type="button" onClick={() => { if (activeEditor?.kind === 'inline') commitInline(activeEditor.field); else setActiveEditor(null); setSettingsOpen(true) }}>
            <span>공개 준비</span><strong>{readiness.ready ? '완료' : `${readiness.missing.length}개 필요`}</strong>
          </button>
          <div aria-label="미리보기 화면" className="admin-showcase-preview-modes" role="group">
            <button aria-label="데스크톱 미리보기" aria-pressed={previewMode === 'desktop'} className={previewMode === 'desktop' ? 'is-active' : undefined} title="데스크톱 미리보기" type="button" onClick={() => setPreviewMode('desktop')}><Monitor size={16} /></button>
            <button aria-label="모바일 미리보기" aria-pressed={previewMode === 'mobile'} className={previewMode === 'mobile' ? 'is-active' : undefined} title="모바일 미리보기" type="button" onClick={() => setPreviewMode('mobile')}><Smartphone size={16} /></button>
          </div>
          <button ref={settingsTriggerRef} aria-label="상품 설정 열기" className="admin-product-settings-button" title="상품 설정" type="button" onClick={() => { if (activeEditor?.kind === 'inline') commitInline(activeEditor.field); else setActiveEditor(null); setSettingsOpen(true) }}><Settings2 size={17} /></button>
        </div>
      </section>

      <section className={`admin-product-detail-canvas is-${previewMode}`} aria-label="실제 상품 상세 화면 편집 미리보기">
        <ProductDetailView
          approvedAmount={draftPrice?.wholesalePrice ?? null}
          contentLocale={previewContentLocale}
          editor={editorBridge}
          isApproved
          locale={activeLocale}
          price={draftPrice}
          product={draftProduct}
          products={[draftProduct]}
          toLocalePath={toLocalePath}
          viewerState="approved"
        />
      </section>

      {settingsOpen && <>
        <button aria-label="상품 설정 닫기" className="admin-product-settings-backdrop" type="button" onClick={() => { setSettingsOpen(false); window.setTimeout(() => settingsTriggerRef.current?.focus(), 0) }} />
        <aside aria-labelledby="admin-product-settings-title" aria-modal="true" className="admin-product-settings-drawer" ref={settingsDrawerRef} role="dialog">
          <header><div><span>PRODUCT SETTINGS</span><h2 id="admin-product-settings-title">상품 설정</h2></div><button aria-label="상품 설정 닫기" ref={settingsCloseRef} title="닫기" type="button" onClick={() => { setSettingsOpen(false); window.setTimeout(() => settingsTriggerRef.current?.focus(), 0) }}><X size={18} /></button></header>
          <div className={`admin-product-drawer-readiness${readiness.ready ? ' is-ready' : ''}`}><strong>{readiness.ready ? '공개할 수 있습니다.' : `${readiness.missing.length}개 항목을 보완해 주세요.`}</strong>{!readiness.ready && <p>{readiness.missing.join(', ')}</p>}</div>

          <section><h3>분류와 운영 정보</h3><div className="admin-form-grid">
            <label className="admin-field"><span>원산지</span><input maxLength="20" value={form.origin} onChange={(event) => setField('origin', event.target.value)} /></label>
            <label className="admin-field"><span>소재</span><input value={form.material} onChange={(event) => setField('material', event.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>예상 납기</span><input placeholder="영업일 기준 7-10일" value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
            <label className="admin-field"><span>피어싱 유형</span><input value={form.taxonomy.piercingType || ''} onChange={(event) => setNestedField('taxonomy', 'piercingType', event.target.value)} /></label>
            <label className="admin-field"><span>기본 소재 코드</span><input value={form.taxonomy.baseMaterial || ''} onChange={(event) => setNestedField('taxonomy', 'baseMaterial', event.target.value)} /></label>
            <label className="admin-field"><span>배지</span><input placeholder="NEW" value={form.badge} onChange={(event) => setField('badge', event.target.value)} /></label>
            <label className="admin-field"><span>정렬 순서</span><input min="0" type="number" value={form.sortOrder} onChange={(event) => setField('sortOrder', event.target.value)} /></label>
          </div></section>

          <section><h3>표시 상태</h3><div className="admin-checkbox-grid">
            <label className="admin-switch"><input checked={form.isExportAvailable} type="checkbox" onChange={(event) => setField('isExportAvailable', event.target.checked)} /><span>수출 가능</span></label>
            <label className="admin-switch"><input checked={form.isNew} type="checkbox" onChange={(event) => setField('isNew', event.target.checked)} /><span>신상품 표시</span></label>
            <label className="admin-switch"><input checked={form.isBest} type="checkbox" onChange={(event) => setField('isBest', event.target.checked)} /><span>추천 상품 표시</span></label>
          </div></section>

          <section><h3>상세 스펙</h3><div className="admin-form-grid">
            <label className="admin-field"><span>게이지</span><input placeholder="16G" value={form.specs.gauge || ''} onChange={(event) => setNestedField('specs', 'gauge', event.target.value)} /></label>
            <label className="admin-field"><span>길이</span><input value={form.specs.length || ''} onChange={(event) => setNestedField('specs', 'length', event.target.value)} /></label>
            <label className="admin-field"><span>단위</span><select value={form.specs.unit || 'mm'} onChange={(event) => setNestedField('specs', 'unit', event.target.value)}><option value="mm">mm</option><option value="cm">cm</option><option value="inch">inch</option></select></label>
            <label className="admin-field admin-field-wide"><span>스펙 메모</span><textarea rows="3" value={form.specs.specNote || ''} onChange={(event) => setNestedField('specs', 'specNote', event.target.value)} /></label>
          </div></section>

          <section><h3>홈 노출</h3><div className="admin-checkbox-grid">
            {[
              ['showInNewArrivals', '신상품'],
              ['showInWeeklyPick', '주간 추천'],
              ['showInBuyerSelection', '바이어 셀렉션'],
              ['showInPiercing', '피어싱'],
              ['showInSteadySelection', '스테디 셀렉션'],
            ].map(([field, label]) => <label className="admin-switch" key={field}><input checked={Boolean(form.homePlacement[field])} type="checkbox" onChange={(event) => setNestedField('homePlacement', field, event.target.checked)} /><span>{label}</span></label>)}
          </div></section>
        </aside>
      </>}

      <input accept="image/jpeg,image/png,image/webp" hidden multiple ref={fileInputRef} type="file" onChange={selectImages} />
    </form>

    <AdminSaveBar visible={dirty} saving={saving} onDiscard={discardChanges} onSave={() => saveProduct()} />
    <AdminConfirmDialog busy={saving} confirmLabel={confirm?.confirmLabel} description={confirm?.description} open={Boolean(confirm)} title={confirm?.title || ''} onCancel={() => !saving && setConfirm(null)} onConfirm={confirm?.action} />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
