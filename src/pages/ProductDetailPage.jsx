import { ChevronLeft, LockKeyhole, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductDescription, getLocalizedProductName, useLocalePath } from '../utils/locale'

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const detailCopy = {
  kr: {
    add: '문의 리스트에 담기',
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
    lockPending: '현재 회원 확인 중입니다. 상품 정보는 확인 가능하며, 확인 후 문의 기능이 열립니다.',
    lockTitle: '회원 확인 후 가격 보기',
    lockGuest: '회원 확인 후 가격, 옵션 선택, 견적 문의 기능을 사용할 수 있습니다.',
    material: '재질',
    memberPrice: '회원가',
    moq: '최소 수량',
    moqAfterReview: '확인 후 볼 수 있음',
    origin: '원산지',
    productCode: '상품 코드',
    quantity: '수량',
    quantityNote: (moq) => `수량은 최소 수량 단위로 조정됩니다: ${moq} pcs.`,
    quoteGuide: '견적 안내',
    quoteGuideText: '현재 단계는 최종 확정이 아닙니다. Noblesse가 재고, 리드타임, 최종 견적을 확인한 뒤 안내합니다.',
    quoteNote: '컬러, 사이즈, 수량 선택 후 견적 문의를 보내면 Noblesse가 재고와 최종 견적을 확인합니다.',
    region: (market) => `${market} 지역`,
    requestAccess: '회원 신청',
    reviewStatus: '확인 상태 보기',
    size: '사이즈',
    sizeGuide: '사이즈 안내',
    sizeGuideText: '피어싱 사이즈와 착용감은 디자인별로 다를 수 있습니다. 견적 문의 전 사이즈를 확인해주세요.',
    thumb: '썸네일',
    zoom: '확대 이미지',
  },
  en: {
    add: 'Add to Inquiry List',
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
    lockPending: 'Your member request is being reviewed. Product details are open now, and inquiry tools open after review.',
    lockTitle: 'Price after member review',
    lockGuest: 'Member review opens prices, option selection, and quote inquiry tools.',
    material: 'Material',
    memberPrice: 'Member price',
    moq: 'Minimum qty',
    moqAfterReview: 'Available after review',
    origin: 'Origin',
    productCode: 'Product code',
    quantity: 'Quantity',
    quantityNote: (moq) => `Quantity adjusts by minimum quantity units: ${moq} pcs.`,
    quoteGuide: 'Quote guide',
    quoteGuideText: 'This is not final confirmation. Noblesse will check stock, lead time, and final quote before replying.',
    quoteNote: 'Select color, size, and quantity, then send a quote inquiry. Noblesse will check stock and final quote.',
    region: (market) => `${market} region`,
    requestAccess: 'Request membership',
    reviewStatus: 'View review status',
    size: 'Size',
    sizeGuide: 'Size guide',
    sizeGuideText: 'Piercing sizes and fit can vary by design. Please check size details before a quote inquiry.',
    thumb: 'thumbnail',
    zoom: 'Zoom image',
  },
  jp: {
    add: 'お問い合わせリストに追加',
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
    lockPending: '会員情報を確認中です。商品情報は見られ、確認後に相談機能が開きます。',
    lockTitle: '確認後に価格表示',
    lockGuest: '会員確認後、価格、オプション選択、見積相談をご利用いただけます。',
    material: '素材',
    memberPrice: '会員価格',
    moq: '最小数量',
    moqAfterReview: '確認後に表示',
    origin: '原産地',
    productCode: '商品コード',
    quantity: '数量',
    quantityNote: (moq) => `数量は最小数量単位で調整されます: ${moq} pcs.`,
    quoteGuide: '見積案内',
    quoteGuideText: 'この段階は最終確定ではありません。Noblesseが在庫、リードタイム、最終見積を確認してご案内します。',
    quoteNote: 'カラー、サイズ、数量を選んで見積相談を送ると、Noblesseが在庫と最終見積を確認します。',
    region: (market) => `${market} 地域`,
    requestAccess: '会員申請',
    reviewStatus: '確認状況を見る',
    size: 'サイズ',
    sizeGuide: 'サイズ案内',
    sizeGuideText: 'ピアスのサイズと着用感はデザインにより異なります。見積相談前にサイズをご確認ください。',
    thumb: 'サムネイル',
    zoom: '拡大画像',
  },
  cn: {
    add: '加入咨询清单',
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
    lockPending: '会员信息正在确认中。现在可以查看商品信息，确认后会开放咨询功能。',
    lockTitle: '确认后查看价格',
    lockGuest: '会员确认后，可查看价格、选择选项并进行报价咨询。',
    material: '材质',
    memberPrice: '会员价',
    moq: '最小数量',
    moqAfterReview: '确认后显示',
    origin: '产地',
    productCode: '商品编号',
    quantity: '数量',
    quantityNote: (moq) => `数量会按最小数量单位调整: ${moq} pcs.`,
    quoteGuide: '报价说明',
    quoteGuideText: '当前阶段不是最终确认。Noblesse 会确认库存、交期和最终报价后再回复。',
    quoteNote: '选择颜色、尺寸和数量后发送报价咨询，Noblesse 会确认库存和最终报价。',
    region: (market) => `${market} 地区`,
    requestAccess: '申请会员',
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
  const copy = detailCopy[locale] ?? detailCopy.kr
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
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved, products, viewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const product = products.find((item) => item.productId === productId)
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] ?? '')
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] ?? '')
  const price = product ? getPrice(product.productId) : null
  const moq = price?.moq ?? product?.moqDefault ?? 1
  const [quantity, setQuantity] = useState(moq)

  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>

  const relatedProducts = products
    .filter((item) => item.productId !== product.productId && item.categoryId === product.categoryId && item.isVisible)
    .slice(0, 4)

  const activeColor = product.colors.includes(selectedColor) ? selectedColor : product.colors[0] ?? ''
  const activeSize = product.sizes.includes(selectedSize) ? selectedSize : product.sizes[0] ?? ''
  const productName = getLocalizedProductName(product, locale)
  const description = getLocalizedProductDescription(product, locale) ?? ''
  const copy = detailCopy[locale] ?? detailCopy.kr
  const moqLabel = isApproved && price ? price.moq : copy.moqAfterReview
  const fallbackMoqLabel = !isApproved && product.moqDefault ? copy.fallbackMoq(product.moqDefault) : ''
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? copy.reviewStatus : copy.requestAccess
  const currentQuantity = normalizeQuantity(quantity, moq)

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

        {isApproved ? <>
          <div className="detail-price">
            <small>{copy.memberPrice}</small>
            <strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong>
            <span>{copy.moq} {price.moq} / {copy.region(price.market)}</span>
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
        </> : <div className="approval-lock">
          <LockKeyhole size={19} />
          <strong>{copy.lockTitle}</strong>
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
