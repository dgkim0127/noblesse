import { ClipboardList, Minus, Plus, ShoppingCart } from 'lucide-react'
import { formatWon, formatYen } from '../utils/commerce'

export function CartSummaryCard({
  adjustedRate,
  canOrder,
  cartRows,
  minOrderGap,
  minOrderProgress,
  orderMessage,
  orderTotal,
  removeFromCart,
  updateCartQty,
  onSendOrder,
}) {
  return (
    <aside className="cart-summary-card" aria-label="장바구니 요약">
      <div className="cart-panel-title">
        <div>
          <span>Cart</span>
          <h2>장바구니 요약</h2>
        </div>
        <ShoppingCart size={20} />
      </div>

      <div className="minimum-progress">
        <div>
          <span>최소주문 진행률</span>
          <strong>{minOrderProgress}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${minOrderProgress}%` }} />
        </div>
      </div>

      <div className="cart-items compact">
        {cartRows.slice(0, 3).map((row) => (
          <div className="cart-item" key={row.product.id}>
            <div>
              <strong>{row.product.ko}</strong>
              <span>{row.product.id} · MOQ {row.product.moq}</span>
            </div>
            <div className="qty-stepper">
              <button type="button" onClick={() => updateCartQty(row.product.id, row.qty - row.product.moq)}>
                <Minus size={14} />
              </button>
              <input
                aria-label={`${row.product.ko} 수량`}
                min={row.product.moq}
                step={row.product.moq}
                type="number"
                value={row.qty}
                onChange={(event) => updateCartQty(row.product.id, event.target.value)}
              />
              <button type="button" onClick={() => updateCartQty(row.product.id, row.qty + row.product.moq)}>
                <Plus size={14} />
              </button>
            </div>
            <div className="cart-item-total">
              <strong>{formatWon(row.total)}</strong>
              <button type="button" onClick={() => removeFromCart(row.product.id)}>
                삭제
              </button>
            </div>
          </div>
        ))}

        {cartRows.length === 0 && (
          <div className="cart-empty">
            <ShoppingCart size={22} />
            <span>담긴 상품이 없습니다.</span>
          </div>
        )}
      </div>

      <div className="order-summary">
        <div>
          <span>예상 합계</span>
          <strong>{formatWon(orderTotal)}</strong>
          <em>{formatYen(orderTotal / adjustedRate)} · JPY参考価格</em>
        </div>

        {!canOrder && <p className="minimum-warning">최소 주문금액까지 {formatWon(minOrderGap)} 남았습니다.</p>}

        {orderMessage && <p className="order-message">{orderMessage}</p>}

        <button className="checkout-button" type="button" disabled={!canOrder} onClick={onSendOrder}>
          <ClipboardList size={17} />
          주문 요청 보내기
        </button>
      </div>
    </aside>
  )
}
