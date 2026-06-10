import { LockKeyhole, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'

const cardCopy = {
  kr: {
    add: '문의 리스트에 담기',
    locked: '회원 확인 후 가격 보기',
    lockedButton: '회원 확인 필요',
    minQty: 'MOQ',
    memberPrice: '회원가',
  },
  en: {
    add: 'Add to Inquiry List',
    locked: 'Price after member review',
    lockedButton: 'Member review needed',
    minQty: 'Minimum qty',
    memberPrice: 'Approved pricing',
  },
  jp: {
    add: 'お問い合わせリストに追加',
    locked: '確認後に価格表示',
    lockedButton: '会員確認が必要',
    minQty: '最小数量',
    memberPrice: '会員価格',
  },
  cn: {
    add: '加入咨询清单',
    locked: '确认后查看价格',
    lockedButton: '需要会员确认',
    minQty: '最小数量',
    memberPrice: '会员价',
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
