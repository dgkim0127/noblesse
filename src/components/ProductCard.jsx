import { EyeOff, ShoppingCart } from 'lucide-react'
import { SALE_STATUS } from '../data/catalog'
import { formatWon, getDiscountedPrice } from '../utils/commerce'
import { PriceBlock } from './PriceBlock'
import { StatusBadge } from './StatusBadge'

export function ProductCard({ adjustedRate, buyerDiscount, onAdd, product, rank }) {
  const isLive = product.status === SALE_STATUS
  const discounted = getDiscountedPrice(product, buyerDiscount)
  const discountRate = product.retail ? Math.max(0, Math.round((1 - discounted / product.retail) * 100)) : 0

  return (
    <article className={isLive ? 'product-card' : 'product-card unavailable'}>
      <div className="product-media">
        {product.imageUrl ? (
          <img alt={product.ko} src={product.imageUrl} />
        ) : (
          <div className={`product-thumb ${product.tone ?? 'silver'}`} aria-hidden="true">
            <span />
          </div>
        )}
        <StatusBadge status={product.status} />
        <span className="rank-badge">#{product.rank ?? rank}</span>
        {product.isNew && <span className="new-badge">NEW</span>}
      </div>

      <div className="product-info">
        <span className="product-code">{product.id}</span>
        <h2>{product.ko}</h2>
        <p>{product.ja}</p>
      </div>

      <div className="spec-list" aria-label="상품 스펙">
        <span>{product.category}</span>
        <span>{product.material}</span>
        <span>{product.size}</span>
        <span>{product.gauge}</span>
      </div>

      <div className="card-footer">
        <div>
          <span className="member-price-label">회원 도매가</span>
          <span className="retail-reference">{formatWon(product.retail)}</span>
          <PriceBlock approvedMode krw={discounted} jpy={discounted / adjustedRate} />
        </div>
        <div className="deal-meta">
          <span>{discountRate}%</span>
          <em>MOQ {product.moq}개</em>
        </div>
      </div>

      <button className="add-button" type="button" disabled={!isLive} onClick={onAdd}>
        {isLive ? (
          <>
            <ShoppingCart size={17} />
            담기
          </>
        ) : (
          <>
            <EyeOff size={17} />
            주문 불가
          </>
        )}
      </button>
    </article>
  )
}
