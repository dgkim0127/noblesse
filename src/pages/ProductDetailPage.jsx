import { ChevronLeft, LockKeyhole, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductDescription, getLocalizedProductName, resolveLocaleCopy, useLocalePath } from '../utils/locale'

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const detailCopy = {
  kr: {
    add: '이 제품 문의하기',
    back: '상품 목록으로',
    categoryProducts: '같은 카테고리 상품',
    categoryView: '카테고리 보기',
    color: '컬러',
    description: '상품 설명',
    emptyRelated: '카테고리 상품이 추가되면 이 영역에 표시됩니다.',
    exportAvailable: '수출 가능',
    exportNo: '불가',
    exportYes: '가능',
    fallbackMoq: (moq) => `공개 기준 ${moq}+ pcs`,
    infoCategory: '관련 상품',
    leadTime: '리드타임',
    lockPending: '현재 거래처 정보 확인 중입니다. 상품 정보는 확인 가능하며, 담당자 확인 후 문의 기능을 안내드립니다.',
    lockTitle: '거래 조건은 문의 후 안내',
    lockGuest: '제품 정보, 소재, 옵션, MOQ를 확인한 뒤 거래처 문의를 남겨주세요.',
    material: '재질',
    memberPrice: '거래 조건',
    unavailable: '가격 미등록',
    moq: 'MOQ',
    moqAfterReview: '확인 후 볼 수 있음',
    origin: '원산지',
    productCode: '상품 코드',
    quantity: '수량',
    quantityNote: (moq) => `수량은 MOQ 단위로 조정됩니다: ${moq} pcs.`,
    quoteGuide: '견적 안내',
    quoteGuideText: '현재 단계는 최종 확정이 아닙니다. Noblesse가 재고, 리드타임, 최종 견적을 확인한 뒤 안내합니다.',
    quoteNote: '컬러, 사이즈, 수량 선택 후 제품 문의를 보내면 Noblesse가 재고와 최종 견적을 확인합니다. 견적 문의는 최종 주문이 아닙니다.',
    region: (market) => `${market} 지역`,
    requestAccess: '거래 조건 문의',
    reviewStatus: '확인 상태 보기',
    size: '사이즈',
    sizeGuide: '사이즈 안내',
    sizeGuideText: '피어싱 사이즈와 착용감은 디자인별로 다를 수 있습니다. 견적 문의 전 사이즈를 확인해주세요.',
    thumb: '썸네일',
    zoom: '확대 이미지',
  },
  en: {
    add: 'Ask about this product',
    back: 'Back to product list',
    categoryProducts: 'More in this category',
    categoryView: 'View category',
    color: 'Color',
    description: 'Product details',
    emptyRelated: 'More products from this category will appear here.',
    exportAvailable: 'Export',
    exportNo: 'Unavailable',
    exportYes: 'Available',
    fallbackMoq: (moq) => `Public guide ${moq}+ pcs`,
    infoCategory: 'Related products',
    leadTime: 'Lead time',
    lockPending: 'Your trade inquiry is being reviewed. Product details are available now, and trade inquiry tools open after review.',
    lockTitle: 'Trade terms after inquiry',
    lockGuest: 'Review product details, material, options, and MOQ, then send a trade inquiry.',
    material: 'Material',
    memberPrice: 'Approved trade terms',
    unavailable: 'Price unavailable',
    moq: 'MOQ',
    moqAfterReview: 'Available after review',
    origin: 'Origin',
    productCode: 'Product code',
    quantity: 'Quantity',
    quantityNote: (moq) => `Quantity adjusts by MOQ units: ${moq} pcs.`,
    quoteGuide: 'Quote guide',
    quoteGuideText: 'This is not final confirmation. Noblesse will check stock, lead time, and final quote before replying.',
    quoteNote: 'Select color, size, and quantity, then send a product inquiry. Noblesse will check stock and final quote. A quote inquiry is not a final order.',
    region: (market) => `${market} region`,
    requestAccess: 'Trade inquiry',
    reviewStatus: 'View review status',
    size: 'Size',
    sizeGuide: 'Size guide',
    sizeGuideText: 'Piercing sizes and fit can vary by design. Please check size details before a quote inquiry.',
    thumb: 'thumbnail',
    zoom: 'Zoom image',
  },
  jp: {
    add: 'この商品を問い合わせる',
    back: '商品一覧へ',
    categoryProducts: '同じカテゴリの商品',
    categoryView: 'カテゴリを見る',
    color: 'カラー',
    description: '商品説明',
    emptyRelated: 'カテゴリ商品が追加されるとここに表示されます。',
    exportAvailable: '輸出対応',
    exportNo: '不可',
    exportYes: '可能',
    fallbackMoq: (moq) => `公開目安 ${moq}+ pcs`,
    infoCategory: '関連商品',
    leadTime: 'リードタイム',
    lockPending: '取引先情報を確認中です。商品情報は閲覧でき、確認後にお問い合わせ機能をご案内します。',
    lockTitle: '取引条件はお問い合わせ後にご案内',
    lockGuest: '商品情報、素材、オプション、最小数量を確認し、取引先お問い合わせを送信してください。',
    material: '素材',
    memberPrice: '取引条件',
    unavailable: '価格未登録',
    moq: '最小数量',
    moqAfterReview: '確認後に表示',
    origin: '原産地',
    productCode: '商品コード',
    quantity: '数量',
    quantityNote: (moq) => `数量は最小数量単位で調整されます: ${moq} pcs.`,
    quoteGuide: '見積案内',
    quoteGuideText: 'この段階は最終確定ではありません。Noblesseが在庫、リードタイム、最終見積を確認してご案内します。',
    quoteNote: 'カラー、サイズ、数量を選んで商品のお問い合わせを送ると、Noblesseが在庫と最終見積を確認します。見積相談は最終注文ではありません。',
    region: (market) => `${market} 地域`,
    requestAccess: '取引条件のお問い合わせ',
    reviewStatus: '確認状況を見る',
    size: 'サイズ',
    sizeGuide: 'サイズ案内',
    sizeGuideText: 'ピアスのサイズと着用感はデザインにより異なります。見積相談前にサイズをご確認ください。',
    thumb: 'サムネイル',
    zoom: '拡大画像',
  },
  cn: {
    add: '咨询此商品',
    back: '返回商品列表',
    categoryProducts: '同类商品',
    categoryView: '查看分类',
    color: '颜色',
    description: '商品说明',
    emptyRelated: '分类商品添加后会显示在这里。',
    exportAvailable: '出口',
    exportNo: '不可用',
    exportYes: '可用',
    fallbackMoq: (moq) => `公开参考 ${moq}+ pcs`,
    infoCategory: '相关商品',
    leadTime: '交期',
    lockPending: '贸易信息正在确认中。商品信息可先查看，确认后将提供咨询功能。',
    lockTitle: '交易条件将在咨询后提供',
    lockGuest: '查看商品信息、材质、选项和最小数量后，请提交贸易咨询。',
    material: '材质',
    memberPrice: '交易条件',
    unavailable: '价格未登记',
    moq: '最小数量',
    moqAfterReview: '确认后显示',
    origin: '产地',
    productCode: '商品编号',
    quantity: '数量',
    quantityNote: (moq) => `数量会按最小数量单位调整: ${moq} pcs.`,
    quoteGuide: '报价说明',
    quoteGuideText: '当前阶段不是最终确认。Noblesse 会确认库存、交期和最终报价后再回复。',
    quoteNote: '选择颜色、尺寸和数量后发送商品咨询，Noblesse 会确认库存和最终报价。报价咨询不是最终订单。',
    region: (market) => `${market} 地区`,
    requestAccess: '咨询交易条件',
    reviewStatus: '查看确认状态',
    size: '尺寸',
    sizeGuide: '尺寸说明',
    sizeGuideText: '穿孔饰品尺寸和佩戴感会因设计而不同。报价咨询前请确认尺寸。',
    thumb: '缩略图',
    zoom: '查看大图',
  },
}

function DetailImage({ product }) {
  const { locale } = useLocalePath()
  const copy = resolveLocaleCopy(detailCopy, locale)
  const productAlt = getLocalizedProductAlt(product, locale)
  const productName = getLocalizedProductName(product, locale)

  return <div className="detail-gallery">
    <div className={`detail-image tone-${product.tone}`}>
      <span className="jewel-shape" />
      {product.imageSet?.detail && <img src={product.imageSet.detail} alt={productAlt} loading="lazy" width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />}
    </div>
    <div className="detail-thumbs">
      {product.imageSet?.thumb && <div className={`detail-thumb tone-${product.tone}`}><span className="jewel-shape" /><img src={product.imageSet.thumb} alt={`${productName} ${copy.thumb}`} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} /></div>}
      {product.imageSet?.zoom && <a className="detail-thumb zoom-link" href={product.imageSet.zoom} target="_blank" rel="noreferrer">{copy.zoom}</a>}
    </div>
  </div>
}

function OptionButtons({ label, options, selected, onSelect }) {
  return <div className="option-group">
    <span>{label}</span>
    <div className="option-buttons">
      {options.map((option) => <button className={selected === option ? 'option-button active' : 'option-button'} key={option} type="button" onClick={() => onSelect(option)}>{option}</button>)}
    </div>
  </div>
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const { addInquiryItem, approvedPrice, dataError, dataStatus, getAdminPriceBooks, getPrice, isAdmin, isApproved, products, viewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const product = products.find((item) => item.productId === productId)
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] ?? '')
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] ?? '')
  const price = product ? getPrice(product.productId) : null
  const adminPriceBooks = product && isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const primaryAdminPrice = adminPriceBooks[0] ?? null
  const moq = price?.moq ?? primaryAdminPrice?.moq ?? product?.moqDefault ?? 1
  const [quantity, setQuantity] = useState(moq)

  if (dataStatus === 'loading') {
    return <main className="content"><div className="empty">Loading product details...</div></main>
  }

  if (dataStatus === 'error') {
    return <main className="content"><div className="empty"><h1>Catalog API unavailable</h1><p>{dataError || 'Unable to load product details.'}</p></div></main>
  }

  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>

  const relatedProducts = products
    .filter((item) => item.productId !== product.productId && item.categoryId === product.categoryId && item.isVisible)
    .slice(0, 4)

  const activeColor = product.colors.includes(selectedColor) ? selectedColor : product.colors[0] ?? ''
  const activeSize = product.sizes.includes(selectedSize) ? selectedSize : product.sizes[0] ?? ''
  const productName = getLocalizedProductName(product, locale)
  const description = getLocalizedProductDescription(product, locale) ?? ''
  const copy = resolveLocaleCopy(detailCopy, locale)
  const detailFieldCopy = resolveLocaleCopy({
    kr: { specs: '제품 사양', care: '관리 안내', fit: '착용 안내', decoration: '장식 상세' },
    en: { specs: 'Specifications', care: 'Care note', fit: 'Fit note', decoration: 'Decoration detail' },
    jp: { specs: '商品仕様', care: 'ケア案内', fit: '着用案内', decoration: '装飾詳細' },
    cn: { specs: '商品規格', care: '保養說明', fit: '配戴說明', decoration: '裝飾細節' },
  }, locale, 'en')
  const adminPriceLabel = resolveLocaleCopy({ kr: '관리자 가격', en: 'Admin prices', jp: '管理者価格', cn: '管理员价格' }, locale, 'en')
  const moqLabel = isApproved && price ? price.moq : primaryAdminPrice ? primaryAdminPrice.moq : copy.moqAfterReview
  const fallbackMoqLabel = !isApproved && !primaryAdminPrice && product.moqDefault ? copy.fallbackMoq(product.moqDefault) : ''
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? copy.reviewStatus : copy.requestAccess
  const canUseTradeTerms = isApproved && price
  const currentQuantity = normalizeQuantity(quantity, moq)
  const productSpecs = product.specs || {}
  const productDetailContent = product.detailContent || {}
  const specEntries = [
    ['Gauge', productSpecs.gauge],
    ['Length', productSpecs.length ? `${productSpecs.length}${productSpecs.unit || ''}` : ''],
    ['Ball', productSpecs.ballSize ? `${productSpecs.ballSize}${productSpecs.unit || ''}` : ''],
    ['Bar', productSpecs.barThickness ? `${productSpecs.barThickness}${productSpecs.unit || ''}` : ''],
  ].filter(([, value]) => value)

  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, moq))
  const addSelectedItem = () => addInquiryItem(product.productId, { color: activeColor, size: activeSize }, currentQuantity)

  return <main className="content">
    <Link className="back" to={toLocalePath('/products')}><ChevronLeft size={17} />{copy.back}</Link>
    <section className="detail">
      <DetailImage product={product} />
      <div className="detail-copy">
        <small>{product.code}</small>
        <h1>{productName}</h1>
        <p>{product.nameJa}</p>
        <p className="local-name">{product.nameKo}</p>
        <dl className="product-info-list">
          <div><dt>{copy.productCode}</dt><dd>{product.code}</dd></div>
          <div><dt>{copy.material}</dt><dd>{product.material}</dd></div>
          <div><dt>{copy.color}</dt><dd>{product.colors.join(' / ')}</dd></div>
          <div><dt>{copy.size}</dt><dd>{product.sizes.join(' / ')}</dd></div>
          <div><dt>{copy.moq}</dt><dd>{moqLabel}{fallbackMoqLabel && <small>{fallbackMoqLabel}</small>}</dd></div>
          <div><dt>{copy.leadTime}</dt><dd>{product.leadTime}</dd></div>
          <div><dt>{copy.origin}</dt><dd>{product.origin}</dd></div>
          <div><dt>{copy.exportAvailable}</dt><dd>{product.isExportAvailable ? copy.exportYes : copy.exportNo}</dd></div>
        </dl>

        {(productDetailContent.headline || productDetailContent.body || productDetailContent.care || productDetailContent.fit || productDetailContent.decoration || specEntries.length > 0) ? <section className="catalog-detail-content">
          {productDetailContent.headline && <h2>{productDetailContent.headline}</h2>}
          {productDetailContent.body && <p>{productDetailContent.body}</p>}
          {specEntries.length > 0 && <dl className="detail-specs">
            <dt>{detailFieldCopy.specs}</dt>
            {specEntries.map(([label, value]) => <dd key={label}><span>{label}</span> {value}</dd>)}
          </dl>}
          <ul>
            {productDetailContent.decoration && <li><strong>{detailFieldCopy.decoration}</strong> {productDetailContent.decoration}</li>}
            {productDetailContent.fit && <li><strong>{detailFieldCopy.fit}</strong> {productDetailContent.fit}</li>}
            {productDetailContent.care && <li><strong>{detailFieldCopy.care}</strong> {productDetailContent.care}</li>}
          </ul>
        </section> : null}

        {adminPriceBooks.length > 0 ? <div className="detail-price admin-price-books">
          <small>{adminPriceLabel}</small>
          <span className="admin-price-book-grid detail-admin-price-book-grid">{adminPriceItems.map((item, index) => <span className="admin-price-book-item" key={`${item.market}-${item.currency}-${index}`}><img alt={item.flagLabel} className="admin-price-book-flag" src={item.flagSrc} /><span className="admin-price-book-value"><b>{item.amount}</b><span>{item.symbol}</span><em>{item.currency}</em></span></span>)}</span>
        </div> : null}

        {canUseTradeTerms ? <>
          <div className="detail-price">
            <small>{copy.memberPrice}</small>
            <strong>{formatMoney(approvedPrice(product.productId), price.currency)}</strong>
            <span>{copy.moq} {price.moq} / {copy.region(price.market)} · {price.currency}</span>
          </div>
          <OptionButtons label={copy.color} options={product.colors} selected={activeColor} onSelect={setSelectedColor} />
          <OptionButtons label={copy.size} options={product.sizes} selected={activeSize} onSelect={setSelectedSize} />
          <div className="option-group">
            <span>{copy.quantity}</span>
            <div className="quantity-control">
              <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(currentQuantity - moq)}><Minus size={15} /></button>
              <input value={currentQuantity} type="number" min={moq} step={moq} onChange={(event) => updateQuantity(event.target.value)} onBlur={(event) => updateQuantity(event.target.value)} />
              <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(currentQuantity + moq)}><Plus size={15} /></button>
            </div>
            <small>{copy.quantityNote(moq)}</small>
          </div>
          <button className="primary-action" type="button" onClick={addSelectedItem}><Plus size={17} />{copy.add}</button>
          <p className="quote-note">{copy.quoteNote}</p>
        </> : adminPriceBooks.length > 0 ? null : <div className="approval-lock">
          <LockKeyhole size={19} />
          <strong>{isApproved ? copy.unavailable : copy.lockTitle}</strong>
          <span>{viewerState === 'pending' ? copy.lockPending : copy.lockGuest}</span>
          <Link className="secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>
        </div>}
      </div>
    </section>

    <section className="detail-guide">
      <article>
        <h2>{copy.description}</h2>
        <p>{description}</p>
      </article>
      <article>
        <h2>{copy.sizeGuide}</h2>
        <p>{copy.sizeGuideText}</p>
      </article>
      <article>
        <h2>{copy.quoteGuide}</h2>
        <p>{copy.quoteGuideText}</p>
      </article>
    </section>

    <section className="related-products">
      <div className="section-heading">
        <div><p>{copy.infoCategory}</p><h2>{copy.categoryProducts}</h2></div>
        <Link to={toLocalePath(`/products?category=${product.categoryId}`)}>{copy.categoryView}</Link>
      </div>
      {relatedProducts.length > 0
        ? <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
        : <div className="empty related-empty">{copy.emptyRelated}</div>}
    </section>
  </main>
}
