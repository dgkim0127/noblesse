import { ChevronLeft, LockKeyhole, Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
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

function DetailImage({ product }) {
  const { locale } = useLocalePath()
  const productAlt = getLocalizedProductAlt(product, locale)
  const productName = getLocalizedProductName(product, locale)

  return <div className="detail-gallery">
    <div className={`detail-image tone-${product.tone}`}>
      <span className="jewel-shape" />
      {product.imageSet?.detail && <img src={product.imageSet.detail} alt={productAlt} loading="lazy" width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />}
    </div>
    <div className="detail-thumbs">
      {product.imageSet?.thumb && <div className={`detail-thumb tone-${product.tone}`}><span className="jewel-shape" /><img src={product.imageSet.thumb} alt={`${productName} 썸네일`} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} /></div>}
      {product.imageSet?.zoom && <a className="detail-thumb zoom-link" href={product.imageSet.zoom} target="_blank" rel="noreferrer">확대 이미지</a>}
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

  const relatedProducts = useMemo(() => product
    ? products.filter((item) => item.productId !== product.productId && item.categoryId === product.categoryId && item.isVisible).slice(0, 4)
    : [], [product, products])

  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>

  const activeColor = product.colors.includes(selectedColor) ? selectedColor : product.colors[0] ?? ''
  const activeSize = product.sizes.includes(selectedSize) ? selectedSize : product.sizes[0] ?? ''
  const productName = getLocalizedProductName(product, locale)
  const description = getLocalizedProductDescription(product, locale) ?? ''
  const moqLabel = isApproved && price ? price.moq : '확인 후 볼 수 있음'
  const fallbackMoqLabel = !isApproved && product.moqDefault ? `공개 기준 ${product.moqDefault}+ pcs` : ''
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? '확인 상태 보기' : '회원 신청'
  const currentQuantity = normalizeQuantity(quantity, moq)

  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, moq))
  const addSelectedItem = () => addInquiryItem(product.productId, { color: activeColor, size: activeSize }, currentQuantity)

  return <main className="content">
    <Link className="back" to={toLocalePath('/products')}><ChevronLeft size={17} />상품 목록으로</Link>
    <section className="detail">
      <DetailImage product={product} />
      <div className="detail-copy">
        <small>{product.code}</small>
        <h1>{productName}</h1>
        <p>{product.nameJa}</p>
        <p className="local-name">{product.nameKo}</p>
        <dl className="product-info-list">
          <div><dt>상품 코드</dt><dd>{product.code}</dd></div>
          <div><dt>재질</dt><dd>{product.material}</dd></div>
          <div><dt>컬러</dt><dd>{product.colors.join(' / ')}</dd></div>
          <div><dt>사이즈</dt><dd>{product.sizes.join(' / ')}</dd></div>
          <div><dt>최소 수량</dt><dd>{moqLabel}{fallbackMoqLabel && <small>{fallbackMoqLabel}</small>}</dd></div>
          <div><dt>리드타임</dt><dd>{product.leadTime}</dd></div>
          <div><dt>원산지</dt><dd>{product.origin}</dd></div>
          <div><dt>수출 가능</dt><dd>{product.isExportAvailable ? '가능' : '불가'}</dd></div>
        </dl>

        {isApproved ? <>
          <div className="detail-price">
            <small>회원가</small>
            <strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong>
            <span>최소 수량 {price.moq} / {price.market} 지역</span>
          </div>
          <OptionButtons label="컬러" options={product.colors} selected={activeColor} onSelect={setSelectedColor} />
          <OptionButtons label="사이즈" options={product.sizes} selected={activeSize} onSelect={setSelectedSize} />
          <div className="option-group">
            <span>수량</span>
            <div className="quantity-control">
              <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(currentQuantity - moq)}><Minus size={15} /></button>
              <input value={currentQuantity} type="number" min={moq} step={moq} onChange={(event) => updateQuantity(event.target.value)} onBlur={(event) => updateQuantity(event.target.value)} />
              <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(currentQuantity + moq)}><Plus size={15} /></button>
            </div>
            <small>수량은 최소 수량 단위로 조정됩니다: {moq} pcs.</small>
          </div>
          <button className="primary-action" type="button" onClick={addSelectedItem}><Plus size={17} />문의 리스트에 담기</button>
          <p className="quote-note">컬러, 사이즈, 수량 선택 후 견적 문의를 보내면 Noblesse가 재고와 최종 견적을 확인합니다.</p>
        </> : <div className="approval-lock">
          <LockKeyhole size={19} />
          <strong>회원 확인 후 가격 보기</strong>
          <span>{viewerState === 'pending' ? '현재 회원 확인 중입니다. 상품 정보는 확인 가능하며, 확인 후 문의 기능이 열립니다.' : '회원 확인 후 가격, 옵션 선택, 견적 문의 기능을 사용할 수 있습니다.'}</span>
          <Link className="secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>
        </div>}
      </div>
    </section>

    <section className="detail-guide">
      <article>
        <h2>상품 설명</h2>
        <p>{description}</p>
      </article>
      <article>
        <h2>사이즈 안내</h2>
        <p>피어싱 사이즈와 착용감은 디자인별로 다를 수 있습니다. 견적 문의 전 사이즈를 확인해주세요.</p>
      </article>
      <article>
        <h2>견적 안내</h2>
        <p>현재 단계는 최종 확정이 아닙니다. Noblesse가 재고, 리드타임, 최종 견적을 확인한 뒤 안내합니다.</p>
      </article>
    </section>

    <section className="related-products">
      <div className="section-heading">
        <div><p>관련 상품</p><h2>같은 카테고리 상품</h2></div>
        <Link to={toLocalePath(`/products?category=${product.categoryId}`)}>카테고리 보기</Link>
      </div>
      {relatedProducts.length > 0
        ? <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
        : <div className="empty related-empty">카테고리 상품이 추가되면 이 영역에 표시됩니다.</div>}
    </section>
  </main>
}
