import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  LockKeyhole,
  Minus,
  PackageCheck,
  Plus,
  Ruler,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { formatMoney } from '../utils/commerce'
import {
  getLocalizedProductAlt,
  getLocalizedProductDescription,
  getLocalizedProductName,
  useLocalePath,
} from '../utils/locale'

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const detailCopy = {
  kr: {
    addToInquiry: '견적 리스트에 담기',
    adminPriceBooks: '관리자 가격표',
    approvalRequired: '승인 후 가격 확인 가능',
    available: '가능',
    back: '상품 목록으로',
    buyerOnly: '승인된 거래처만 가격과 MOQ를 확인할 수 있습니다.',
    category: '카테고리',
    categoryProducts: '같은 분류의 상품',
    categoryView: '카테고리 보기',
    color: '색상',
    colors: '색상',
    description: '상품 설명',
    emptyRelated: '같은 분류에 표시할 상품이 아직 없습니다.',
    exportAvailability: '수출 가능 여부',
    gallery: '상품 이미지',
    guide: '안내',
    leadTime: '리드타임',
    material: '소재',
    materialGuide: '소재 안내',
    materialGuideText: (material) => `${material} 기준으로 등록된 상품입니다. 도금, 마감, 라벨 기준은 견적 확인 단계에서 담당자와 다시 확인해 주세요.`,
    moq: 'MOQ',
    moqAfterReview: '승인 후 안내',
    noImage: '등록된 상품 이미지가 없습니다.',
    notFound: '상품을 찾을 수 없습니다.',
    origin: '원산지',
    priceUnavailable: '등록된 승인 가격이 없습니다.',
    productCode: '상품 코드',
    productInfo: '상품 정보',
    quantity: '수량',
    quantityNote: (moq) => `수량은 MOQ 단위로 조정됩니다. 기준 단위: ${moq} pcs`,
    quoteNotice: '견적 안내',
    quoteNoticeText: '견적 요청은 최종 거래 확정이 아닙니다. Noblesse가 재고, 납기, 공급 조건을 확인한 뒤 최종 견적 기준을 안내합니다.',
    requestAccess: '거래처 승인 요청',
    reviewStatus: '승인 상태 보기',
    selectedImage: '선택된 이미지',
    shippingNotice: '출고 및 교환 안내',
    shippingNoticeText: '출고 일정, 포장, 교환 가능 여부는 견적 검토 이후 상품 상태와 거래 조건에 따라 별도 안내됩니다.',
    size: '사이즈',
    sizeGuide: '사이즈 가이드',
    sizeGuideText: '피어싱 사이즈와 착용감은 디자인과 측정 방식에 따라 달라질 수 있습니다. 견적 요청 전 상세 규격을 확인해 주세요.',
    sizes: '사이즈',
    specification: '상세 사양',
    statusGuest: '회원가입 후 거래처 승인을 요청하면 가격과 견적 기능을 사용할 수 있습니다.',
    statusPending: '거래처 정보 확인 중입니다. 승인 후 가격과 견적 리스트 기능이 열립니다.',
    thumbnail: '썸네일',
    unavailable: '불가',
    viewLarge: '큰 이미지 보기',
    wholesale: '도매 기준',
  },
  en: {
    addToInquiry: 'Add to Inquiry List',
    adminPriceBooks: 'Admin price books',
    approvalRequired: 'Price available after approval',
    available: 'Available',
    back: 'Back to products',
    buyerOnly: 'Only approved buyers can view price and MOQ.',
    category: 'Category',
    categoryProducts: 'More in this category',
    categoryView: 'View category',
    color: 'Color',
    colors: 'Colors',
    description: 'Product information',
    emptyRelated: 'More products from this category will appear here.',
    exportAvailability: 'Export availability',
    gallery: 'Product images',
    guide: 'Guide',
    leadTime: 'Lead time',
    material: 'Material',
    materialGuide: 'Material guide',
    materialGuideText: (material) => `This product is registered with ${material}. Finish, plating, and destination labeling requirements should be confirmed during quote review.`,
    moq: 'MOQ',
    moqAfterReview: 'Shared after approval',
    noImage: 'No product image is registered.',
    notFound: 'Product not found.',
    origin: 'Origin',
    priceUnavailable: 'Approved buyer price is not registered.',
    productCode: 'Product code',
    productInfo: 'Product info',
    quantity: 'Quantity',
    quantityNote: (moq) => `Quantity is adjusted by MOQ units. Unit: ${moq} pcs`,
    quoteNotice: 'Quote notice',
    quoteNoticeText: 'A Request Quote is not a final trade confirmation. Noblesse reviews stock, lead time, and trade terms before sending the final quote basis.',
    requestAccess: 'Request buyer access',
    reviewStatus: 'View approval status',
    selectedImage: 'Selected image',
    shippingNotice: 'Shipping and exchange notice',
    shippingNoticeText: 'Dispatch schedule, packaging, and exchange availability are guided after quote review based on product status and trade terms.',
    size: 'Size',
    sizeGuide: 'Size guide',
    sizeGuideText: 'Piercing size and fit can vary by design and measurement method. Please check the registered specification before requesting a quote.',
    sizes: 'Sizes',
    specification: 'Specification',
    statusGuest: 'Request buyer approval after registration to use prices and quote tools.',
    statusPending: 'Your buyer profile is under review. Price and Inquiry List tools open after approval.',
    thumbnail: 'thumbnail',
    unavailable: 'Unavailable',
    viewLarge: 'View large image',
    wholesale: 'Wholesale basis',
  },
  jp: {
    addToInquiry: '見積リストに追加',
    adminPriceBooks: '管理者価格表',
    approvalRequired: '承認後に価格を確認できます',
    available: '可能',
    back: '商品一覧へ戻る',
    buyerOnly: '承認済み取引先のみ価格とMOQを確認できます。',
    category: 'カテゴリー',
    categoryProducts: '同じカテゴリーの商品',
    categoryView: 'カテゴリーを見る',
    color: 'カラー',
    colors: 'カラー',
    description: '商品情報',
    emptyRelated: '同じカテゴリーの商品が追加されるとここに表示されます。',
    exportAvailability: '輸出対応',
    gallery: '商品画像',
    guide: '案内',
    leadTime: 'リードタイム',
    material: '素材',
    materialGuide: '素材ガイド',
    materialGuideText: (material) => `この商品は${material}として登録されています。仕上げ、メッキ、販売国の表示条件は見積確認時に担当者へご確認ください。`,
    moq: 'MOQ',
    moqAfterReview: '承認後に案内',
    noImage: '登録された商品画像がありません。',
    notFound: '商品が見つかりません。',
    origin: '原産地',
    priceUnavailable: '承認価格が登録されていません。',
    productCode: '商品コード',
    productInfo: '商品情報',
    quantity: '数量',
    quantityNote: (moq) => `数量はMOQ単位で調整されます。基準単位: ${moq} pcs`,
    quoteNotice: '見積案内',
    quoteNoticeText: '見積依頼は最終注文や決済ではありません。Noblesseが在庫、納期、取引条件を確認したうえで最終見積基準を案内します。',
    requestAccess: '取引先承認を申請',
    reviewStatus: '承認状況を見る',
    selectedImage: '選択中の画像',
    shippingNotice: '出荷・交換案内',
    shippingNoticeText: '出荷予定、梱包、交換可否は見積確認後、商品状態と取引条件に基づいて別途案内されます。',
    size: 'サイズ',
    sizeGuide: 'サイズガイド',
    sizeGuideText: 'ピアスのサイズや着用感はデザインと測定方法により異なる場合があります。見積依頼前に登録仕様をご確認ください。',
    sizes: 'サイズ',
    specification: '詳細仕様',
    statusGuest: '会員登録後に取引先承認を申請すると、価格と見積機能を利用できます。',
    statusPending: '取引先情報を確認中です。承認後に価格と見積リスト機能が利用できます。',
    thumbnail: 'サムネイル',
    unavailable: '不可',
    viewLarge: '大きい画像を見る',
    wholesale: '卸取引基準',
  },
  cn: {
    addToInquiry: '加入詢價清單',
    adminPriceBooks: '管理員價格表',
    approvalRequired: '核准後可查看價格',
    available: '可支援',
    back: '返回商品列表',
    buyerOnly: '只有核准的買家可以查看價格與 MOQ。',
    category: '分類',
    categoryProducts: '同分類商品',
    categoryView: '查看分類',
    color: '顏色',
    colors: '顏色',
    description: '商品資訊',
    emptyRelated: '同分類商品新增後會顯示在這裡。',
    exportAvailability: '出口支援',
    gallery: '商品圖片',
    guide: '說明',
    leadTime: '交期',
    material: '材質',
    materialGuide: '材質說明',
    materialGuideText: (material) => `此商品以 ${material} 登錄。電鍍、表面處理與目的市場標示要求，請於詢價確認時與負責人再次確認。`,
    moq: 'MOQ',
    moqAfterReview: '核准後提供',
    noImage: '尚未登錄商品圖片。',
    notFound: '找不到商品。',
    origin: '產地',
    priceUnavailable: '尚未登錄核准買家價格。',
    productCode: '商品代碼',
    productInfo: '商品資訊',
    quantity: '數量',
    quantityNote: (moq) => `數量會依 MOQ 單位調整。基準單位：${moq} pcs`,
    quoteNotice: '詢價說明',
    quoteNoticeText: '詢價請求不是最終訂單或付款。Noblesse 會確認庫存、交期與交易條件後，再提供最終報價基準。',
    requestAccess: '申請買家核准',
    reviewStatus: '查看核准狀態',
    selectedImage: '目前選擇的圖片',
    shippingNotice: '出貨與換貨說明',
    shippingNoticeText: '出貨時程、包裝與可否換貨，會在詢價審核後依商品狀態與交易條件另行說明。',
    size: '尺寸',
    sizeGuide: '尺寸指南',
    sizeGuideText: '穿孔飾品的尺寸與配戴感可能依設計與測量方式不同。詢價前請確認登錄規格。',
    sizes: '尺寸',
    specification: '詳細規格',
    statusGuest: '註冊後申請買家核准，即可使用價格與詢價功能。',
    statusPending: '買家資料審核中。核准後即可使用價格與詢價清單功能。',
    thumbnail: '縮圖',
    unavailable: '不支援',
    viewLarge: '查看大圖',
    wholesale: '批發基準',
  },
}

const getDetailCopy = (contentLocale) => detailCopy[contentLocale] ?? detailCopy.en

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])

const joinList = (value) => {
  const list = asList(value)
  return list.length > 0 ? list.join(' / ') : ''
}

const buildGalleryImages = (product, productAlt, copy) => {
  const imageSet = product?.imageSet || {}
  const candidates = [
    { id: 'detail', src: imageSet.detail, label: copy.selectedImage },
    { id: 'zoom', src: imageSet.zoom, label: copy.viewLarge },
    { id: 'card', src: imageSet.card, label: copy.gallery },
    { id: 'thumb', src: imageSet.thumb, label: copy.thumbnail },
  ]
  const seen = new Set()
  return candidates.filter((image) => {
    if (!image.src || seen.has(image.src)) return false
    seen.add(image.src)
    return true
  }).map((image) => ({ ...image, alt: productAlt }))
}

const getLocalizedCategoryName = (product, contentLocale) => {
  if (contentLocale === 'kr') return product.categoryNameKo || product.categoryNameEn || product.categoryId
  if (contentLocale === 'jp') return product.categoryNameJa || product.categoryNameEn || product.categoryNameKo || product.categoryId
  if (contentLocale === 'cn') return product.categoryNameCn || product.categoryNameEn || product.categoryNameKo || product.categoryId
  return product.categoryNameEn || product.categoryNameKo || product.categoryId
}

const getRelatedProducts = (products, product) => {
  const productCollections = new Set(asList(product.collectionIds))
  return products
    .filter((item) => item.productId !== product.productId && item.isVisible)
    .map((item) => {
      let score = 0
      if (item.categoryId && item.categoryId === product.categoryId) score += 8
      if (asList(item.collectionIds).some((id) => productCollections.has(id))) score += 4
      if (item.material && item.material === product.material) score += 2
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (a.item.sortOrder || 0) - (b.item.sortOrder || 0) || a.item.productId.localeCompare(b.item.productId))
    .slice(0, 4)
    .map(({ item }) => item)
}

function ProductGallery({ copy, product, productAlt }) {
  const images = useMemo(() => buildGalleryImages(product, productAlt, copy), [copy, product, productAlt])
  const [selectedSrc, setSelectedSrc] = useState(images[0]?.src || '')

  useEffect(() => {
    setSelectedSrc(images[0]?.src || '')
  }, [images])

  const selectedImage = images.find((image) => image.src === selectedSrc) || images[0] || null

  return <section className="pd-gallery" aria-label={copy.gallery}>
    <figure className={`pd-main-image tone-${product.tone}`}>
      {selectedImage
        ? <img src={selectedImage.src} alt={selectedImage.alt} loading="eager" width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />
        : <div className="pd-image-placeholder"><Images size={32} /><span>{copy.noImage}</span></div>}
    </figure>
    {images.length > 1 && <div className="pd-thumbs" role="list" aria-label={copy.thumbnail}>
      {images.map((image) => <button
        aria-label={image.label}
        aria-pressed={selectedImage?.src === image.src}
        className={selectedImage?.src === image.src ? 'pd-thumb is-active' : 'pd-thumb'}
        key={image.id}
        onClick={() => setSelectedSrc(image.src)}
        type="button"
      >
        <img src={image.src} alt="" loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />
      </button>)}
    </div>}
    {product.imageSet?.zoom && <a className="pd-large-link" href={product.imageSet.zoom} rel="noreferrer" target="_blank">{copy.viewLarge}<ChevronRight size={14} /></a>}
  </section>
}

function OptionButtons({ label, options, selected, onSelect }) {
  const safeOptions = asList(options)
  if (safeOptions.length === 0) return null
  return <div className="pd-option-group">
    <span>{label}</span>
    <div className="pd-option-buttons">
      {safeOptions.map((option) => <button className={selected === option ? 'pd-option-button is-active' : 'pd-option-button'} key={option} type="button" onClick={() => onSelect(option)}>{option}</button>)}
    </div>
  </div>
}

function DetailSection({ children, icon, title }) {
  if (!children) return null
  return <article className="pd-info-card">
    <div className="pd-info-card-head">{icon}<h2>{title}</h2></div>
    {children}
  </article>
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const {
    addInquiryItem,
    approvedPrice,
    dataError,
    dataStatus,
    getAdminPriceBooks,
    getPrice,
    isAdmin,
    isApproved,
    products,
    viewerState,
  } = useCommerce()
  const { contentLocale, locale, toLocalePath } = useLocalePath()
  const copy = getDetailCopy(contentLocale)
  const product = products.find((item) => item.productId === productId)
  const productName = product ? getLocalizedProductName(product, locale) : ''
  const productAlt = product ? getLocalizedProductAlt(product, locale) : ''
  const description = product ? getLocalizedProductDescription(product, locale) : ''
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const price = product ? getPrice(product.productId) : null
  const approvedAmount = product ? approvedPrice(product.productId) : null
  const adminPriceBooks = product && isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const canUseTradeTerms = Boolean(isApproved && price && approvedAmount !== null)
  const canViewAdminPrices = Boolean(isAdmin && adminPriceBooks.length > 0)
  const visibleMoq = canUseTradeTerms ? price.moq : canViewAdminPrices ? adminPriceBooks[0]?.moq : null
  const [quantity, setQuantity] = useState(visibleMoq || 1)

  useEffect(() => {
    setSelectedColor(product?.colors?.[0] ?? '')
    setSelectedSize(product?.sizes?.[0] ?? '')
  }, [product?.productId, product?.colors, product?.sizes])

  useEffect(() => {
    if (visibleMoq) setQuantity(visibleMoq)
  }, [visibleMoq])

  if (dataStatus === 'loading') {
    return <main className="content pd-page"><div className="empty">Loading product details...</div></main>
  }

  if (dataStatus === 'error') {
    return <main className="content pd-page"><div className="empty"><h1>Catalog API unavailable</h1><p>{dataError || 'Unable to load product details.'}</p></div></main>
  }

  if (!product) return <main className="content pd-page"><div className="empty">{copy.notFound}</div></main>

  const categoryName = getLocalizedCategoryName(product, contentLocale)
  const colors = asList(product.colors)
  const sizes = asList(product.sizes)
  const activeColor = colors.includes(selectedColor) ? selectedColor : colors[0] ?? ''
  const activeSize = sizes.includes(selectedSize) ? selectedSize : sizes[0] ?? ''
  const productSpecs = product.specs || {}
  const productDetailContent = product.detailContent || {}
  const currentQuantity = normalizeQuantity(quantity, visibleMoq || 1)
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? copy.reviewStatus : copy.requestAccess
  const relatedProducts = getRelatedProducts(products, product)

  const productInfoRows = [
    [copy.productCode, product.code],
    [copy.category, categoryName],
    [copy.material, product.material],
    [copy.colors, joinList(colors)],
    [copy.sizes, joinList(sizes)],
    [copy.leadTime, product.leadTime],
    [copy.origin, product.origin],
    [copy.exportAvailability, product.isExportAvailable ? copy.available : copy.unavailable],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '')

  const specificationRows = [
    ['Gauge', productSpecs.gauge],
    ['Length', productSpecs.length ? `${productSpecs.length}${productSpecs.unit || ''}` : ''],
    ['Ball', productSpecs.ballSize ? `${productSpecs.ballSize}${productSpecs.unit || ''}` : ''],
    ['Bar', productSpecs.barThickness ? `${productSpecs.barThickness}${productSpecs.unit || ''}` : ''],
  ].filter(([, value]) => value)

  const addSelectedItem = () => addInquiryItem(product.productId, { color: activeColor, size: activeSize }, currentQuantity)
  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, visibleMoq || 1))

  return <main className="content pd-page">
    <nav className="pd-breadcrumb" aria-label="Breadcrumb">
      <Link to={toLocalePath('/products')}><ChevronLeft size={16} />{copy.back}</Link>
      <span>{categoryName}</span>
      <span>{product.code}</span>
    </nav>

    <section className="pd-hero">
      <ProductGallery copy={copy} product={product} productAlt={productAlt} />

      <aside className="pd-panel" aria-label={copy.productInfo}>
        <p className="pd-eyebrow">{copy.productCode} {product.code}</p>
        <h1>{productName}</h1>
        {product.nameEn && product.nameEn !== productName && <p className="pd-alt-name">{product.nameEn}</p>}
        {description && <p className="pd-summary">{description}</p>}

        <dl className="pd-meta-list">
          {productInfoRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {visibleMoq && <div><dt>{copy.moq}</dt><dd>{visibleMoq} pcs</dd></div>}
        </dl>

        {canViewAdminPrices && <div className="pd-admin-prices">
          <small>{copy.adminPriceBooks}</small>
          <div className="pd-admin-price-grid">
            {adminPriceItems.map((item, index) => <span className="pd-admin-price" key={`${item.market}-${item.currency}-${index}`}>
              <img alt={item.flagLabel} src={item.flagSrc} />
              <b>{item.amount}</b>
              <span>{item.symbol}</span>
            </span>)}
          </div>
        </div>}

        {canUseTradeTerms ? <div className="pd-trade-box">
          <small>{copy.approvalRequired}</small>
          <strong>{formatMoney(approvedAmount, price.currency)}</strong>
          <span>{copy.moq} {price.moq} pcs · {price.market} · {price.currency}</span>
          <OptionButtons label={copy.color} options={colors} selected={activeColor} onSelect={setSelectedColor} />
          <OptionButtons label={copy.size} options={sizes} selected={activeSize} onSelect={setSelectedSize} />
          <div className="pd-option-group">
            <span>{copy.quantity}</span>
            <div className="pd-quantity-control">
              <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(currentQuantity - visibleMoq)}><Minus size={15} /></button>
              <input value={currentQuantity} type="number" min={visibleMoq} step={visibleMoq} onBlur={(event) => updateQuantity(event.target.value)} onChange={(event) => updateQuantity(event.target.value)} />
              <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(currentQuantity + visibleMoq)}><Plus size={15} /></button>
            </div>
            <small>{copy.quantityNote(visibleMoq)}</small>
          </div>
          <button className="pd-primary-action" type="button" onClick={addSelectedItem}><Plus size={17} />{copy.addToInquiry}</button>
        </div> : <div className="pd-access-box">
          <LockKeyhole size={20} />
          <strong>{canViewAdminPrices ? copy.adminPriceBooks : copy.approvalRequired}</strong>
          <p>{viewerState === 'pending' ? copy.statusPending : canViewAdminPrices ? copy.buyerOnly : copy.statusGuest}</p>
          {!canViewAdminPrices && <Link className="pd-secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>}
        </div>}
      </aside>
    </section>

    <section className="pd-assurance-strip" aria-label={copy.guide}>
      <span><FileText size={18} />{copy.productInfo}</span>
      <span><ShieldCheck size={18} />{copy.buyerOnly}</span>
      <span><PackageCheck size={18} />{copy.wholesale}</span>
      <span><Truck size={18} />{copy.quoteNotice}</span>
    </section>

    <section className="pd-info-sections">
      {(productDetailContent.headline || productDetailContent.body || productDetailContent.decoration || productDetailContent.fit || productDetailContent.care || description) && <DetailSection icon={<FileText size={19} />} title={copy.productInfo}>
        {productDetailContent.headline && <h3>{productDetailContent.headline}</h3>}
        {(productDetailContent.body || description) && <p>{productDetailContent.body || description}</p>}
        {(productDetailContent.decoration || productDetailContent.fit || productDetailContent.care) && <ul>
          {productDetailContent.decoration && <li>{productDetailContent.decoration}</li>}
          {productDetailContent.fit && <li>{productDetailContent.fit}</li>}
          {productDetailContent.care && <li>{productDetailContent.care}</li>}
        </ul>}
      </DetailSection>}

      <DetailSection icon={<Ruler size={19} />} title={copy.specification}>
        <dl className="pd-spec-table">
          {productInfoRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {visibleMoq && <div><dt>{copy.moq}</dt><dd>{visibleMoq} pcs</dd></div>}
          {specificationRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </DetailSection>

      {product.material && <DetailSection icon={<ShieldCheck size={19} />} title={copy.materialGuide}>
        <p>{copy.materialGuideText(product.material)}</p>
      </DetailSection>}

      <DetailSection icon={<PackageCheck size={19} />} title={copy.quoteNotice}>
        <p>{copy.quoteNoticeText}</p>
      </DetailSection>

      <DetailSection icon={<Truck size={19} />} title={copy.shippingNotice}>
        <p>{copy.shippingNoticeText}</p>
      </DetailSection>

      <DetailSection icon={<Ruler size={19} />} title={copy.sizeGuide}>
        <p>{copy.sizeGuideText}</p>
      </DetailSection>
    </section>

    <section className="pd-related">
      <div className="pd-section-heading">
        <div><p>{copy.category}</p><h2>{copy.categoryProducts}</h2></div>
        <Link to={toLocalePath(`/products?category=${product.categoryId}`)}>{copy.categoryView}</Link>
      </div>
      {relatedProducts.length > 0
        ? <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
        : <div className="empty related-empty">{copy.emptyRelated}</div>}
    </section>

    <div className="pd-mobile-action" aria-label={copy.quoteNotice}>
      {canUseTradeTerms
        ? <button className="pd-primary-action" type="button" onClick={addSelectedItem}><Plus size={17} />{copy.addToInquiry}</button>
        : !canViewAdminPrices && <Link className="pd-secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>}
    </div>
  </main>
}
