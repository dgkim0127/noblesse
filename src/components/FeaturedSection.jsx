import { formatWon, formatYen, getDiscountedPrice } from '../utils/commerce'

export function FeaturedSection({ adjustedRate, buyerDiscount, onAdd, section }) {
  const Icon = section.icon

  return (
    <article className="feed-section">
      <div className="feed-title">
        <div>
          <Icon size={17} />
          <h2>{section.title}</h2>
        </div>
        <button type="button">더보기</button>
      </div>
      <div className="mini-product-strip image-first">
        {section.products.map((product, index) => (
          <button className="mini-product-card" key={`${section.id}-${product.id}`} type="button" onClick={() => onAdd(product.id)}>
            <div className={`mini-thumb ${product.tone ?? 'silver'}`} aria-hidden="true">
              <span>{index + 1}</span>
            </div>
            <strong>{product.ko}</strong>
            <em>{formatWon(getDiscountedPrice(product, buyerDiscount))}</em>
            <small>{formatYen(getDiscountedPrice(product, buyerDiscount) / adjustedRate)}</small>
          </button>
        ))}
      </div>
    </article>
  )
}
