import { Check, Heart, LockKeyhole, Minus, Plus, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, resolveLocaleCopy, useLocalePath } from '../utils/locale'
import { imagePresentationStyle, productGalleryEntries } from '../utils/productImageGallery'
import { getEffectiveProductOptionGroups, getLocalizedOptionLabel, getMissingRequiredProductOptions, selectedOptionPairs } from '../utils/productOptions'
import '../styles/catalog-quick-option.css'

const cardCopy = {
  kr: {
    add: '제품 문의하기',
    locked: '로그인 후 가격 확인 가능',
    lockedButton: '로그인 필요',
    minQty: 'MOQ',
    memberPrice: '거래 조건',
    noOptions: '별도 선택 옵션이 없는 상품입니다.',
    quickAdd: '견적 리스트에 담기',
    quickClose: '빠른 선택 닫기',
    quickEyebrow: '빠른 선택',
    quickTitle: '옵션 및 수량 선택',
    quantity: '수량',
    required: '필수',
    selectOptions: '옵션 선택',
    unavailable: '가격 미등록',
  },
  en: {
    add: 'Ask about this product',
    locked: 'Price available after sign-in',
    lockedButton: 'Sign in required',
    minQty: 'Minimum qty',
    memberPrice: 'Trade terms',
    noOptions: 'This product has no additional options.',
    quickAdd: 'Add to Inquiry List',
    quickClose: 'Close quick selection',
    quickEyebrow: 'Quick selection',
    quickTitle: 'Select options and quantity',
    quantity: 'Quantity',
    required: 'Required',
    selectOptions: 'Select options',
    unavailable: 'Price unavailable',
  },
  jp: {
    add: 'この商品を問い合わせる',
    locked: 'ログイン後に価格を確認できます',
    lockedButton: 'ログインが必要です',
    minQty: '最小数量',
    memberPrice: '取引条件',
    noOptions: '追加で選択するオプションはありません。',
    quickAdd: '見積もりリストに追加',
    quickClose: 'クイック選択を閉じる',
    quickEyebrow: 'クイック選択',
    quickTitle: 'オプションと数量を選択',
    quantity: '数量',
    required: '必須',
    selectOptions: 'オプションを選択',
    unavailable: '価格未登録',
  },
  cn: {
    add: '咨询此商品',
    locked: '登入後可查看價格',
    lockedButton: '需要登入',
    minQty: '最小数量',
    memberPrice: '交易条件',
    noOptions: '此商品沒有其他選項。',
    quickAdd: '加入詢價清單',
    quickClose: '關閉快速選擇',
    quickEyebrow: '快速選擇',
    quickTitle: '選擇規格與數量',
    quantity: '數量',
    required: '必填',
    selectOptions: '选择选项',
    unavailable: '价格未登记',
  },
}

const memberActionNoticeCopy = {
  kr: '회원가입 또는 로그인 후 이용할 수 있어요.',
  en: 'Sign up or sign in to use this feature.',
  jp: '会員登録またはログイン後にご利用いただけます。',
  cn: '註冊會員或登入後即可使用。',
}

export function CatalogCard({ product, priority = false }) {
  const { addInquiryItem, approvedPrice, getAdminPriceBooks, getPrice, isAdmin, isApproved, viewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const [isFavorite, setIsFavorite] = useState(false)
  const [shouldLoadAlternateImage, setShouldLoadAlternateImage] = useState(false)
  const [showAlternateImage, setShowAlternateImage] = useState(false)
  const [failedImageSources, setFailedImageSources] = useState([])
  const [isQuickOptionOpen, setIsQuickOptionOpen] = useState(false)
  const [isQuickOptionClosing, setIsQuickOptionClosing] = useState(false)
  const [quickOptionSelection, setQuickOptionSelection] = useState({})
  const [quickQuantity, setQuickQuantity] = useState(1)
  const quickAddButtonRef = useRef(null)
  const quickActionButtonRef = useRef(null)
  const quickCloseButtonRef = useRef(null)
  const quickCloseTimerRef = useRef(null)
  const price = getPrice(product.productId)
  const copy = resolveLocaleCopy(cardCopy, locale)
  const adminPriceLabel = resolveLocaleCopy({ kr: '관리자 가격', en: 'Admin prices', jp: '管理者価格', cn: '管理员价格' }, locale, 'en')
  const productName = getLocalizedProductName(product, locale)
  const productAlt = getLocalizedProductAlt(product, locale)
  const galleryImages = productGalleryEntries(product, productAlt)
  const primaryImage = galleryImages[0]
  const alternateImage = galleryImages[1]
  const primaryImageSource = primaryImage?.cardSrc || primaryImage?.detailSrc || product.imageSet?.card || ''
  const alternateImageSource = alternateImage?.cardSrc || alternateImage?.detailSrc || ''
  const canShowPrimaryImage = Boolean(primaryImageSource) && !failedImageSources.includes(primaryImageSource)
  const canShowAlternateImage = Boolean(alternateImageSource) && !failedImageSources.includes(alternateImageSource)
  const canUseTradeTerms = isApproved && price
  const adminPriceBooks = isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const memberActionNotice = resolveLocaleCopy(memberActionNoticeCopy, locale, 'en')
  const actionLockLabel = viewerState === 'guest' ? memberActionNotice : copy.lockedButton
  const addActionDisabled = viewerState !== 'guest' && !canUseTradeTerms
  const optionGroups = getEffectiveProductOptionGroups(product)
  const quickMoq = Math.max(1, Number(price?.moq || product.moqDefault || 1))
  const missingQuickOptions = getMissingRequiredProductOptions(optionGroups, quickOptionSelection)

  const closeQuickOption = useCallback(() => {
    if (quickCloseTimerRef.current) return
    setIsQuickOptionClosing(true)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    quickCloseTimerRef.current = window.setTimeout(() => {
      quickCloseTimerRef.current = null
      setIsQuickOptionOpen(false)
      setIsQuickOptionClosing(false)
      quickActionButtonRef.current?.focus({ preventScroll: true })
    }, prefersReducedMotion ? 0 : 170)
  }, [])

  useEffect(() => {
    if (!isQuickOptionOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeQuickOption()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)
    window.requestAnimationFrame(() => quickCloseButtonRef.current?.focus({ preventScroll: true }))
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [closeQuickOption, isQuickOptionOpen])

  useEffect(() => () => {
    if (quickCloseTimerRef.current) window.clearTimeout(quickCloseTimerRef.current)
  }, [])

  const prepareAlternateImage = () => {
    if (!alternateImageSource || typeof window === 'undefined') return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    setShouldLoadAlternateImage(true)
    setShowAlternateImage(true)
  }

  const hideAlternateImage = () => setShowAlternateImage(false)

  const markImageFailed = (source) => {
    setFailedImageSources((current) => current.includes(source) ? current : [...current, source])
    if (source === alternateImageSource) setShowAlternateImage(false)
  }

  const openMemberAccessModal = () => {
    window.dispatchEvent(new CustomEvent('noblesse:open-login-modal', {
      detail: { notice: memberActionNotice },
    }))
  }

  const handleQuickOptionOpen = () => {
    if (viewerState === 'guest') {
      openMemberAccessModal()
      return
    }
    if (!canUseTradeTerms) return
    if (quickCloseTimerRef.current) window.clearTimeout(quickCloseTimerRef.current)
    quickCloseTimerRef.current = null
    setIsQuickOptionClosing(false)
    setQuickOptionSelection(Object.fromEntries(optionGroups.flatMap((group) => {
      const activeValues = group.values.filter((value) => value.active)
      return activeValues.length === 1 ? [[group.id, activeValues[0].id]] : []
    })))
    setQuickQuantity(quickMoq)
    setIsQuickOptionOpen(true)
  }

  const handleQuickAdd = () => {
    if (missingQuickOptions.length > 0) return
    const sourceRect = quickAddButtonRef.current?.getBoundingClientRect()
    const added = addInquiryItem(product.productId, {
      selectedOptions: selectedOptionPairs(quickOptionSelection),
    }, quickQuantity)
    if (!added) return
    if (sourceRect) {
      window.dispatchEvent(new CustomEvent('noblesse:inquiry-item-added', {
        detail: {
          sourceRect: {
            left: sourceRect.left,
            top: sourceRect.top,
            width: sourceRect.width,
            height: sourceRect.height,
          },
          imageSrc: primaryImage?.thumbSrc || primaryImageSource,
          label: productName,
          quantity: quickQuantity,
        },
      }))
    }
    closeQuickOption()
  }

  const handleFavoriteClick = () => {
    if (viewerState === 'guest') {
      openMemberAccessModal()
      return
    }
    setIsFavorite((current) => !current)
  }
  const favoriteLabel = resolveLocaleCopy({ kr: '좋아요', en: 'Favorite', jp: 'お気に入り', cn: '收藏' }, locale, 'en')
  const colorGroup = optionGroups.find((group) => group.legacyKey === 'color' || group.id === 'legacy-color')
  const localizedColor = colorGroup?.values?.[0]?.labels
    ? resolveLocaleCopy(colorGroup.values[0].labels, locale, 'en')
    : (product.colors || [])[0]
  const productMetadata = [product.material, localizedColor].filter(Boolean)
  return <article className="catalog-card">
    <div className={`catalog-media${showAlternateImage && canShowAlternateImage ? ' is-showing-alternate' : ''}`} onPointerEnter={prepareAlternateImage} onPointerLeave={hideAlternateImage} onFocus={prepareAlternateImage} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) hideAlternateImage()
    }}>
      <Link className={`catalog-image tone-${product.tone}`} to={toLocalePath(`/products/${product.productId}`)} aria-label={productName}>
        <span className="jewel-shape" />
        {canShowPrimaryImage && <img className="catalog-product-image catalog-product-image--primary" src={primaryImageSource} alt={productAlt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" width="600" height="600" style={{ objectFit: 'cover', ...imagePresentationStyle(primaryImage || product.imageSet) }} onError={() => markImageFailed(primaryImageSource)} />}
        {shouldLoadAlternateImage && canShowAlternateImage && <img className="catalog-product-image catalog-product-image--alternate" src={alternateImageSource} alt="" aria-hidden="true" loading="lazy" decoding="async" width="600" height="600" style={{ objectFit: 'cover', ...imagePresentationStyle(alternateImage) }} onError={() => markImageFailed(alternateImageSource)} />}
        {!canShowPrimaryImage && <span className="catalog-image-placeholder" aria-hidden="true" />}
        {product.isNew && <b>NEW</b>}
      </Link>
      <div className="catalog-quick-actions" aria-label={`${productName} actions`}>
        <button className={`catalog-quick-action catalog-quick-action--favorite${isFavorite ? ' is-saved' : ''}`} type="button" aria-pressed={isFavorite} title={favoriteLabel} aria-label={favoriteLabel} onClick={handleFavoriteClick}>
          <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button ref={quickActionButtonRef} className="catalog-quick-action catalog-quick-action--inquiry" type="button" disabled={addActionDisabled} onClick={handleQuickOptionOpen} title={canUseTradeTerms ? copy.quickTitle : actionLockLabel} aria-label={canUseTradeTerms ? copy.quickTitle : actionLockLabel}><SlidersHorizontal size={17} /></button>
      </div>
    </div>
    <div className="catalog-body">
      <Link to={toLocalePath(`/products/${product.productId}`)}><h3>{productName}</h3></Link>
      {productMetadata.length > 0 && <p>{productMetadata.join(' · ')}</p>}
      {adminPriceBooks.length > 0
        ? <div className="approved-price admin-price-books"><strong>{adminPriceLabel}</strong><span className="admin-price-book-grid">{adminPriceItems.map((item, index) => <span className="admin-price-book-item" key={`${item.market}-${item.currency}-${index}`}><img alt={item.flagLabel} className="admin-price-book-flag" src={item.flagSrc} /><span className="admin-price-book-value"><b>{item.amount}</b><span>{item.symbol}</span><em>{item.currency}</em></span></span>)}</span></div>
        : canUseTradeTerms ? <div className="approved-price"><strong>{formatMoney(approvedPrice(product.productId), price.currency)}</strong><span>{copy.minQty} {price.moq} / {copy.memberPrice} · {price.currency}</span></div> : <div className="locked-price"><LockKeyhole size={14} />{isApproved ? copy.unavailable : copy.locked}</div>}
    </div>
    {isQuickOptionOpen && typeof document !== 'undefined' && createPortal(<div className={`catalog-option-overlay${isQuickOptionClosing ? ' is-closing' : ''}`} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeQuickOption()
    }}>
      <section aria-busy={isQuickOptionClosing} aria-labelledby={`catalog-option-title-${product.productId}`} aria-modal="true" className="catalog-option-dialog" role="dialog">
        <header className={`catalog-option-dialog-header${canShowPrimaryImage ? ' has-image' : ''}`}>
          {canShowPrimaryImage && <img alt="" aria-hidden="true" src={primaryImageSource} />}
          <div>
            <small>{copy.quickEyebrow}</small>
            <h2 id={`catalog-option-title-${product.productId}`}>{copy.quickTitle}</h2>
            <p>{productName}</p>
          </div>
          <button ref={quickCloseButtonRef} aria-label={copy.quickClose} className="catalog-option-close" type="button" onClick={closeQuickOption}><X size={18} /></button>
        </header>
        <div className="catalog-option-dialog-body">
          {optionGroups.length > 0 ? optionGroups.map((group, groupIndex) => {
            const activeValues = group.values.filter((value) => value.active)
            return <div className={`catalog-option-group${group.required && !quickOptionSelection[group.id] ? ' is-required' : ''}`} key={group.id} style={{ '--catalog-option-order': groupIndex }}>
              <span>{getLocalizedOptionLabel(group.labels, locale)}{group.required && <small>{copy.required}</small>}</span>
              <div>
                {activeValues.map((value) => <button
                  aria-pressed={quickOptionSelection[group.id] === value.id}
                  className={quickOptionSelection[group.id] === value.id ? 'is-active' : ''}
                  key={value.id}
                  type="button"
                  onClick={() => setQuickOptionSelection((current) => ({ ...current, [group.id]: value.id }))}
                >
                  {group.type === 'swatch' && <i aria-hidden="true" style={{ backgroundColor: value.swatch || '#f4f1f2' }} />}
                  {getLocalizedOptionLabel(value.labels, locale)}
                </button>)}
              </div>
            </div>
          }) : <p className="catalog-option-empty">{copy.noOptions}</p>}
          <div className="catalog-option-quantity">
            <span>{copy.quantity}</span>
            <div>
              <button aria-label="Decrease quantity" disabled={quickQuantity <= quickMoq} type="button" onClick={() => setQuickQuantity((current) => Math.max(quickMoq, current - quickMoq))}><Minus size={15} /></button>
              <strong>{quickQuantity}</strong>
              <button aria-label="Increase quantity" type="button" onClick={() => setQuickQuantity((current) => current + quickMoq)}><Plus size={15} /></button>
            </div>
          </div>
        </div>
        <footer className="catalog-option-dialog-footer">
          <button ref={quickAddButtonRef} disabled={missingQuickOptions.length > 0 || isQuickOptionClosing} type="button" onClick={handleQuickAdd}><Check size={18} />{copy.quickAdd}</button>
        </footer>
      </section>
    </div>, document.body)}
  </article>
}
