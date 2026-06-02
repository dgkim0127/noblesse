import { ChevronLeft, LockKeyhole, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved, products } = useCommerce()
  const product = products.find((item) => item.productId === productId)
  if (!product) return <main className="content"><div className="empty">Product not found.</div></main>
  const price = getPrice(product.productId)
  return <main className="content"><Link className="back" to="/products"><ChevronLeft size={17} />Product List</Link><section className="detail"><div className={`detail-image tone-${product.tone}`}><span className="jewel-shape" />{product.imageSet?.detail && <img src={product.imageSet.detail} alt={product.imageAlt?.en ?? product.nameEn} width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />}</div><div className="detail-copy"><small>{product.code}</small><h1>{product.nameEn}</h1><p>{product.nameJa}</p><div className="detail-specs"><span>{product.material}</span><span>{product.colors.join(' / ')}</span><span>{product.sizes.join(' / ')}</span><span>{product.leadTime}</span></div>{isApproved ? <><div className="detail-price"><small>Approved Buyer Price</small><strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong><span>MOQ {price.moq} / Market {price.market}</span></div><button className="primary-action" type="button" onClick={() => addInquiryItem(product.productId)}><Plus size={17} />Add to Inquiry List</button></> : <div className="approval-lock"><LockKeyhole size={19} /><strong>Price available after approval</strong><span>Buyer Approval unlocks price details and Inquiry List access.</span></div>}</div></section></main>
}
