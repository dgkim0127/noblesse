import { LockKeyhole, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'

const cardCopy = {
  kr: {
    add: '제품 문의하기',
    locked: '거래 조건은 문의 후 안내',
    lockedButton: '거래처 문의 필요',
    minQty: 'MOQ',
    memberPrice: '거래 조건',
  },
  en: {
    add: 'Ask about this product',
    locked: 'Trade terms after inquiry',
    lockedButton: 'Trade inquiry needed',
    minQty: 'Minimum qty',
    memberPrice: 'Trade terms',
  },
  jp: {
    add: 'この商品を問い合わせる',
    locked: '取引条件はお問い合わせ後にご案内',
    lockedButton: '取引先お問い合わせが必要',
    minQty: '最小数量',
    memberPrice: '取引条件',
  },
  cn: {
    add: '咨询此商品',
    locked: '交易条件将在咨询后提供',
    lockedButton: '需要贸易咨询',
    minQty: '最小数量',
    memberPrice: '交易条件',
  },
}

export function CatalogCard({ product }) {
  const { addInquiryItem, approvedPrice, buyer, getPrice, isApproved } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const price = getPrice(product.productId)
  const copy = cardCopy[locale] ?? cardCopy.kr
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
      {isApproved ? <div className="approved-price"><strong>{formatMoney(approvedPrice(product.productId), buyer.currency)}</strong><span>{copy.minQty} {price.moq} / {copy.memberPrice}</span></div> : <div className="locked-price"><LockKeyhole size={14} />{copy.locked}</div>}
    </div>
    <button className="add-inquiry" type="button" disabled={!isApproved} onClick={() => addInquiryItem(product.productId)}><Plus size={16} />{isApproved ? copy.add : copy.lockedButton}</button>
  </article>
}
