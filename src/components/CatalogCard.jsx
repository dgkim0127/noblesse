import { Heart, LockKeyhole, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'

const cardCopy = {
  kr: {
    add: '제품 문의하기',
    locked: '거래 조건은 문의 후 안내',
    lockedButton: '거래처 문의 필요',
    minQty: 'MOQ',
    memberPrice: '거래 조건',
    unavailable: '가격 미등록',
  },
  en: {
    add: 'Ask about this product',
    locked: 'Trade terms after inquiry',
    lockedButton: 'Trade inquiry needed',
    minQty: 'Minimum qty',
    memberPrice: 'Trade terms',
    unavailable: 'Price unavailable',
  },
  jp: {
    add: 'この商品を問い合わせる',
    locked: '取引条件はお問い合わせ後にご案内',
    lockedButton: '取引先お問い合わせが必要',
    minQty: '最小数量',
    memberPrice: '取引条件',
    unavailable: '価格未登録',
  },
  cn: {
    add: '咨询此商品',
    locked: '交易条件将在咨询后提供',
    lockedButton: '需要贸易咨询',
    minQty: '最小数量',
    memberPrice: '交易条件',
    unavailable: '价格未登记',
  },
}

export function CatalogCard({ product }) {
  const { addInquiryItem, approvedPrice, getAdminPriceBooks, getPrice, isAdmin, isApproved } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const price = getPrice(product.productId)
  const copy = cardCopy[locale] ?? cardCopy.kr
  const adminPriceLabel = { kr: '관리자 가격', en: 'Admin prices', jp: '管理者価格', cn: '管理员价格' }[locale] ?? 'Admin prices'
  const productName = getLocalizedProductName(product, locale)
  const productAlt = getLocalizedProductAlt(product, locale)
  const canUseTradeTerms = isApproved && price
  const adminPriceBooks = isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const favoriteLabel = { kr: '좋아요', en: 'Favorite', jp: 'お気に入り', cn: '收藏' }[locale] ?? 'Favorite'
  return <article className="catalog-card">
    <div className="catalog-media">
      <Link className={`catalog-image tone-${product.tone}`} to={toLocalePath(`/products/${product.productId}`)} aria-label={productName}>
        <span className="jewel-shape" />
        {product.imageSet?.card && <img src={product.imageSet.card} alt={productAlt} loading="lazy" width="600" height="900" onError={(event) => { event.currentTarget.hidden = true }} />}
        {product.isNew && <b>NEW</b>}
      </Link>
      <div className="catalog-quick-actions" aria-label={`${productName} actions`}>
        <button className="catalog-quick-action" type="button" disabled={!canUseTradeTerms} onClick={() => addInquiryItem(product.productId)} title={canUseTradeTerms ? copy.add : copy.lockedButton} aria-label={canUseTradeTerms ? copy.add : copy.lockedButton}>
          <Plus size={17} />
        </button>
        <button className="catalog-quick-action" type="button" title={favoriteLabel} aria-label={favoriteLabel}>
          <Heart size={17} />
        </button>
      </div>
    </div>
    <div className="catalog-body">
      <small>{product.code}</small>
      <Link to={toLocalePath(`/products/${product.productId}`)}><h3>{productName}</h3></Link>
      <p>{product.material}</p>
      {adminPriceBooks.length > 0
        ? <div className="approved-price admin-price-books"><strong>{adminPriceLabel}</strong><span className="admin-price-book-grid">{adminPriceItems.map((item) => <span className="admin-price-book-item" key={item.currency}><img alt={item.flagLabel} className="admin-price-book-flag" src={item.flagSrc} /><span className="admin-price-book-value"><b>{item.amount}</b><span>{item.symbol}</span><em>{item.currency}</em></span></span>)}</span></div>
        : canUseTradeTerms ? <div className="approved-price"><strong>{formatMoney(approvedPrice(product.productId), price.currency)}</strong><span>{copy.minQty} {price.moq} / {copy.memberPrice} · {price.currency}</span></div> : <div className="locked-price"><LockKeyhole size={14} />{isApproved ? copy.unavailable : copy.locked}</div>}
    </div>
    <button className="add-inquiry" type="button" disabled={!canUseTradeTerms} onClick={() => addInquiryItem(product.productId)}><Plus size={16} />{canUseTradeTerms ? copy.add : copy.lockedButton}</button>
  </article>
}
