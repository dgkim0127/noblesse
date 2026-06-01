import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon } from '../utils/commerce'

export function OrderRequestPage() {
  const navigate = useNavigate()
  const { canOrder, cartRows, orderTotal, submitOrder } = useCommerce()
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')
  const send = async () => { try { const order = await submitOrder(memo); navigate(`/orders/${order.id}`) } catch (reason) { setError(reason.message) } }
  if (!canOrder) return <main className="store-main"><div className="locked-page"><h1>주문 요청 조건을 먼저 확인해주세요.</h1><Link to="/cart">장바구니로 돌아가기</Link></div></main>
  return <main className="store-main"><div className="page-heading"><div><p>ORDER REQUEST</p><h1>주문 요청 확인</h1></div></div><section className="request-card"><ClipboardCheck size={26} /><h2>관리자 확인 후 주문이 확정됩니다.</h2><div>{cartRows.map((row) => <p key={row.option.id}>{row.product.ko} · {row.option.label} · {row.qty}개</p>)}</div><strong>{formatWon(orderTotal)}</strong><textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="요청사항을 입력해주세요." />{error && <small>{error}</small>}<button type="button" onClick={send}>주문 요청 제출</button></section></main>
}
