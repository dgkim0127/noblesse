import { ChevronLeft, LockKeyhole, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved, products, viewerState } = useCommerce()
  const product = products.find((item) => item.productId === productId)
  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>
  const price = getPrice(product.productId)
  const description = product.descriptionEn ?? product.descriptionKo ?? ''
  const moqLabel = isApproved && price ? price.moq : product.moqDefault || 'Available after approval'
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? 'Approval Pending' : 'Request Buyer Access'

  return <main className="content"><Link className="back" to="/products"><ChevronLeft size={17} />Product List</Link><section className="detail"><div className={`detail-image tone-${product.tone}`}><span className="jewel-shape" />{product.imageSet?.detail && <img src={product.imageSet.detail} alt={product.imageAlt?.en ?? product.nameEn} loading="lazy" width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />}</div><div className="detail-copy"><small>{product.code}</small><h1>{product.nameEn}</h1><p>{product.nameJa}</p><dl className="product-info-list"><div><dt>Product Code</dt><dd>{product.code}</dd></div><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Colors</dt><dd>{product.colors.join(' / ')}</dd></div><div><dt>Sizes</dt><dd>{product.sizes.join(' / ')}</dd></div><div><dt>MOQ</dt><dd>{moqLabel}</dd></div><div><dt>Lead Time</dt><dd>{product.leadTime}</dd></div><div><dt>Origin</dt><dd>{product.origin}</dd></div><div><dt>Export Available</dt><dd>{product.isExportAvailable ? 'Available' : 'Unavailable'}</dd></div></dl>{description && <section className="product-description"><h2>Description</h2><p>{description}</p></section>}{isApproved ? <><div className="detail-price"><small>Approved Buyer Price</small><strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong><span>MOQ {price.moq} / Market {price.market}</span></div><button className="primary-action" type="button" onClick={() => addInquiryItem(product.productId)}><Plus size={17} />Add to Inquiry List</button></> : <div className="approval-lock"><LockKeyhole size={19} /><strong>Price available after approval</strong><span>Buyer Approval unlocks price details and Inquiry List access.</span><Link className="secondary-action" to={accessLink}>{accessLabel}</Link></div>}</div></section></main>
}
