import { ChevronLeft, LockKeyhole, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved, products, viewerState } = useCommerce()
  const product = products.find((item) => item.productId === productId)
  const [color, setColor] = useState(product?.colors?.[0] ?? '')
  const [size, setSize] = useState(product?.sizes?.[0] ?? '')
  const price = product ? getPrice(product.productId) : null
  const [quantity, setQuantity] = useState(price?.moq ?? product?.moqDefault ?? 1)
  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>
  const moq = price?.moq ?? product.moqDefault ?? 1
  const safeQuantity = Math.max(moq, Math.ceil((Number(quantity) || moq) / moq) * moq)
  const description = product.descriptionEn ?? product.descriptionKo ?? ''
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  return <main className="content"><Link className="back" to="/products"><ChevronLeft size={17} />Product List</Link><section className="detail"><div className={`detail-image tone-${product.tone}`}><span className="jewel-shape" />{product.imageSet?.detail && <img alt={product.imageAlt?.en ?? product.nameEn} height="1200" loading="eager" src={product.imageSet.detail} width="1200" />}</div><div className="detail-copy"><small>{product.code}</small><h1>{product.nameEn}</h1><p>{product.nameJa}</p><dl className="product-info-list"><div><dt>Product Code</dt><dd>{product.code}</dd></div><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>MOQ</dt><dd>{isApproved ? moq : 'Available after approval'}</dd></div><div><dt>Lead Time</dt><dd>{product.leadTime}</dd></div><div><dt>Origin</dt><dd>{product.origin}</dd></div></dl>{description && <section className="product-description"><h2>Description</h2><p>{description}</p></section>}{isApproved ? <><div className="detail-price"><small>Approved Buyer Price</small><strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong><span>MOQ {moq} / Market {price?.market}</span></div><div className="product-options"><span>Color</span><div>{product.colors.map((option) => <button className={color === option ? 'active' : ''} key={option} type="button" onClick={() => setColor(option)}>{option}</button>)}</div><span>Size</span><div>{product.sizes.map((option) => <button className={size === option ? 'active' : ''} key={option} type="button" onClick={() => setSize(option)}>{option}</button>)}</div><span>Quantity</span><div className="quantity-control"><button aria-label="Decrease quantity" type="button" onClick={() => setQuantity(safeQuantity - moq)}><Minus size={15} /></button><input min={moq} step={moq} type="number" value={safeQuantity} onChange={(event) => setQuantity(event.target.value)} /><button aria-label="Increase quantity" type="button" onClick={() => setQuantity(safeQuantity + moq)}><Plus size={15} /></button></div></div><button className="primary-action" type="button" onClick={() => addInquiryItem(product.productId, { color, size }, safeQuantity)}><Plus size={17} />Add to Inquiry List</button></> : <div className="approval-lock"><LockKeyhole size={19} /><strong>Price available after approval</strong><span>Buyer Approval unlocks market prices and Request Quote.</span><Link className="secondary-action" to={accessLink}>{viewerState === 'pending' ? 'Approval Pending' : 'Request Buyer Access'}</Link></div>}</div></section></main>
}
