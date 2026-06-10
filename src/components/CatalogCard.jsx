import { LockKeyhole, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'

export function CatalogCard({ product }) {
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const price = getPrice(product.productId)
  const productName = getLocalizedProductName(product, locale)
  const productAlt = getLocalizedProductAlt(product, locale)
  return <article className="catalog-card">
    <Link className={`catalog-image tone-${product.tone}`} to={toLocalePath(`/products/${product.productId}`)} aria-label={productName}>
      <span className="jewel-shape" />
      {product.imageSet?.card && <img src={product.imageSet.card} alt={productAlt} loading="lazy" width="600" height="600" onError={(event) => { event.currentTarget.hidden = true }} />}
      {product.isNew && <b>NEW</b>}
    </Link>
    <div className="catalog-body">
      <small>{product.code}</small>
      <Link to={toLocalePath(`/products/${product.productId}`)}><h3>{productName}</h3></Link>
      <p>{product.material}</p>
      {isApproved ? <div className="approved-price"><strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong><span>최소 수량 {price.moq} / 회원가</span></div> : <div className="locked-price"><LockKeyhole size={14} />회원 확인 후 가격 보기</div>}
    </div>
    <button className="add-inquiry" type="button" disabled={!isApproved} onClick={() => addInquiryItem(product.productId)}><Plus size={16} />{isApproved ? '문의 리스트에 담기' : '회원 확인 필요'}</button>
  </article>
}
