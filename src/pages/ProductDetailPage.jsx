import { ChevronLeft, LockKeyhole, Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductDescription, getLocalizedProductName, useLocalePath } from '../utils/locale'

const detailCopy = {
  kr: {
    back: '상품 목록으로',
    code: '상품 코드',
    material: '재질',
    color: '컬러',
    size: '사이즈',
    moq: 'MOQ',
    leadTime: '리드타임',
    origin: '원산지',
    exportable: '수출 가능',
    yes: '가능',
    no: '확인 필요',
    publicMoq: '공개 기준',
    memberPrice: '승인 바이어 가격',
    quantity: '수량',
    add: '이 제품 문의하기',
    note: '문의는 최종 주문이 아니며, 담당자 확인 후 견적과 가능 수량을 안내드립니다.',
    lockedTitle: '승인 후 가격 확인 가능',
    lockedBody: '상품 정보는 확인할 수 있으며, 가격과 견적 기능은 거래처 확인 후 열립니다.',
    requestAccess: '거래처 문의',
    description: '상품 설명',
    sizeGuide: '사이즈 안내',
    quoteGuide: '견적 안내',
    related: '관련 상품',
  },
  en: {
    back: 'Back to products',
    code: 'Product Code',
    material: 'Material',
    color: 'Color',
    size: 'Size',
    moq: 'MOQ',
    leadTime: 'Lead Time',
    origin: 'Origin',
    exportable: 'Export',
    yes: 'Available',
    no: 'Check required',
    publicMoq: 'Public guide',
    memberPrice: 'Approved buyer price',
    quantity: 'Quantity',
    add: 'Inquire about this product',
    note: 'A quote inquiry is not a final order. Noblesse will confirm stock, lead time, and final quotation.',
    lockedTitle: 'Price available after approval',
    lockedBody: 'Product information is public. Pricing and quote features open after buyer review.',
    requestAccess: 'Trade inquiry',
    description: 'Description',
    sizeGuide: 'Size Guide',
    quoteGuide: 'Quote Guide',
    related: 'Related Products',
  },
  jp: {
    back: '商品一覧へ',
    code: '商品コード',
    material: '素材',
    color: 'カラー',
    size: 'サイズ',
    moq: 'MOQ',
    leadTime: 'リードタイム',
    origin: '原産地',
    exportable: '輸出可否',
    yes: '可能',
    no: '確認必要',
    publicMoq: '公開基準',
    memberPrice: '承認バイヤー価格',
    quantity: '数量',
    add: 'この商品を問い合わせる',
    note: '見積依頼は最終注文ではありません。担当者確認後、在庫・リードタイム・見積を案内します。',
    lockedTitle: '承認後に価格確認可能',
    lockedBody: '商品情報は確認できます。価格と見積機能はバイヤー確認後に利用できます。',
    requestAccess: '取引問い合わせ',
    description: '商品説明',
    sizeGuide: 'サイズ案内',
    quoteGuide: '見積案内',
    related: '関連商品',
  },
  cn: {
    back: '返回商品列表',
    code: '商品代码',
    material: '材质',
    color: '颜色',
    size: '尺寸',
    moq: 'MOQ',
    leadTime: '交期',
    origin: '原产地',
    exportable: '可出口',
    yes: '可',
    no: '需确认',
    publicMoq: '公开基准',
    memberPrice: '已审核买家价格',
    quantity: '数量',
    add: '咨询此商品',
    note: '报价咨询不是最终订单。负责人确认后将 안내库存、交期及最终报价。',
    lockedTitle: '审核后可查看价格',
    lockedBody: '商品信息可公开浏览。价格和报价功能将在买家审核后开放。',
    requestAccess: '交易咨询',
    description: '商品说明',
    sizeGuide: '尺寸说明',
    quoteGuide: '报价说明',
    related: '相关商品',
  },
}

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
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
  const copy = detailCopy[locale] ?? detailCopy.kr
  const product = products.find((item) => item.productId === productId)
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] ?? '')
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] ?? '')
  const price = product ? getPrice(product.productId) : null
  const moq = price?.moq ?? product?.moqDefault ?? 1
  const [quantity, setQuantity] = useState(moq)

  const relatedProducts = useMemo(() => product
    ? products.filter((item) => item.productId !== product.productId && item.categoryId === product.categoryId && item.isVisible).slice(0, 4)
    : [], [product, products])

  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>

  const productName = getLocalizedProductName(product, locale)
  const description = getLocalizedProductDescription(product, locale)
  const activeColor = product.colors.includes(selectedColor) ? selectedColor : product.colors[0] ?? ''
  const activeSize = product.sizes.includes(selectedSize) ? selectedSize : product.sizes[0] ?? ''
  const currentQuantity = normalizeQuantity(quantity, moq)
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, moq))
  const addSelectedItem = () => addInquiryItem(product.productId, { color: activeColor, size: activeSize }, currentQuantity)

  return <main className="content product-detail-page">
    <Link className="back" to={toLocalePath('/products')}><ChevronLeft size={17} />{copy.back}</Link>

    <section className="detail">
      <div className="detail-gallery">
        <div className="detail-image">
          {product.imageSet?.detail && <img src={product.imageSet.detail} alt={getLocalizedProductAlt(product, locale)} loading="eager" width="1200" height="1500" onError={(event) => { event.currentTarget.hidden = true }} />}
        </div>
      </div>

      <div className="detail-copy">
        <small>{product.code}</small>
        <h1>{productName}</h1>
        <p>{description}</p>
        <dl className="product-info-list">
          <div><dt>{copy.code}</dt><dd>{product.code}</dd></div>
          <div><dt>{copy.material}</dt><dd>{product.material}</dd></div>
          <div><dt>{copy.color}</dt><dd>{product.colors.join(' / ')}</dd></div>
          <div><dt>{copy.size}</dt><dd>{product.sizes.join(' / ')}</dd></div>
          <div><dt>{copy.moq}</dt><dd>{isApproved && price ? price.moq : `${copy.publicMoq} ${product.moqDefault}+ pcs`}</dd></div>
          <div><dt>{copy.leadTime}</dt><dd>{product.leadTime}</dd></div>
          <div><dt>{copy.origin}</dt><dd>{product.origin}</dd></div>
          <div><dt>{copy.exportable}</dt><dd>{product.isExportAvailable ? copy.yes : copy.no}</dd></div>
        </dl>

        {isApproved ? <>
          <div className="detail-price">
            <small>{copy.memberPrice}</small>
            <strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong>
            <span>MOQ {price.moq} / {price.market}</span>
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
          </div>
          <button className="primary-action" type="button" onClick={addSelectedItem}><Plus size={17} />{copy.add}</button>
          <p className="quote-note">{copy.note}</p>
        </> : <div className="approval-lock">
          <LockKeyhole size={19} />
          <strong>{copy.lockedTitle}</strong>
          <span>{copy.lockedBody}</span>
          <Link className="secondary-action" to={toLocalePath(accessLink)}>{copy.requestAccess}</Link>
        </div>}
      </div>
    </section>

    <section className="detail-guide">
      <article><h2>{copy.description}</h2><p>{description}</p></article>
      <article><h2>{copy.sizeGuide}</h2><p>{copy.note}</p></article>
      <article><h2>{copy.quoteGuide}</h2><p>{copy.note}</p></article>
    </section>

    {relatedProducts.length > 0 && <section className="related-products">
      <div className="section-heading"><h2>{copy.related}</h2></div>
      <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
    </section>}
  </main>
}
