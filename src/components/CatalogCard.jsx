import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'

export function CatalogCard({ product }) {
  const { approvedPrice, buyer, isApproved } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const productName = getLocalizedProductName(product, locale)
  const productAlt = getLocalizedProductAlt(product, locale)
  const priceLabel = {
    kr: '승인 후 가격 확인 가능',
    en: 'Price available after approval',
    jp: '承認後に価格確認可能',
    cn: '批准后可查看价格',
  }[locale] ?? 'Price available after approval'
  const inquiryLabel = {
    kr: '견적 요청 가능',
    en: 'Quote request available',
    jp: '見積もり依頼可能',
    cn: '可申请报价',
  }[locale] ?? 'Quote request available'

  return <article className="catalog-card">
    <Link className="catalog-image" to={toLocalePath(`/products/${product.productId}`)} aria-label={productName}>
      {product.imageSet?.card && <img src={product.imageSet.card} alt={productAlt} loading="lazy" width="600" height="750" onError={(event) => { event.currentTarget.hidden = true }} />}
      <span className="home-product-heart" aria-hidden="true"><Heart size={18} /></span>
      <b>{product.badge}</b>
    </Link>
    <div className="catalog-body">
      <Link to={toLocalePath(`/products/${product.productId}`)}><h3>{productName}</h3></Link>
      <span className="catalog-card-note">{inquiryLabel}</span>
      <p>{product.material}</p>
      <strong>{isApproved ? formatMoney(approvedPrice(product.productId), buyer.currency) : priceLabel}</strong>
    </div>
  </article>
}
