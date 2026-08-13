import { Heart, LockKeyhole, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, resolveLocaleCopy, useLocalePath } from '../utils/locale'
import { imagePresentationStyle, productGalleryEntries } from '../utils/productImageGallery'
import { getEffectiveProductOptionGroups } from '../utils/productOptions'

const cardCopy = {
  kr: {
    add: '제품 문의하기',
    locked: '로그인 후 가격 확인 가능',
    lockedButton: '로그인 필요',
    minQty: 'MOQ',
    memberPrice: '거래 조건',
    selectOptions: '옵션 선택',
    unavailable: '가격 미등록',
  },
  en: {
    add: 'Ask about this product',
    locked: 'Price available after sign-in',
    lockedButton: 'Sign in required',
    minQty: 'Minimum qty',
    memberPrice: 'Trade terms',
    selectOptions: 'Select options',
    unavailable: 'Price unavailable',
  },
  jp: {
    add: 'この商品を問い合わせる',
    locked: 'ログイン後に価格を確認できます',
    lockedButton: 'ログインが必要です',
    minQty: '最小数量',
    memberPrice: '取引条件',
    selectOptions: 'オプションを選択',
    unavailable: '価格未登録',
  },
  cn: {
    add: '咨询此商品',
    locked: '登入後可查看價格',
    lockedButton: '需要登入',
    minQty: '最小数量',
    memberPrice: '交易条件',
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
  const hasExplicitOptions = Array.isArray(product.optionGroups || product.option_groups) && (product.optionGroups || product.option_groups).length > 0
  const requiresOptionSelection = hasExplicitOptions && getEffectiveProductOptionGroups(product).some((group) => group.required)
  const detailPath = toLocalePath(`/products/${product.productId}`)
  const adminPriceBooks = isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const memberActionNotice = resolveLocaleCopy(memberActionNoticeCopy, locale, 'en')
  const actionLockLabel = viewerState === 'guest' ? memberActionNotice : copy.lockedButton
  const addActionDisabled = viewerState !== 'guest' && !canUseTradeTerms

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

  const handleAddInquiryClick = () => {
    if (viewerState === 'guest') {
      openMemberAccessModal()
      return
    }
    if (!canUseTradeTerms) return
    addInquiryItem(product.productId)
  }

  const handleFavoriteClick = () => {
    if (viewerState === 'guest') {
      openMemberAccessModal()
      return
    }
    setIsFavorite((current) => !current)
  }
  const favoriteLabel = resolveLocaleCopy({ kr: '좋아요', en: 'Favorite', jp: 'お気に入り', cn: '收藏' }, locale, 'en')
  const productMetadata = [product.material, ...(product.colors || []).slice(0, 1)].filter(Boolean)
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
        {canUseTradeTerms && requiresOptionSelection
          ? <Link className="catalog-quick-action catalog-quick-action--inquiry" to={detailPath} title={copy.selectOptions} aria-label={copy.selectOptions}><Plus size={17} /></Link>
          : <button className="catalog-quick-action catalog-quick-action--inquiry" type="button" disabled={addActionDisabled} onClick={handleAddInquiryClick} title={canUseTradeTerms ? copy.add : actionLockLabel} aria-label={canUseTradeTerms ? copy.add : actionLockLabel}><Plus size={17} /></button>}
      </div>
    </div>
    <div className="catalog-body">
      <Link to={toLocalePath(`/products/${product.productId}`)}><h3>{productName}</h3></Link>
      {productMetadata.length > 0 && <p>{productMetadata.join(' · ')}</p>}
      {adminPriceBooks.length > 0
        ? <div className="approved-price admin-price-books"><strong>{adminPriceLabel}</strong><span className="admin-price-book-grid">{adminPriceItems.map((item, index) => <span className="admin-price-book-item" key={`${item.market}-${item.currency}-${index}`}><img alt={item.flagLabel} className="admin-price-book-flag" src={item.flagSrc} /><span className="admin-price-book-value"><b>{item.amount}</b><span>{item.symbol}</span><em>{item.currency}</em></span></span>)}</span></div>
        : canUseTradeTerms ? <div className="approved-price"><strong>{formatMoney(approvedPrice(product.productId), price.currency)}</strong><span>{copy.minQty} {price.moq} / {copy.memberPrice} · {price.currency}</span></div> : <div className="locked-price"><LockKeyhole size={14} />{isApproved ? copy.unavailable : copy.locked}</div>}
    </div>
  </article>
}
