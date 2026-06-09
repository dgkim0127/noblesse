import { ChevronLeft, LockKeyhole, Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

function DetailImage({ product }) {
  return <div className="detail-gallery">
    <div className={`detail-image tone-${product.tone}`}>
      <span className="jewel-shape" />
      {product.imageSet?.detail && <img src={product.imageSet.detail} alt={product.imageAlt?.en ?? product.nameEn} loading="lazy" width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />}
    </div>
    <div className="detail-thumbs">
      {product.imageSet?.thumb && <div className={`detail-thumb tone-${product.tone}`}><span className="jewel-shape" /><img src={product.imageSet.thumb} alt={`${product.nameEn} thumbnail`} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} /></div>}
      {product.imageSet?.zoom && <a className="detail-thumb zoom-link" href={product.imageSet.zoom} target="_blank" rel="noreferrer">Zoom image</a>}
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
  const description = product.descriptionEn ?? product.descriptionKo ?? product.descriptionJa ?? ''
  const moqLabel = isApproved && price ? price.moq : 'Available after approval'
  const fallbackMoqLabel = !isApproved && product.moqDefault ? `Public guide ${product.moqDefault}+ pcs` : ''
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? 'Approval Pending' : 'Request Buyer Access'
  const currentQuantity = normalizeQuantity(quantity, moq)

  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, moq))
  const addSelectedItem = () => addInquiryItem(product.productId, { color: activeColor, size: activeSize }, currentQuantity)

  return <main className="content">
    <Link className="back" to="/products"><ChevronLeft size={17} />Back to Product List</Link>
    <section className="detail">
      <DetailImage product={product} />
      <div className="detail-copy">
        <small>{product.code}</small>
        <h1>{product.nameEn}</h1>
        <p>{product.nameJa}</p>
        <p className="local-name">{product.nameKo}</p>
        <dl className="product-info-list">
          <div><dt>Product Code</dt><dd>{product.code}</dd></div>
          <div><dt>Material</dt><dd>{product.material}</dd></div>
          <div><dt>Colors</dt><dd>{product.colors.join(' / ')}</dd></div>
          <div><dt>Sizes</dt><dd>{product.sizes.join(' / ')}</dd></div>
          <div><dt>MOQ</dt><dd>{moqLabel}{fallbackMoqLabel && <small>{fallbackMoqLabel}</small>}</dd></div>
          <div><dt>Lead Time</dt><dd>{product.leadTime}</dd></div>
          <div><dt>Origin</dt><dd>{product.origin}</dd></div>
          <div><dt>Export Available</dt><dd>{product.isExportAvailable ? 'Available' : 'Unavailable'}</dd></div>
        </dl>

        {isApproved ? <>
          <div className="detail-price">
            <small>Approved Buyer Price</small>
            <strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong>
            <span>MOQ {price.moq} / Market {price.market}</span>
          </div>
          <OptionButtons label="Color" options={product.colors} selected={activeColor} onSelect={setSelectedColor} />
          <OptionButtons label="Size" options={product.sizes} selected={activeSize} onSelect={setSelectedSize} />
          <div className="option-group">
            <span>Quantity</span>
            <div className="quantity-control">
              <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(currentQuantity - moq)}><Minus size={15} /></button>
              <input value={currentQuantity} type="number" min={moq} step={moq} onChange={(event) => updateQuantity(event.target.value)} onBlur={(event) => updateQuantity(event.target.value)} />
              <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(currentQuantity + moq)}><Plus size={15} /></button>
            </div>
            <small>Quantity adjusts by MOQ units: {moq} pcs.</small>
          </div>
          <button className="primary-action" type="button" onClick={addSelectedItem}><Plus size={17} />Add to Inquiry List</button>
          <p className="quote-note">Request Quote after selecting color, size, and quantity. Noblesse will confirm availability and final quote.</p>
        </> : <div className="approval-lock">
          <LockKeyhole size={19} />
          <strong>Price available after approval</strong>
          <span>{viewerState === 'pending' ? 'Your Buyer Approval is pending. Options can be reviewed now, and Inquiry access unlocks after approval.' : 'Buyer Approval unlocks price details, option selection for Inquiry, and Request Quote access.'}</span>
          <Link className="secondary-action" to={accessLink}>{accessLabel}</Link>
        </div>}
      </div>
    </section>

    <section className="detail-guide">
      <article>
        <h2>Product Description</h2>
        <p>{description}</p>
      </article>
      <article>
        <h2>Size Guide</h2>
        <p>Piercing size and fit may vary by design. Please confirm size before Request Quote.</p>
      </article>
      <article>
        <h2>Shipping / Quote Guide</h2>
        <p>This is not a final order. Noblesse will confirm availability, lead time, and final quote after Request Quote.</p>
      </article>
    </section>

    <section className="related-products">
      <div className="section-heading">
        <div><p>RELATED PRODUCTS</p><h2>More from this category</h2></div>
        <Link to={`/products?category=${product.categoryId}`}>View category</Link>
      </div>
      {relatedProducts.length > 0
        ? <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
        : <div className="empty related-empty">Related products will appear here as this category expands.</div>}
    </section>
  </main>
}
