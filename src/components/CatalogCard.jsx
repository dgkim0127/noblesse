import { LockKeyhole, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function CatalogCard({ product }) {
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved } = useCommerce()
  const price = getPrice(product.productId)
  return <article className="catalog-card">
    <Link className={`catalog-image tone-${product.tone}`} to={`/products/${product.productId}`} aria-label={product.nameEn}><span className="jewel-shape" />{product.isNew && <b>NEW</b>}</Link>
    <div className="catalog-body">
      <small>{product.code}</small>
      <Link to={`/products/${product.productId}`}><h3>{product.nameEn}</h3></Link>
      <p>{product.material}</p>
      {isApproved ? <div className="approved-price"><strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong><span>MOQ {price.moq} · Approved Buyer Price</span></div> : <div className="locked-price"><LockKeyhole size={14} />Price available after approval</div>}
    </div>
    <button className="add-inquiry" type="button" disabled={!isApproved} onClick={() => addInquiryItem(product.productId)}><Plus size={16} />{isApproved ? 'Add to Inquiry List' : 'Buyer Approval required'}</button>
  </article>
}
