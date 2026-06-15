import { LockKeyhole, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

function AccessNotice({ viewerState }) {
  const isPending = viewerState === 'pending'
  const { toLocalePath } = useLocalePath()
  return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{isPending ? '거래처 정보 확인 중입니다.' : '문의 리스트는 거래처 확인 후 이용할 수 있습니다.'}</h1><p>{isPending ? '가격, 합계, 견적 문의 기능은 담당자 확인 후 열립니다.' : '로그인하거나 거래처 문의 후 가격과 문의 리스트를 이용해주세요.'}</p><Link to={toLocalePath('/account')}>확인 상태 보기</Link></div></main>
}

export function InquiryListPage() {
  const { buyer, estimatedTotal, inquiryRows, isApproved, removeInquiryItem, totalQuantity, updateInquiryQuantity, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  return <main className="content"><div className="page-title"><div><p>문의 리스트</p><h1>선택한 피어싱</h1></div><span>{inquiryRows.length}개 상품 / {totalQuantity} pcs</span></div><section className="inquiry-layout"><div className="inquiry-items">{inquiryRows.map((row) => {
    const option = { color: row.color, size: row.size }
    const rowKey = `${row.productId}-${row.color}-${row.size}`
    return <article className="inquiry-row" key={rowKey}><div className={`mini-image tone-${row.tone}`}><span className="jewel-shape" />{row.thumbnailUrl && <img src={row.thumbnailUrl} alt={row.imageAlt?.ko ?? row.imageAlt?.en ?? row.productName} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}</div><div className="inquiry-product"><strong>{row.productName}</strong><span>{row.productCode}</span><small>{row.material} / {row.color} / {row.size}</small><small>MOQ {row.moq} / 거래 조건 {formatMoney(row.priceSnapshot, buyer.currency)}</small></div><div className="quantity"><button type="button" aria-label="수량 감소" onClick={() => updateInquiryQuantity(row.productId, row.quantity - row.moq, option)}><Minus size={14} /></button><input value={row.quantity} type="number" min={row.moq} step={row.moq} onChange={(event) => updateInquiryQuantity(row.productId, event.target.value, option)} /><button type="button" aria-label="수량 증가" onClick={() => updateInquiryQuantity(row.productId, row.quantity + row.moq, option)}><Plus size={14} /></button></div><b>{formatMoney(row.subtotal, buyer.currency)}</b><button className="remove" type="button" aria-label="상품 삭제" onClick={() => removeInquiryItem(row.productId, option)}><Trash2 size={16} /></button></article>
  })}</div><aside className="inquiry-summary"><h2>견적 요약</h2><dl><dt>상품 수</dt><dd>{inquiryRows.length}</dd><dt>총 수량</dt><dd>{totalQuantity}</dd><dt>예상 합계</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl><small>문의는 최종 주문이 아니며, 최종 재고와 단가는 Noblesse 확인 후 안내됩니다.</small><Link to={toLocalePath(inquiryRows.length ? '/request-quote' : '/inquiry-list')} className={inquiryRows.length ? '' : 'disabled'}>견적 문의</Link></aside></section></main>
}
