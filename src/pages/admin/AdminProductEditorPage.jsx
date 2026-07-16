import { ChevronDown, FileArchive, GripVertical, ImagePlus, Monitor, PackageCheck, RotateCcw, Settings2, Smartphone, Trash2, UploadCloud, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { ProductDetailView } from '../ProductDetailPage'
import { useLocalePath } from '../../utils/locale'
import {
  extractProductImagesFromZip,
  maxProductImages,
  prepareDirectProductImages,
} from '../../utils/adminProductImageFiles'
import {
  defaultImagePosition,
  imageDraftsToPreviewSet,
  imagePresentationStyle,
  maxImageScale,
  minImageScale,
  normalizeImagePosition,
  normalizeImageScale,
  productToImageDrafts,
} from '../../utils/productImageGallery'
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
const productPreviewWidths = { desktop: 1440, mobile: 390 }
const productPreviewInsets = { desktop: 16, mobile: 0 }

function ProductPreviewCanvas({ children, mode }) {
  const viewportRef = useRef(null)
  const stageRef = useRef(null)
  const [layout, setLayout] = useState({ height: 0, offset: 0, scale: 1 })
  const logicalWidth = productPreviewWidths[mode]
  const inset = productPreviewInsets[mode]

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const stage = stageRef.current
    if (!viewport || !stage) return undefined

    const updateLayout = () => {
      const availableWidth = viewport.clientWidth
      if (availableWidth <= 0) return
      const usableWidth = Math.max(1, availableWidth - inset * 2)
      const scale = Math.min(1, usableWidth / logicalWidth)
      const height = Math.ceil(stage.scrollHeight * scale) + inset * 2
      const offset = inset + Math.max(0, Math.floor((usableWidth - logicalWidth * scale) / 2))

      setLayout((current) => (
        Math.abs(current.scale - scale) < 0.001
        && current.height === height
        && current.offset === offset
          ? current
          : { height, offset, scale }
      ))
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateLayout)
    }

    const observer = new ResizeObserver(updateLayout)
    observer.observe(viewport)
    observer.observe(stage)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLayout)
    }
  }, [inset, logicalWidth])

  return <section
    aria-label="실제 상품 상세 화면 편집 미리보기"
    className={`admin-product-detail-canvas is-${mode}`}
    data-preview-width={logicalWidth}
    ref={viewportRef}
    style={layout.height ? { height: `${layout.height}px` } : undefined}
  >
    <div
      className="admin-product-preview-stage"
      ref={stageRef}
      style={{ left: `${layout.offset}px`, top: `${inset}px`, transform: `scale(${layout.scale})`, width: `${logicalWidth}px` }}
    >
      {children}
    </div>
  </section>
}

const inspectorGroups = [
  { id: 'basic', label: '기본 정보' },
  { id: 'images', label: '이미지' },
  { id: 'trade', label: '옵션·가격' },
  { id: 'details', label: '상세 정보' },
  { id: 'operations', label: '운영 설정' },
]
const inspectorGroupByField = {
  name: 'basic',
  summary: 'basic',
  code: 'basic',
  category: 'basic',
  image: 'images',
  colors: 'trade',
  sizes: 'trade',
  moq: 'trade',
  price: 'trade',
  headline: 'details',
  body: 'details',
  productInfo: 'details',
  specs: 'details',
  readiness: 'operations',
  settings: 'operations',
}
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

function buildDraftProduct({ category, form, images, product }) {
  const productId = product?.productId || product?.id || 'draft-product'
  const imageSet = imageDraftsToPreviewSet(images)
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
  const uploads = images.filter((image) => image.kind === 'new')
  const uploadIndexById = new Map(uploads.map((image, index) => [image.id, index]))
  uploads.forEach((image) => formData.append('images', image.file, image.file.name))
  formData.append('metadata', JSON.stringify({
    items: images.map((image) => ({
      ...(image.kind === 'new' ? { uploadIndex: uploadIndexById.get(image.id) } : { existingId: image.existingId }),
      altText: image.altText.trim() || translations.kr.name.trim() || translations.en.name.trim(),
      position: normalizeImagePosition(image.position),
      scale: normalizeImageScale(image.scale),
    })),
    localizedAlt: Object.fromEntries(localeTabs.map(({ key }) => [key, translations[key].name.trim()]).filter(([, value]) => value)),
  }))
  return formData
}

function createNewImageDraft(candidate, index) {
  const id = globalThis.crypto?.randomUUID?.() || `${candidate.file.name}-${candidate.file.lastModified}-${index}`
  return {
    id,
    existingId: '',
    kind: 'new',
    file: candidate.file,
    filename: candidate.sortKey || candidate.file.name,
    previewUrl: URL.createObjectURL(candidate.file),
    thumbUrl: '',
    sources: {},
    altText: '',
    position: { ...defaultImagePosition },
    scale: minImageScale,
  }
}

function revokeDraftUrls(images) {
  images.filter((image) => image.kind === 'new').forEach((image) => URL.revokeObjectURL(image.previewUrl))
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

function InspectorGroup({ children, group, open, onOpen }) {
  const panelId = `admin-product-inspector-${group.id}`
  return <section className={`admin-product-inspector-group${open ? ' is-open' : ''}`}>
    <button aria-controls={panelId} aria-expanded={open} className="admin-product-inspector-group-trigger" type="button" onClick={onOpen}>
      <span>{group.label}</span><ChevronDown aria-hidden="true" size={17} />
    </button>
    {open && <div className="admin-product-inspector-group-body" id={panelId}>{children}</div>}
  </section>
}

function InspectorField({ activeField, children, field }) {
  return <div className={`admin-product-inspector-field${activeField === field ? ' is-active' : ''}`} data-editor-field={field}>
    {children}
  </div>
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
  const zipInputRef = useRef(null)
  const imageFilesRef = useRef([])
  const cropPointerRef = useRef(null)
  const sortPointerRef = useRef(null)
  const inlineSnapshotRef = useRef(null)
  const inspectorCloseRef = useRef(null)
  const inspectorRef = useRef(null)
  const inspectorReturnFocusRef = useRef(null)
  const settingsTriggerRef = useRef(null)
  const initialRef = useRef({ form: structuredClone(emptyForm), price: { ...emptyPrice } })
  const initializedKeyRef = useRef('')
  const [form, setForm] = useState(() => structuredClone(emptyForm))
  const [price, setPrice] = useState(emptyPrice)
  const [priceSaved, setPriceSaved] = useState(false)
  const [product, setProduct] = useState(null)
  const [activeLocale, setActiveLocale] = useState('kr')
  const [activeEditor, setActiveEditor] = useState(null)
  const [selectedField, setSelectedField] = useState(null)
  const [openInspectorGroup, setOpenInspectorGroup] = useState('basic')
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [compactInspector, setCompactInspector] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [images, setImages] = useState([])
  const [selectedImageId, setSelectedImageId] = useState('')
  const [imagesDirty, setImagesDirty] = useState(false)
  const [imageDropActive, setImageDropActive] = useState(false)
  const [imageImporting, setImageImporting] = useState(false)
  const [sortingImageId, setSortingImageId] = useState('')
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
    const nextImages = productToImageDrafts(nextProduct)
    initialRef.current = { form: structuredClone(nextForm), price: { ...nextPrice } }
    setProduct(nextProduct)
    setForm(nextForm)
    setPrice(nextPrice)
    setImages(nextImages)
    setSelectedImageId(nextImages[0]?.id || '')
    setPriceSaved(Boolean(resource.data?.price?.isActive))
    setDirty(false)
    setImagesDirty(false)
    setPriceDirty(false)
  }, [productId, resource.data, resource.status])

  useEffect(() => {
    imageFilesRef.current = images
  }, [images])

  useEffect(() => () => {
    revokeDraftUrls(imageFilesRef.current)
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
    const media = window.matchMedia('(max-width: 1279px)')
    const sync = () => {
      setCompactInspector(media.matches)
      if (!media.matches) setInspectorOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!selectedField || (compactInspector && !inspectorOpen)) return undefined
    const frame = window.requestAnimationFrame(() => {
      inspectorRef.current?.querySelector(`[data-editor-field="${selectedField}"]`)?.scrollIntoView({ block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [compactInspector, inspectorOpen, openInspectorGroup, selectedField])

  useEffect(() => {
    if (!compactInspector || !inspectorOpen) return undefined
    const focusTimer = window.setTimeout(() => inspectorCloseRef.current?.focus(), 0)
    const handleInspectorKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setInspectorOpen(false)
        window.setTimeout(() => inspectorReturnFocusRef.current?.focus(), 0)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(inspectorRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]') || [])]
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
    document.addEventListener('keydown', handleInspectorKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleInspectorKeyDown)
    }
  }, [compactInspector, inspectorOpen])

  const apiState = shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} status={resource.status} /> : null
  const categories = resource.data?.categories || []
  const hasImage = images.length > 0
  const hasPrice = priceDirty
    ? price.isActive && price.wholesalePrice !== '' && Number(price.wholesalePrice) >= 0
    : priceSaved
  const readiness = useMemo(() => getReadiness(form, { hasImage, hasPrice }), [form, hasImage, hasPrice])
  const previewCategory = categories.find((item) => item.categoryId === form.categoryKey)
  const selectedImage = images.find((image) => image.id === selectedImageId) || images[0] || null

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

  const markImagesDirty = () => {
    setImagesDirty(true)
    setDirty(true)
  }

  const appendImageCandidates = (candidates) => {
    if (images.length + candidates.length > maxProductImages) {
      setToast({ message: `이미지는 최대 ${maxProductImages}장입니다. 현재 ${images.length}장이라 ${Math.max(0, maxProductImages - images.length)}장만 더 추가할 수 있습니다.`, tone: 'error' })
      return
    }
    const existingFingerprints = new Set(images.filter((image) => image.kind === 'new').map((image) => `${image.filename}:${image.file?.size || 0}`))
    const incomingFingerprints = new Set()
    for (const candidate of candidates) {
      const fingerprint = `${candidate.sortKey || candidate.file.name}:${candidate.file.size}`
      if (existingFingerprints.has(fingerprint) || incomingFingerprints.has(fingerprint)) {
        setToast({ message: `${candidate.sortKey || candidate.file.name}: 같은 이미지가 이미 선택되어 있습니다.`, tone: 'error' })
        return
      }
      incomingFingerprints.add(fingerprint)
    }
    const nextImages = candidates.map(createNewImageDraft)
    setImages((current) => [...current, ...nextImages])
    setSelectedImageId((current) => current || nextImages[0]?.id || '')
    markImagesDirty()
  }

  const importDirectImages = async (files) => {
    if (!files?.length) return
    setImageImporting(true)
    try {
      appendImageCandidates(await prepareDirectProductImages(files))
    } catch (error) {
      setToast({ message: error?.message || '이미지를 불러오지 못했습니다.', tone: 'error' })
    } finally {
      setImageImporting(false)
    }
  }

  const importZip = async (file) => {
    if (!file) return
    setImageImporting(true)
    try {
      appendImageCandidates(await extractProductImagesFromZip(file))
    } catch (error) {
      setToast({ message: error?.message || 'ZIP 파일을 불러오지 못했습니다.', tone: 'error' })
    } finally {
      setImageImporting(false)
    }
  }

  const selectImages = (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    void importDirectImages(files)
  }

  const selectZip = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    void importZip(file)
  }

  const dropImages = (event) => {
    event.preventDefault()
    setImageDropActive(false)
    const files = [...(event.dataTransfer?.files || [])]
    if (files.length === 1 && (files[0].type === 'application/zip' || files[0].name.toLowerCase().endsWith('.zip'))) {
      void importZip(files[0])
      return
    }
    if (files.some((file) => file.name.toLowerCase().endsWith('.zip'))) {
      setToast({ message: 'ZIP 파일과 일반 이미지는 한 번에 함께 넣을 수 없습니다.', tone: 'error' })
      return
    }
    void importDirectImages(files)
  }

  const removeImage = (imageId) => {
    if (product?.isVisible && images.length === 1) {
      setToast({ message: '공개 중인 상품은 이미지 한 장을 유지해야 합니다. 먼저 상품을 비공개로 전환해 주세요.', tone: 'error' })
      return
    }
    setImages((current) => {
      const removed = current.find((image) => image.id === imageId)
      if (removed?.kind === 'new') URL.revokeObjectURL(removed.previewUrl)
      return current.filter((image) => image.id !== imageId)
    })
    setSelectedImageId((current) => current === imageId ? images.find((image) => image.id !== imageId)?.id || '' : current)
    markImagesDirty()
  }

  const updateImage = (imageId, changes) => {
    setImages((current) => current.map((image) => image.id === imageId ? { ...image, ...changes } : image))
    markImagesDirty()
  }

  const moveImage = (imageId, targetIndex) => {
    setImages((current) => {
      const sourceIndex = current.findIndex((image) => image.id === imageId)
      if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= current.length || sourceIndex === targetIndex) return current
      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    markImagesDirty()
  }

  const moveImageToTarget = (imageId, targetId) => {
    setImages((current) => {
      const sourceIndex = current.findIndex((image) => image.id === imageId)
      const targetIndex = current.findIndex((image) => image.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current
      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    markImagesDirty()
  }

  const beginImageSort = (event, imageId) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    sortPointerRef.current = { imageId, pointerId: event.pointerId }
    setSortingImageId(imageId)
  }

  const continueImageSort = (event) => {
    const activeSort = sortPointerRef.current
    if (!activeSort || activeSort.pointerId !== event.pointerId) return
    const targetRow = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-image-sort-id]')
    const targetId = targetRow?.dataset?.imageSortId
    if (targetId && targetId !== activeSort.imageId) moveImageToTarget(activeSort.imageId, targetId)
  }

  const endImageSort = (event) => {
    if (sortPointerRef.current?.pointerId !== event.pointerId) return
    sortPointerRef.current = null
    setSortingImageId('')
  }

  const handleImageSortKey = (event, imageId, index) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const targetIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? images.length - 1
        : index + (event.key === 'ArrowUp' ? -1 : 1)
    moveImage(imageId, targetIndex)
  }

  const beginCropMove = (event) => {
    if (!selectedImage) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    cropPointerRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      position: normalizeImagePosition(selectedImage.position),
      rect: event.currentTarget.getBoundingClientRect(),
    }
  }

  const continueCropMove = (event) => {
    const drag = cropPointerRef.current
    if (!drag || drag.pointerId !== event.pointerId || !selectedImage) return
    const deltaX = ((event.clientX - drag.clientX) / Math.max(1, drag.rect.width)) * 100
    const deltaY = ((event.clientY - drag.clientY) / Math.max(1, drag.rect.height)) * 100
    updateImage(selectedImage.id, {
      position: normalizeImagePosition({ x: drag.position.x - deltaX, y: drag.position.y - deltaY }),
    })
  }

  const endCropMove = (event) => {
    if (cropPointerRef.current?.pointerId !== event.pointerId) return
    cropPointerRef.current = null
  }

  const handleCropKey = (event) => {
    if (!selectedImage || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const position = normalizeImagePosition(selectedImage.position)
    updateImage(selectedImage.id, {
      position: normalizeImagePosition({
        x: position.x + (event.key === 'ArrowLeft' ? -2 : event.key === 'ArrowRight' ? 2 : 0),
        y: position.y + (event.key === 'ArrowUp' ? -2 : event.key === 'ArrowDown' ? 2 : 0),
      }),
    })
  }

  const discardChanges = () => {
    revokeDraftUrls(images)
    const restoredImages = productToImageDrafts(product)
    setImages(restoredImages)
    setSelectedImageId(restoredImages[0]?.id || '')
    setForm(structuredClone(initialRef.current.form))
    setPrice({ ...initialRef.current.price })
    setActiveEditor(null)
    setSelectedField(null)
    setOpenInspectorGroup('basic')
    setInspectorOpen(false)
    inlineSnapshotRef.current = null
    setDirty(false)
    setImagesDirty(false)
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

      if (imagesDirty) {
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

      revokeDraftUrls(images)
      const nextImages = productToImageDrafts(savedProduct)
      setImages(nextImages)
      setSelectedImageId(nextImages[0]?.id || '')
      setProduct(savedProduct)
      const nextForm = productToForm(savedProduct || { ...payload, id: savedProductId })
      initialRef.current = { form: structuredClone(nextForm), price: { ...price } }
      setForm(nextForm)
      setActiveEditor(null)
      setSelectedField(null)
      setOpenInspectorGroup('basic')
      setInspectorOpen(false)
      inlineSnapshotRef.current = null
      setDirty(false)
      setImagesDirty(false)
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
  const draftProduct = buildDraftProduct({ category: previewCategory, form, images, product })
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
    setSelectedField(field)
    setOpenInspectorGroup(inspectorGroupByField[field] || 'basic')
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
  const selectEditorField = (field, trigger = null, { openPanel = true } = {}) => {
    setSelectedField(field)
    setOpenInspectorGroup(inspectorGroupByField[field] || 'basic')
    if (trigger) inspectorReturnFocusRef.current = trigger
    if (compactInspector && openPanel) setInspectorOpen(true)
  }
  const closeInspector = () => {
    setInspectorOpen(false)
    window.setTimeout(() => inspectorReturnFocusRef.current?.focus(), 0)
  }

  const editorBridge = {
    active: activeEditor,
    beginInline,
    cancelInline,
    changeInline,
    commitInline,
    localeLabel: localeTabs.find(({ key }) => key === activeLocale)?.label || activeLocale,
    selectedImageId,
    selectedField,
    selectImage: (imageId) => {
      setSelectedImageId(imageId)
      selectEditorField('image')
    },
    selectField: selectEditorField,
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
          <button aria-controls="admin-product-inspector" className={`admin-product-readiness-button${readiness.ready ? ' is-ready' : ''}`} type="button" onClick={(event) => { if (activeEditor?.kind === 'inline') commitInline(activeEditor.field); else setActiveEditor(null); selectEditorField('readiness', event.currentTarget) }}>
            <span>공개 준비</span><strong>{readiness.ready ? '완료' : `${readiness.missing.length}개 필요`}</strong>
          </button>
          <div aria-label="미리보기 화면" className="admin-showcase-preview-modes" role="group">
            <button aria-label="데스크톱 미리보기" aria-pressed={previewMode === 'desktop'} className={previewMode === 'desktop' ? 'is-active' : undefined} title="데스크톱 미리보기" type="button" onClick={() => setPreviewMode('desktop')}><Monitor size={16} /></button>
            <button aria-label="모바일 미리보기" aria-pressed={previewMode === 'mobile'} className={previewMode === 'mobile' ? 'is-active' : undefined} title="모바일 미리보기" type="button" onClick={() => setPreviewMode('mobile')}><Smartphone size={16} /></button>
          </div>
          <button ref={settingsTriggerRef} aria-controls="admin-product-inspector" aria-label="운영 설정 열기" className="admin-product-settings-button" title="운영 설정" type="button" onClick={(event) => { if (activeEditor?.kind === 'inline') commitInline(activeEditor.field); else setActiveEditor(null); selectEditorField('settings', event.currentTarget) }}><Settings2 size={17} /></button>
        </div>
      </section>

      <div className="admin-product-editor-workspace">
        {compactInspector && inspectorOpen && <button aria-label="편집 패널 닫기" className="admin-product-inspector-backdrop" type="button" onClick={closeInspector} />}
        <aside
          aria-hidden={compactInspector && !inspectorOpen}
          aria-labelledby="admin-product-inspector-title"
          aria-modal={compactInspector ? true : undefined}
          className={`admin-product-inspector${inspectorOpen ? ' is-open' : ''}`}
          id="admin-product-inspector"
          inert={compactInspector && !inspectorOpen}
          ref={inspectorRef}
          role={compactInspector ? 'dialog' : 'complementary'}
        >
          <header className="admin-product-inspector-header">
            <div><span>{localeTabs.find(({ key }) => key === activeLocale)?.label}</span><h2 id="admin-product-inspector-title">상품 편집</h2></div>
            <div className="admin-product-inspector-header-actions">
              {dirty && <strong>변경 있음</strong>}
              {compactInspector && <button aria-label="편집 패널 닫기" ref={inspectorCloseRef} title="닫기" type="button" onClick={closeInspector}><X size={18} /></button>}
            </div>
          </header>

          <InspectorField activeField={selectedField} field="readiness">
            <div className={`admin-product-inspector-readiness${readiness.ready ? ' is-ready' : ''}`}>
              <span>공개 준비</span>
              <strong>{readiness.ready ? '공개할 수 있습니다.' : `${readiness.missing.length}개 항목이 필요합니다.`}</strong>
              {!readiness.ready && <p>{readiness.missing.join(', ')}</p>}
            </div>
          </InspectorField>

          <div className="admin-product-inspector-groups">
            <InspectorGroup group={inspectorGroups[0]} open={openInspectorGroup === 'basic'} onOpen={() => setOpenInspectorGroup('basic')}>
              <InspectorField activeField={selectedField} field="name">
                <label className="admin-field"><span>{editorBridge.localeLabel} 상품명 <b>*</b></span><input maxLength="240" value={currentTranslation.name} onChange={(event) => setTranslationField(activeLocale, 'name', event.target.value)} /></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="summary">
                <label className="admin-field"><span>{editorBridge.localeLabel} 한 줄 요약 <b>*</b></span><textarea maxLength="4000" rows="3" value={currentTranslation.summary} onChange={(event) => setTranslationField(activeLocale, 'summary', event.target.value)} /></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="code">
                <label className="admin-field"><span>상품 코드 <b>*</b></span><input disabled={isEditing} maxLength="80" placeholder="NB-001" value={form.code} onChange={(event) => setField('code', event.target.value)} /><small>{isEditing ? '등록된 상품 코드는 변경할 수 없습니다.' : '저장 후에는 상품 코드를 변경할 수 없습니다.'}</small></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="category">
                <label className="admin-field"><span>카테고리</span><select value={form.categoryKey} onChange={(event) => setField('categoryKey', event.target.value)}><option value="">선택</option>{categories.map((item) => <option key={item.id} value={item.categoryId}>{item.nameKo || item.nameEn || item.nameZhTw || item.categoryId}</option>)}</select></label>
              </InspectorField>
            </InspectorGroup>

            <InspectorGroup group={inspectorGroups[1]} open={openInspectorGroup === 'images'} onOpen={() => setOpenInspectorGroup('images')}>
              <InspectorField activeField={selectedField} field="image">
                <div
                  className={`admin-product-image-dropzone${imageDropActive ? ' is-active' : ''}`}
                  onDragEnter={(event) => { event.preventDefault(); setImageDropActive(true) }}
                  onDragLeave={() => setImageDropActive(false)}
                  onDragOver={(event) => { event.preventDefault(); setImageDropActive(true) }}
                  onDrop={dropImages}
                >
                  <ImagePlus aria-hidden="true" size={25} />
                  <strong>{imageImporting ? '사진을 불러오는 중입니다' : '사진을 여기에 놓으세요'}</strong>
                  <span>기존 사진 뒤에 파일명 순서대로 추가합니다.</span>
                  <div className="admin-product-image-import-actions">
                    <button disabled={imageImporting || images.length >= maxProductImages} type="button" onClick={() => fileInputRef.current?.click()}><UploadCloud size={16} /> 사진 여러 장</button>
                    <button disabled={imageImporting || images.length >= maxProductImages} type="button" onClick={() => zipInputRef.current?.click()}><FileArchive size={16} /> ZIP 불러오기</button>
                  </div>
                </div>
                {selectedImage && <section className="admin-product-image-crop" aria-label="선택한 사진 맞춤">
                  <header><div><strong>사진 맞춤</strong><span>{images.findIndex((image) => image.id === selectedImage.id) + 1}번 사진</span></div><button aria-label="사진 맞춤 초기화" title="가운데로 초기화" type="button" onClick={() => updateImage(selectedImage.id, { position: { ...defaultImagePosition }, scale: minImageScale })}><RotateCcw size={15} /></button></header>
                  <div
                    aria-label="사진 초점 위치. 끌거나 화살표 키로 조정"
                    className="admin-product-image-crop-frame"
                    onKeyDown={handleCropKey}
                    onPointerCancel={endCropMove}
                    onPointerDown={beginCropMove}
                    onPointerMove={continueCropMove}
                    onPointerUp={endCropMove}
                    role="group"
                    tabIndex={0}
                  >
                    <img alt="맞춤 미리보기" draggable={false} src={selectedImage.previewUrl} style={imagePresentationStyle(selectedImage)} />
                    <span>사진을 끌어 위치를 맞추세요</span>
                  </div>
                  <label className="admin-product-image-scale"><span>확대 <b>{normalizeImageScale(selectedImage.scale).toFixed(1)}x</b></span><input aria-label="사진 확대" max={maxImageScale} min={minImageScale} step="0.1" type="range" value={normalizeImageScale(selectedImage.scale)} onChange={(event) => updateImage(selectedImage.id, { scale: Number(event.target.value) })} /></label>
                  <label className="admin-field"><span>이미지 대체 문구</span><input maxLength="200" placeholder="상품을 설명하는 짧은 문구" value={selectedImage.altText} onChange={(event) => updateImage(selectedImage.id, { altText: event.target.value })} /></label>
                </section>}
                {images.length > 0 && <div className="admin-product-image-sortable" aria-label="상품 이미지 순서">
                  {images.map((image, index) => <article
                    className={`${index === 0 ? 'is-primary ' : ''}${selectedImage?.id === image.id ? 'is-selected ' : ''}${sortingImageId === image.id ? 'is-sorting' : ''}`.trim()}
                    data-image-sort-id={image.id}
                    key={image.id}
                  >
                    <button
                      aria-label={`${index + 1}번 사진 순서 변경. 위아래 화살표 키로 이동`}
                      className="admin-product-image-drag-handle"
                      title="끌어서 순서 변경"
                      type="button"
                      onKeyDown={(event) => handleImageSortKey(event, image.id, index)}
                      onPointerCancel={endImageSort}
                      onPointerDown={(event) => beginImageSort(event, image.id)}
                      onPointerMove={continueImageSort}
                      onPointerUp={endImageSort}
                    ><GripVertical size={17} /></button>
                    <button className="admin-product-image-thumb" type="button" onClick={() => setSelectedImageId(image.id)}><img alt="" src={image.thumbUrl || image.previewUrl} style={imagePresentationStyle(image)} /><span>{index + 1}</span></button>
                    <button className="admin-product-image-name" type="button" onClick={() => setSelectedImageId(image.id)}><strong>{index === 0 ? '대표 이미지' : `${index + 1}번 이미지`}</strong><span title={image.filename}>{image.filename}</span></button>
                    <button aria-label={`${index + 1}번 이미지 제거`} className="admin-product-image-remove" title="이미지 제거" type="button" onClick={() => removeImage(image.id)}><Trash2 size={15} /></button>
                  </article>)}
                </div>}
                <small>JPG, PNG, WebP · 최대 8장 · 장당 10MB · ZIP 해제 후 최대 80MB</small>
              </InspectorField>
            </InspectorGroup>

            <InspectorGroup group={inspectorGroups[2]} open={openInspectorGroup === 'trade'} onOpen={() => setOpenInspectorGroup('trade')}>
              <InspectorField activeField={selectedField} field="colors">
                <label className="admin-field"><span>색상</span><input placeholder="골드, 실버, 오알" value={form.colorsText} onChange={(event) => setField('colorsText', event.target.value)} /><small>쉼표로 구분해 입력합니다.</small></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="sizes">
                <label className="admin-field"><span>사이즈</span><input placeholder="6mm, 8mm" value={form.sizesText} onChange={(event) => setField('sizesText', event.target.value)} /><small>쉼표로 구분해 입력합니다.</small></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="moq">
                <div className="admin-form-grid">
                  <label className="admin-field"><span>상품 최소 수량</span><input min="1" type="number" value={form.moqDefault} onChange={(event) => setField('moqDefault', event.target.value)} /></label>
                  <label className="admin-field"><span>가격 MOQ</span><input disabled={!canWritePrices} min="1" type="number" value={price.moq} onChange={(event) => setPriceField('moq', event.target.value)} /></label>
                </div>
              </InspectorField>
              <InspectorField activeField={selectedField} field="price">
                <div className="admin-form-grid">
                  <label className="admin-field"><span>KR 도매가 (KRW)</span><input disabled={!canWritePrices} inputMode="numeric" min="0" type="number" value={price.wholesalePrice} onChange={(event) => setPriceField('wholesalePrice', event.target.value)} /></label>
                  <label className="admin-field"><span>권장 소비자가</span><input disabled={!canWritePrices} inputMode="numeric" min="0" type="number" value={price.retailPrice} onChange={(event) => setPriceField('retailPrice', event.target.value)} /></label>
                  <label className="admin-field"><span>최소 견적 금액</span><input disabled={!canWritePrices} inputMode="numeric" min="0" type="number" value={price.minOrderAmount} onChange={(event) => setPriceField('minOrderAmount', event.target.value)} /></label>
                  <label className="admin-switch"><input checked={price.isActive} disabled={!canWritePrices} type="checkbox" onChange={(event) => setPriceField('isActive', event.target.checked)} /><span>KR 가격 활성화</span></label>
                </div>
                {!canWritePrices && <p className="admin-help-text">가격 수정 권한이 없어 읽기 전용으로 표시됩니다.</p>}
              </InspectorField>
            </InspectorGroup>

            <InspectorGroup group={inspectorGroups[3]} open={openInspectorGroup === 'details'} onOpen={() => setOpenInspectorGroup('details')}>
              <InspectorField activeField={selectedField} field="headline">
                <label className="admin-field"><span>{editorBridge.localeLabel} 상세 제목</span><input maxLength="240" value={currentTranslation.headline} onChange={(event) => setTranslationField(activeLocale, 'headline', event.target.value)} /></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="body">
                <label className="admin-field"><span>{editorBridge.localeLabel} 상세 본문</span><textarea maxLength="4000" rows="6" value={currentTranslation.body} onChange={(event) => setTranslationField(activeLocale, 'body', event.target.value)} /></label>
              </InspectorField>
              <InspectorField activeField={selectedField} field="productInfo">
                <div className="admin-form-grid">
                  <label className="admin-field"><span>소재</span><input value={form.material} onChange={(event) => setField('material', event.target.value)} /></label>
                  <label className="admin-field"><span>원산지</span><input maxLength="20" value={form.origin} onChange={(event) => setField('origin', event.target.value)} /></label>
                  <label className="admin-field"><span>예상 납기</span><input placeholder="영업일 기준 7-10일" value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
                </div>
              </InspectorField>
              <InspectorField activeField={selectedField} field="specs">
                <div className="admin-form-grid">
                  <label className="admin-field"><span>게이지</span><input placeholder="16G" value={form.specs.gauge || ''} onChange={(event) => setNestedField('specs', 'gauge', event.target.value)} /></label>
                  <label className="admin-field"><span>길이</span><input value={form.specs.length || ''} onChange={(event) => setNestedField('specs', 'length', event.target.value)} /></label>
                  <label className="admin-field"><span>단위</span><select value={form.specs.unit || 'mm'} onChange={(event) => setNestedField('specs', 'unit', event.target.value)}><option value="mm">mm</option><option value="cm">cm</option><option value="inch">inch</option></select></label>
                  <label className="admin-field"><span>스펙 메모</span><textarea rows="3" value={form.specs.specNote || ''} onChange={(event) => setNestedField('specs', 'specNote', event.target.value)} /></label>
                </div>
              </InspectorField>
            </InspectorGroup>

            <InspectorGroup group={inspectorGroups[4]} open={openInspectorGroup === 'operations'} onOpen={() => setOpenInspectorGroup('operations')}>
              <InspectorField activeField={selectedField} field="settings">
                <div className="admin-form-grid">
                  <label className="admin-field"><span>피어싱 유형</span><input value={form.taxonomy.piercingType || ''} onChange={(event) => setNestedField('taxonomy', 'piercingType', event.target.value)} /></label>
                  <label className="admin-field"><span>기본 소재 코드</span><input value={form.taxonomy.baseMaterial || ''} onChange={(event) => setNestedField('taxonomy', 'baseMaterial', event.target.value)} /></label>
                  <label className="admin-field"><span>배지</span><input placeholder="NEW" value={form.badge} onChange={(event) => setField('badge', event.target.value)} /></label>
                  <label className="admin-field"><span>정렬 순서</span><input min="0" type="number" value={form.sortOrder} onChange={(event) => setField('sortOrder', event.target.value)} /></label>
                </div>
                <div className="admin-checkbox-grid admin-product-inspector-switches">
                  <label className="admin-switch"><input checked={form.isExportAvailable} type="checkbox" onChange={(event) => setField('isExportAvailable', event.target.checked)} /><span>수출 가능</span></label>
                  <label className="admin-switch"><input checked={form.isNew} type="checkbox" onChange={(event) => setField('isNew', event.target.checked)} /><span>신상품 표시</span></label>
                  <label className="admin-switch"><input checked={form.isBest} type="checkbox" onChange={(event) => setField('isBest', event.target.checked)} /><span>추천 상품 표시</span></label>
                </div>
                <div className="admin-product-inspector-home-placement">
                  <strong>홈 노출</strong>
                  <div className="admin-checkbox-grid">
                    {[
                      ['showInNewArrivals', '신상품'],
                      ['showInWeeklyPick', '주간 추천'],
                      ['showInBuyerSelection', '바이어 셀렉션'],
                      ['showInPiercing', '피어싱'],
                      ['showInSteadySelection', '스테디 셀렉션'],
                    ].map(([field, label]) => <label className="admin-switch" key={field}><input checked={Boolean(form.homePlacement[field])} type="checkbox" onChange={(event) => setNestedField('homePlacement', field, event.target.checked)} /><span>{label}</span></label>)}
                  </div>
                </div>
              </InspectorField>
            </InspectorGroup>
          </div>
        </aside>

        <ProductPreviewCanvas mode={previewMode}>
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
        </ProductPreviewCanvas>
      </div>

      <input accept="image/jpeg,image/png,image/webp" hidden multiple ref={fileInputRef} type="file" onChange={selectImages} />
      <input accept=".zip,application/zip" hidden ref={zipInputRef} type="file" onChange={selectZip} />
    </form>

    <AdminSaveBar visible={dirty} saving={saving} onDiscard={discardChanges} onSave={() => saveProduct()} />
    <AdminConfirmDialog busy={saving} confirmLabel={confirm?.confirmLabel} description={confirm?.description} open={Boolean(confirm)} title={confirm?.title || ''} onCancel={() => !saving && setConfirm(null)} onConfirm={confirm?.action} />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
