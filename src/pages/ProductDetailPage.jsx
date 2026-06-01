import { ChevronLeft, LockKeyhole, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon, getDiscountedPrice, normalizeQuantity } from '../utils/commerce'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { activeBuyer, addToCart, getProductOptions, isApprovedMember, products } = useCommerce()
  const product = products.find((item) => item.id === productId)
  const options = getProductOptions(productId)
  const [optionId, setOptionId] = useState(options[0]?.id ?? '')
  const selectedOption = useMemo(() => options.find((item) => item.id === optionId) ?? options[0], [optionId, options])
  const [quantity, setQuantity] = useState(selectedOption?.moq ?? 1)

  if (!product) return <main className="store-main"><div className="empty-state">상품을 찾을 수 없습니다.</div></main>
  const price = selectedOption ? getDiscountedPrice({ wholesale: selectedOption.baseWholesalePrice }, activeBuyer?.discount ?? 0) : 0
  const changeQty = (next) => setQuantity(normalizeQuantity(next, selectedOption?.moq ?? 1))

  return (
    <main className="store-main">
      <Link className="back-link" to="/products"><ChevronLeft size={17} />상품 목록</Link>
      <section className="detail-layout">
        <div className="detail-gallery"><div className={`product-thumb ${product.tone ?? 'silver'}`} aria-hidden="true"><span /></div></div>
        <div className="detail-info">
          <span className="product-code">{product.id}</span>
          <h1>{product.ko}</h1><p className="detail-ja">{product.ja}</p><p className="detail-description">{product.description}</p>
          {isApprovedMember ? (
            <>
              <div className="detail-price"><span>회원 전용가</span><strong>{formatWon(price)}</strong><em>거래처 할인 {activeBuyer.discount}% 적용</em></div>
              <label className="option-select"><span>옵션 선택</span><select value={optionId} onChange={(event) => { setOptionId(event.target.value); const next = options.find((item) => item.id === event.target.value); setQuantity(next?.moq ?? 1) }}>{options.map((option) => <option key={option.id} value={option.id}>{option.label} · MOQ {option.moq} · {option.stockStatus === 'in_stock' ? '판매중' : option.stockStatus === 'ask' ? '문의 필요' : '품절'}</option>)}</select></label>
              <div className="detail-quantity"><span>수량</span><div><button type="button" onClick={() => changeQty(quantity - selectedOption.moq)}><Minus size={15} /></button><input value={quantity} type="number" onChange={(event) => changeQty(event.target.value)} /><button type="button" onClick={() => changeQty(quantity + selectedOption.moq)}><Plus size={15} /></button></div></div>
              <button className="detail-cart-button" disabled={selectedOption?.stockStatus === 'sold_out'} type="button" onClick={() => addToCart(product.id, selectedOption.id)}><ShoppingCart size={18} />장바구니 담기</button>
            </>
          ) : (
            <div className="detail-locked"><LockKeyhole size={20} /><strong>회원 승인 후 가격과 주문 조건을 확인할 수 있습니다.</strong><Link to="/register">거래처 회원 신청</Link></div>
          )}
        </div>
      </section>
    </main>
  )
}
