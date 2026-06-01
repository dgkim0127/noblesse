import { LockKeyhole, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon, getDiscountedPrice } from '../utils/commerce'

export function CatalogCard({ product, compact = false }) {
  const { activeBuyer, addToCart, getProductOptions, isApprovedMember } = useCommerce()
  const option = getProductOptions(product.id)[0]
  const price = option ? getDiscountedPrice({ wholesale: option.baseWholesalePrice }, activeBuyer?.discount ?? 0) : 0

  return (
    <article className={`retail-product-card ${compact ? 'compact' : ''}`}>
      <Link className="retail-media" to={`/products/${product.id}`}>
        <div className={`product-thumb ${product.tone ?? 'silver'}`} aria-hidden="true"><span /></div>
        {product.isNew && <span className="new-badge">NEW</span>}
      </Link>
      <div className="retail-card-body">
        <span className="product-code">{product.id}</span>
        <Link to={`/products/${product.id}`}><h3>{product.ko}</h3></Link>
        {isApprovedMember ? (
          <>
            <strong className="retail-price">{formatWon(price)}</strong>
            <small>MOQ {option?.moq ?? product.moq}개 · 회원 전용가</small>
          </>
        ) : (
          <div className="locked-price"><LockKeyhole size={14} /> 승인 후 회원가 공개</div>
        )}
      </div>
      <button className="quick-cart" type="button" disabled={!isApprovedMember} onClick={() => addToCart(product.id, option?.id)}>
        <ShoppingCart size={16} />
        {isApprovedMember ? '담기' : '회원 전용'}
      </button>
    </article>
  )
}
