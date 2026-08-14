import { ClipboardList, LockKeyhole, Minus, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

function AccessNotice({ viewerState }) {
  const isPending = viewerState === 'pending'
  const { toLocalePath } = useLocalePath()

  return (
    <main className="content">
      <div className="approval-page">
        <LockKeyhole size={25} />
        <h1>{isPending ? '회원 확인 중입니다.' : '견적 리스트는 회원 확인 후 이용할 수 있습니다.'}</h1>
        <p>
          {isPending
            ? '가격, 합계, 견적 요청 기능은 승인 후 열립니다.'
            : '로그인하거나 회원 신청 후 가격과 견적 리스트를 이용해주세요.'}
        </p>
        <Link to={toLocalePath('/account')}>회원 상태 보기</Link>
      </div>
    </main>
  )
}

export function InquiryListPage() {
  const {
    buyer,
    clearInquiryItems,
    estimatedTotal,
    inquiryRows,
    isApproved,
    removeInquiryItem,
    totalQuantity,
    updateInquiryQuantity,
    viewerState,
  } = useCommerce()
  const { toLocalePath } = useLocalePath()

  if (!isApproved) return <AccessNotice viewerState={viewerState} />

  const hasItems = inquiryRows.length > 0
  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <main className="content inquiry-list-page">
      <div className="quote-cart-heading">
        <div className="quote-cart-breadcrumb">
          <Link to={toLocalePath('/')}>홈</Link>
          <span>/</span>
          <strong>견적 리스트</strong>
        </div>
        <h1>견적 리스트</h1>
        <p>담아둔 상품을 확인하고 필요한 수량을 조정한 뒤 견적 요청서를 작성하세요.</p>
      </div>

      <section className="quote-cart-panel" aria-label="견적 리스트 상품">
        <div className="quote-cart-meta">
          <strong>국내·해외 B2B 견적 상품 ({inquiryRows.length})</strong>
          <span>담긴 상품은 견적 요청 전까지 자유롭게 수정할 수 있습니다.</span>
        </div>

        <div className="quote-cart-table">
          <div className="quote-cart-row quote-cart-head" role="row">
            <span>번호</span>
            <span>사진</span>
            <span>상품명</span>
            <span>수량</span>
            <span>예상 금액</span>
            <span>삭제</span>
          </div>

          {hasItems ? inquiryRows.map((row, index) => {
            const option = { color: row.color, size: row.size }
            const rowKey = `${row.productId}-${row.color}-${row.size}`

            return (
              <article className="quote-cart-row quote-cart-item" key={rowKey}>
                <span className="quote-cart-number">{index + 1}</span>
                <div className={`quote-cart-thumb tone-${row.tone}`}>
                  <span className="jewel-shape" />
                  {row.thumbnailUrl && (
                    <img
                      src={row.thumbnailUrl}
                      alt={row.imageAlt?.ko ?? row.imageAlt?.en ?? row.productName}
                      loading="lazy"
                      width="300"
                      height="300"
                      onError={(event) => { event.currentTarget.hidden = true }}
                    />
                  )}
                </div>
                <div className="quote-cart-product">
                  <strong>{row.productName}</strong>
                  <span>{row.productCode}</span>
                  <small>{row.material} / {row.color} / {row.size}</small>
                  <small>최소 수량 {row.moq} / 승인가 {formatMoney(row.priceSnapshot, buyer.currency)}</small>
                </div>
                <div className="quantity quote-cart-quantity">
                  <button
                    type="button"
                    aria-label="수량 감소"
                    onClick={() => updateInquiryQuantity(row.productId, row.quantity - row.moq, option)}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    value={row.quantity}
                    type="number"
                    min={row.moq}
                    step={row.moq}
                    onChange={(event) => updateInquiryQuantity(row.productId, event.target.value, option)}
                  />
                  <button
                    type="button"
                    aria-label="수량 증가"
                    onClick={() => updateInquiryQuantity(row.productId, row.quantity + row.moq, option)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <b className="quote-cart-price">{formatMoney(row.subtotal, buyer.currency)}</b>
                <button
                  className="remove quote-cart-remove"
                  type="button"
                  aria-label="상품 삭제"
                  onClick={() => removeInquiryItem(row.productId, option)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            )
          }) : (
            <div className="quote-cart-empty">
              <ClipboardList size={34} />
              <strong>견적 리스트에 담긴 상품이 없습니다.</strong>
              <p>상품을 둘러보고 필요한 피어싱을 견적 리스트에 담아보세요.</p>
            </div>
          )}
        </div>

        <div className="quote-cart-actions">
          <Link className={`quote-cart-primary ${hasItems ? '' : 'disabled'}`} to={toLocalePath(hasItems ? '/request-quote' : '/inquiry-list')}>
            견적 요청서 작성
          </Link>
          <Link className="quote-cart-secondary" to={toLocalePath('/products')}>
            상품 목록 계속 보기
          </Link>
          <button className="quote-cart-secondary" type="button" disabled={!hasItems} onClick={clearInquiryItems}>
            견적 리스트 비우기
          </button>
          <button className="quote-cart-secondary" type="button" disabled={!hasItems} onClick={handlePrint}>
            <Printer size={16} />
            견적서 출력
          </button>
        </div>

        <div className="quote-cart-summary">
          <dl>
            <div>
              <dt>상품 수</dt>
              <dd>{inquiryRows.length}</dd>
            </div>
            <div>
              <dt>총 수량</dt>
              <dd>{totalQuantity}</dd>
            </div>
            <div>
              <dt>예상 합계</dt>
              <dd>{formatMoney(estimatedTotal, buyer.currency)}</dd>
            </div>
          </dl>
          <p>최종 재고와 단가는 Noblesse 확인 후 안내됩니다.</p>
        </div>
      </section>

      <section className="quote-cart-guide" aria-label="견적 리스트 이용 안내">
        <h2>이용 안내</h2>
        <ul>
          <li>견적 리스트는 확정 거래 화면이 아니며, 거래 조건 확인을 위한 요청 단계입니다.</li>
          <li>요청서 제출 후 Noblesse가 재고, 단가, 납기 가능 여부를 확인해 안내합니다.</li>
          <li>승인된 바이어는 견적 리스트에서 수량을 조정하고 요청서를 작성할 수 있습니다.</li>
          <li>상품 이미지는 참고용이며 실제 색상과 디테일은 생산 시점에 따라 달라질 수 있습니다.</li>
        </ul>
      </section>

      <button className="quote-cart-refresh" type="button" onClick={() => window.location.reload()}>
        <RotateCcw size={16} />
        새로고침
      </button>
    </main>
  )
}
