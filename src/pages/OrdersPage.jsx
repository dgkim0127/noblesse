import { PackageCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon } from '../utils/commerce'

const statusLabels = { requested: '주문 요청', checking: '확인 중', confirmed: '주문 확정', preparing: '출고 준비', shipped: '출고 완료', cancelled: '취소' }

export function OrdersPage() {
  const { orderId } = useParams()
  const { isApprovedMember, orders } = useCommerce()
  if (!isApprovedMember) return <main className="store-main"><div className="locked-page"><h1>내 주문은 승인 회원 전용입니다.</h1></div></main>
  const detail = orders.find((order) => order.id === orderId)
  return <main className="store-main"><div className="page-heading"><div><p>MY ORDERS</p><h1>{detail ? '주문 상세' : '내 주문'}</h1></div></div>{detail ? <section className="order-detail"><span className="order-status">{statusLabels[detail.status]}</span><h2>{detail.orderNumber}</h2>{detail.items.map((item) => <p key={`${item.productId}-${item.optionLabel}`}>{item.productName} · {item.optionLabel} · {item.quantity}개</p>)}<strong>{formatWon(detail.finalAmount)}</strong></section> : <div className="orders-list">{orders.map((order) => <a href={`/orders/${order.id}`} className="order-row" key={order.id}><PackageCheck size={20} /><div><strong>{order.orderNumber}</strong><span>{order.createdAtLabel} · 상품 {order.totalQuantity}개</span></div><em>{statusLabels[order.status]}</em><b>{formatWon(order.finalAmount)}</b></a>)}</div>}</main>
}
