import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon } from '../utils/commerce'

export function CartPage() {
  const { canOrder, cartRows, isApprovedMember, minOrderGap, minOrderProgress, orderTotal, removeFromCart, updateCartQty } = useCommerce()
  if (!isApprovedMember) return <main className="store-main"><div className="locked-page"><ShoppingCart size={26} /><h1>장바구니는 승인 회원 전용입니다.</h1><Link to="/login">로그인</Link></div></main>
  return (
    <main className="store-main">
      <div className="page-heading"><div><p>ORDER CART</p><h1>장바구니</h1></div><span>{cartRows.length}개 품목</span></div>
      <section className="cart-page-layout">
        <div className="cart-page-items">{cartRows.map((row) => <article className="cart-page-item" key={row.option.id}><div className={`cart-product-thumb ${row.product.tone}`} /><div><strong>{row.product.ko}</strong><span>{row.option.label}</span><small>MOQ {row.option.moq}개 단위</small></div><div className="qty-stepper"><button type="button" onClick={() => updateCartQty(row.option.id, row.qty - row.option.moq)}><Minus size={14} /></button><input value={row.qty} type="number" onChange={(event) => updateCartQty(row.option.id, event.target.value)} /><button type="button" onClick={() => updateCartQty(row.option.id, row.qty + row.option.moq)}><Plus size={14} /></button></div><strong>{formatWon(row.total)}</strong><button className="icon-trash" type="button" onClick={() => removeFromCart(row.option.id)} aria-label="상품 삭제"><Trash2 size={16} /></button></article>)}</div>
        <aside className="checkout-summary"><h2>주문 요약</h2><div className="progress-track"><span style={{ width: `${minOrderProgress}%` }} /></div><p>최소 주문금액 {minOrderProgress}%</p><strong>{formatWon(orderTotal)}</strong>{!canOrder && <small>{formatWon(minOrderGap)} 더 담으면 주문을 요청할 수 있습니다.</small>}<Link className={!canOrder ? 'disabled' : ''} to={canOrder ? '/order-request' : '/cart'}>주문 요청하기</Link></aside>
      </section>
    </main>
  )
}
