import { ArrowRight, LockKeyhole, Minus, PackageCheck, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocaleContentKey, getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'
import { imagePresentationStyle } from '../utils/productImageGallery'

const inquiryListCopy = {
  kr: {
    accessPendingTitle: '거래처 정보를 확인 중입니다.',
    accessPendingBody: '가격, 합계, 견적 요청 기능은 담당자 확인 후 열립니다.',
    accessGuestTitle: '견적 리스트는 거래처 승인 후 이용할 수 있습니다.',
    accessGuestBody: '로그인하거나 거래처 신청 후 가격과 견적 리스트를 이용해주세요.',
    accountStatus: '확인 상태 보기',
    loadingTitle: '견적 리스트를 준비하고 있습니다.',
    loadingBody: '승인된 거래처 정보와 가격을 확인하고 있습니다.',
    dataErrorTitle: '견적 리스트를 불러오지 못했습니다.',
    dataErrorBody: '카탈로그 데이터를 다시 확인해주세요.',
    authErrorTitle: '거래처 세션을 확인하지 못했습니다.',
    authErrorBody: '로그인 상태를 확인한 뒤 다시 시도해주세요.',
    breadcrumb: '상품 검토',
    kicker: 'Inquiry List',
    title: '견적 리스트',
    subtitle: '담아둔 상품의 옵션과 수량을 확인한 뒤 견적 요청서로 이어집니다.',
    listTitle: '담은 상품',
    listDescription: '수량은 MOQ 단위로 조정됩니다.',
    itemCount: (items, quantity) => `${items}개 상품 / ${quantity} pcs`,
    emptyTitle: '담긴 상품이 없습니다.',
    emptyBody: '상품 상세에서 승인된 가격을 확인하고 견적 리스트에 담아주세요.',
    browseProducts: '상품 보러가기',
    product: '상품',
    condition: '거래 조건',
    quantity: '수량',
    subtotal: '소계',
    remove: '삭제',
    decrease: '수량 감소',
    increase: '수량 증가',
    moq: 'MOQ',
    market: '시장',
    unitPrice: '승인 단가',
    summaryTitle: '견적 요약',
    summaryItems: '상품 수',
    summaryQuantity: '총 수량',
    summaryTotal: '예상 합계',
    notice: '견적 요청은 최종 거래 확정이 아니며 재고, 가격, 납기는 Noblesse 확인 후 안내됩니다.',
    requestQuote: '견적 요청하기',
    disabledCta: '상품을 먼저 담아주세요',
  },
  en: {
    accessPendingTitle: 'Buyer information is under review.',
    accessPendingBody: 'Pricing, totals, and quote requests open after approval.',
    accessGuestTitle: 'Inquiry List is available after buyer approval.',
    accessGuestBody: 'Please sign in or request buyer access to use prices and Inquiry List.',
    accountStatus: 'View approval status',
    loadingTitle: 'Preparing your Inquiry List.',
    loadingBody: 'Checking approved buyer information and prices.',
    dataErrorTitle: 'Unable to load Inquiry List.',
    dataErrorBody: 'Please refresh the catalog data and try again.',
    authErrorTitle: 'Unable to verify buyer session.',
    authErrorBody: 'Please check your sign-in status and try again.',
    breadcrumb: 'Product review',
    kicker: 'Inquiry List',
    title: 'Inquiry List',
    subtitle: 'Review selected products, options, and quantities before requesting a quote.',
    listTitle: 'Selected products',
    listDescription: 'Quantities are adjusted by MOQ.',
    itemCount: (items, quantity) => `${items} products / ${quantity} pcs`,
    emptyTitle: 'No products selected.',
    emptyBody: 'Open a product detail page and add approved buyer items to the Inquiry List.',
    browseProducts: 'Browse products',
    product: 'Product',
    condition: 'Terms',
    quantity: 'Quantity',
    subtotal: 'Subtotal',
    remove: 'Remove',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    moq: 'MOQ',
    market: 'Market',
    unitPrice: 'Approved price',
    summaryTitle: 'Quote summary',
    summaryItems: 'Products',
    summaryQuantity: 'Total quantity',
    summaryTotal: 'Estimated total',
    notice: 'A quote request is not a final trade confirmation. Stock, price, and lead time are confirmed by Noblesse.',
    requestQuote: 'Request quote',
    disabledCta: 'Add products first',
  },
  jp: {
    accessPendingTitle: '取引先情報を確認中です。',
    accessPendingBody: '価格、合計、見積もり依頼機能は承認後に利用できます。',
    accessGuestTitle: '見積もりリストは取引先承認後に利用できます。',
    accessGuestBody: 'ログインまたは取引先申請後、価格と見積もりリストをご利用ください。',
    accountStatus: '承認状態を見る',
    loadingTitle: '見積もりリストを準備しています。',
    loadingBody: '承認済み取引先情報と価格を確認しています。',
    dataErrorTitle: '見積もりリストを読み込めませんでした。',
    dataErrorBody: 'カタログデータを再確認してください。',
    authErrorTitle: '取引先セッションを確認できませんでした。',
    authErrorBody: 'ログイン状態を確認してから再度お試しください。',
    breadcrumb: '商品確認',
    kicker: 'Inquiry List',
    title: '見積もりリスト',
    subtitle: '選択した商品、オプション、数量を確認して見積もり依頼へ進みます。',
    listTitle: '選択商品',
    listDescription: '数量はMOQ単位で調整されます。',
    itemCount: (items, quantity) => `${items}商品 / ${quantity} pcs`,
    emptyTitle: '選択された商品がありません。',
    emptyBody: '商品詳細で承認価格を確認し、見積もりリストに追加してください。',
    browseProducts: '商品を見る',
    product: '商品',
    condition: '取引条件',
    quantity: '数量',
    subtotal: '小計',
    remove: '削除',
    decrease: '数量を減らす',
    increase: '数量を増やす',
    moq: 'MOQ',
    market: '市場',
    unitPrice: '承認単価',
    summaryTitle: '見積もり概要',
    summaryItems: '商品数',
    summaryQuantity: '総数量',
    summaryTotal: '概算合計',
    notice: '見積もり依頼は最終取引確定ではありません。在庫、価格、納期はNoblesse確認後にご案内します。',
    requestQuote: '見積もりを依頼',
    disabledCta: '先に商品を追加してください',
  },
  cn: {
    accessPendingTitle: '正在確認買家資料。',
    accessPendingBody: '價格、合計與詢價功能會在審核通過後開放。',
    accessGuestTitle: '詢價清單需通過買家審核後使用。',
    accessGuestBody: '請登入或申請買家資格後使用價格與詢價清單。',
    accountStatus: '查看審核狀態',
    loadingTitle: '正在準備詢價清單。',
    loadingBody: '正在確認已核准買家資料與價格。',
    dataErrorTitle: '無法載入詢價清單。',
    dataErrorBody: '請重新確認商品資料後再試一次。',
    authErrorTitle: '無法確認買家登入狀態。',
    authErrorBody: '請確認登入狀態後再試一次。',
    breadcrumb: '商品確認',
    kicker: 'Inquiry List',
    title: '詢價清單',
    subtitle: '確認選取商品、規格與數量後送出詢價。',
    listTitle: '已選商品',
    listDescription: '數量會依MOQ單位調整。',
    itemCount: (items, quantity) => `${items}項商品 / ${quantity} pcs`,
    emptyTitle: '尚未加入商品。',
    emptyBody: '請在商品詳情頁確認核准價格後加入詢價清單。',
    browseProducts: '查看商品',
    product: '商品',
    condition: '交易條件',
    quantity: '數量',
    subtotal: '小計',
    remove: '移除',
    decrease: '減少數量',
    increase: '增加數量',
    moq: 'MOQ',
    market: '市場',
    unitPrice: '核准單價',
    summaryTitle: '詢價摘要',
    summaryItems: '商品數',
    summaryQuantity: '總數量',
    summaryTotal: '預估合計',
    notice: '詢價不是最終交易確認。庫存、價格與交期將由Noblesse確認後提供。',
    requestQuote: '送出詢價',
    disabledCta: '請先加入商品',
  },
}

function useInquiryListCopy() {
  const { locale, toLocalePath } = useLocalePath()
  const copy = inquiryListCopy[getLocaleContentKey(locale)] || inquiryListCopy.kr
  return { copy, locale, toLocalePath }
}

const pricePendingLabel = '가격 확인중'
const formatQuoteAmount = (value, currency, unavailable = false) => (
  unavailable ? pricePendingLabel : formatMoney(value, currency)
)

function AccessNotice({ viewerState }) {
  const isPending = viewerState === 'pending'
  const { copy, toLocalePath } = useInquiryListCopy()
  return (
    <main className="content">
      <div className="approval-page">
        <LockKeyhole size={25} />
        <h1>{isPending ? copy.accessPendingTitle : copy.accessGuestTitle}</h1>
        <p>{isPending ? copy.accessPendingBody : copy.accessGuestBody}</p>
        <Link to={toLocalePath('/account')}>{copy.accountStatus}</Link>
      </div>
    </main>
  )
}

function StatusNotice({ title, body }) {
  return (
    <main className="content">
      <div className="approval-page">
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </main>
  )
}

function QuantityControl({ copy, option, row, updateInquiryQuantity }) {
  return (
    <div className="quote-cart-quantity quantity">
      <button type="button" aria-label={copy.decrease} onClick={() => updateInquiryQuantity(row.productId, row.quantity - row.moq, option)}>
        <Minus size={14} />
      </button>
      <input
        aria-label={copy.quantity}
        value={row.quantity}
        type="number"
        min={row.moq}
        step={row.moq}
        onChange={(event) => updateInquiryQuantity(row.productId, event.target.value, option)}
      />
      <button type="button" aria-label={copy.increase} onClick={() => updateInquiryQuantity(row.productId, row.quantity + row.moq, option)}>
        <Plus size={14} />
      </button>
    </div>
  )
}

export function InquiryListPage() {
  const {
    authError,
    authStatus,
    buyer,
    dataError,
    dataStatus,
    estimatedTotal,
    inquiryRows,
    isApproved,
    removeInquiryItem,
    totalQuantity,
    updateInquiryQuantity,
    viewerState,
  } = useCommerce()
  const { copy, locale, toLocalePath } = useInquiryListCopy()

  if (dataStatus === 'loading' || authStatus === 'checking') return <StatusNotice title={copy.loadingTitle} body={copy.loadingBody} />
  if (dataStatus === 'error') return <StatusNotice title={copy.dataErrorTitle} body={dataError || copy.dataErrorBody} />
  if (authStatus === 'error') return <StatusNotice title={copy.authErrorTitle} body={authError || copy.authErrorBody} />
  if (!isApproved) return <AccessNotice viewerState={viewerState} />

  const hasItems = inquiryRows.length > 0
  const currency = inquiryRows[0]?.currency || buyer?.currency || 'KRW'
  const hasUnavailablePrice = inquiryRows.some((row) => row.priceUnavailable)

  return (
    <main className="content quote-cart-page">
      <section className="quote-cart-hero">
        <Link className="quote-cart-breadcrumb" to={toLocalePath('/products')}>{copy.breadcrumb}</Link>
        <p className="quote-cart-kicker">{copy.kicker}</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <span className="quote-cart-hero-count">
          <ShoppingCart size={17} />
          {copy.itemCount(inquiryRows.length, totalQuantity)}
        </span>
      </section>

      <section className="quote-cart-layout">
        <div className="quote-cart-panel">
          <div className="quote-cart-panel-head">
            <div>
              <h2>{copy.listTitle}</h2>
              <p>{copy.listDescription}</p>
            </div>
            <span>{copy.itemCount(inquiryRows.length, totalQuantity)}</span>
          </div>

          {!hasItems && (
            <div className="quote-cart-empty">
              <PackageCheck size={32} />
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyBody}</p>
              <Link className="quote-cart-empty-link" to={toLocalePath('/products')}>{copy.browseProducts}</Link>
            </div>
          )}

          {hasItems && (
            <div className="quote-cart-list">
              {inquiryRows.map((row, index) => {
                const option = { color: row.color, size: row.size }
                const rowKey = `${row.productId}-${row.color}-${row.size}`
                const productName = getLocalizedProductName(row.product, locale) || row.productName
                const imageAlt = getLocalizedProductAlt(row.product, locale) || productName
                return (
                  <article className="quote-cart-item" key={rowKey}>
                    <span className="quote-cart-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className={`quote-cart-thumb mini-image tone-${row.tone || 'pearl'}`}>
                      <span className="jewel-shape" />
                      {row.thumbnailUrl && (
                        <img
                          src={row.thumbnailUrl}
                          alt={imageAlt}
                          loading="lazy"
                          width="300"
                          height="300"
                          style={{ objectFit: 'cover', ...imagePresentationStyle(row.product?.imageSet) }}
                          onError={(event) => { event.currentTarget.hidden = true }}
                        />
                      )}
                    </div>
                    <div className="quote-cart-product">
                      <strong>{productName}</strong>
                      <span>{row.productCode}</span>
                      <small>{row.material} / {row.color} / {row.size}</small>
                      <small>{copy.moq} {row.moq} / {copy.market} {row.market}</small>
                    </div>
                    <div className="quote-cart-term">
                      <span>{copy.unitPrice}</span>
                      <strong>{formatQuoteAmount(row.priceSnapshot, row.currency, row.priceUnavailable)}</strong>
                    </div>
                    <QuantityControl copy={copy} option={option} row={row} updateInquiryQuantity={updateInquiryQuantity} />
                    <div className="quote-cart-price">
                      <span>{copy.subtotal}</span>
                      <strong>{formatQuoteAmount(row.subtotal, row.currency, row.priceUnavailable)}</strong>
                    </div>
                    <button className="quote-cart-remove remove" type="button" aria-label={copy.remove} onClick={() => removeInquiryItem(row.productId, option)}>
                      <Trash2 size={16} />
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <aside className="quote-cart-summary-card">
          <h2>{copy.summaryTitle}</h2>
          <dl>
            <div><dt>{copy.summaryItems}</dt><dd>{inquiryRows.length}</dd></div>
            <div><dt>{copy.summaryQuantity}</dt><dd>{totalQuantity}</dd></div>
            <div className="quote-cart-total"><dt>{copy.summaryTotal}</dt><dd>{formatQuoteAmount(estimatedTotal, currency, hasUnavailablePrice)}</dd></div>
          </dl>
          <p>{copy.notice}</p>
          <Link
            to={toLocalePath(hasItems ? '/request-quote' : '/inquiry-list')}
            aria-disabled={!hasItems}
            className={hasItems ? 'quote-cart-primary' : 'quote-cart-primary disabled'}
          >
            {hasItems ? copy.requestQuote : copy.disabledCta}
            {hasItems && <ArrowRight size={17} />}
          </Link>
        </aside>
      </section>
    </main>
  )
}
