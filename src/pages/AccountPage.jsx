import { Clock3, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const accountCopy = {
  kr: {
    eyebrow: 'NOBLESSE FOR BUYERS',
    title: '마이 노블레스',
    intro: '최근 살펴본 상품을 한곳에 모아두었습니다.',
    recentTitle: '최근 본 상품',
    recentNote: '다른 기기에서도 최근 90일 동안 살펴본 상품을 이어서 확인할 수 있습니다.',
    newTitle: '새로 들어온 상품',
    newNote: '아직 본 상품이 없어 새로운 상품을 먼저 보여드립니다.',
    viewAll: '전체 상품 보기',
    loading: '최근 본 상품을 불러오는 중입니다...',
    loadError: '최근 본 상품을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.',
    emptyTitle: '새로운 상품을 준비 중입니다.',
    emptyBody: '전체 상품에서 Noblesse 카탈로그를 먼저 둘러보세요.',
    guestTitle: '로그인 후 최근 본 상품을 확인할 수 있습니다.',
    guestBody: '상품을 살펴보고 마음에 든 제품을 어느 기기에서든 다시 찾아보세요.',
    login: '로그인',
    register: '회원가입',
    restrictedTitle: '계정 이용 상태를 확인해주세요.',
    restrictedBody: '현재 계정에서는 최근 본 상품을 저장할 수 없습니다. 담당자 확인 후 다시 이용해주세요.',
  },
  en: {
    eyebrow: 'NOBLESSE FOR BUYERS',
    title: 'My Noblesse',
    intro: 'Your recently viewed products, gathered in one place.',
    recentTitle: 'Recently viewed',
    recentNote: 'Continue browsing products viewed within the last 90 days across your devices.',
    newTitle: 'New arrivals',
    newNote: 'You have no recently viewed products yet, so we selected new arrivals for you.',
    viewAll: 'View all products',
    loading: 'Loading recently viewed products...',
    loadError: 'Recently viewed products could not be loaded. Please try again shortly.',
    emptyTitle: 'New products are being prepared.',
    emptyBody: 'Explore the full Noblesse catalog to get started.',
    guestTitle: 'Sign in to see recently viewed products.',
    guestBody: 'Browse the catalog and return to products you liked from any device.',
    login: 'Sign in',
    register: 'Sign up',
    restrictedTitle: 'Please check your account access.',
    restrictedBody: 'Recently viewed products cannot be saved for this account. Contact Noblesse for assistance.',
  },
  jp: {
    eyebrow: 'NOBLESSE FOR BUYERS',
    title: 'マイ・ノブレス',
    intro: '最近ご覧になった商品を一か所にまとめました。',
    recentTitle: '最近見た商品',
    recentNote: '過去90日以内に見た商品を、別の端末からも続けて確認できます。',
    newTitle: '新着商品',
    newNote: '最近見た商品がまだないため、新着商品をご案内します。',
    viewAll: 'すべての商品を見る',
    loading: '最近見た商品を読み込んでいます...',
    loadError: '最近見た商品を読み込めませんでした。しばらくしてから再度お試しください。',
    emptyTitle: '新商品を準備中です。',
    emptyBody: 'Noblesseの商品一覧を先にご覧ください。',
    guestTitle: 'ログインすると最近見た商品を確認できます。',
    guestBody: 'カタログを閲覧し、気になった商品をどの端末からでも再確認できます。',
    login: 'ログイン',
    register: '会員登録',
    restrictedTitle: 'アカウントの利用状態をご確認ください。',
    restrictedBody: '現在のアカウントでは最近見た商品を保存できません。担当者にお問い合わせください。',
  },
  'zh-TW': {
    eyebrow: 'NOBLESSE FOR BUYERS',
    title: '我的 Noblesse',
    intro: '將您最近瀏覽的商品集中整理在這裡。',
    recentTitle: '最近瀏覽',
    recentNote: '可在不同裝置上繼續查看最近90天內瀏覽過的商品。',
    newTitle: '最新商品',
    newNote: '目前尚無瀏覽紀錄，先為您顯示最新商品。',
    viewAll: '查看全部商品',
    loading: '正在載入最近瀏覽的商品...',
    loadError: '無法載入最近瀏覽的商品，請稍後再試。',
    emptyTitle: '最新商品準備中。',
    emptyBody: '請先瀏覽 Noblesse 全部商品目錄。',
    guestTitle: '登入後即可查看最近瀏覽的商品。',
    guestBody: '瀏覽商品後，可在任何裝置上再次找到感興趣的款式。',
    login: '登入',
    register: '註冊',
    restrictedTitle: '請確認帳號使用狀態。',
    restrictedBody: '目前帳號無法儲存最近瀏覽商品，請聯絡 Noblesse 協助確認。',
  },
}

function sortNewProducts(products) {
  return [...products]
    .filter((product) => product.isVisible && product.isExportAvailable !== false && product.isNew)
    .sort((a, b) => {
      const sortDifference = (a.sortOrder || 0) - (b.sortOrder || 0)
      if (sortDifference !== 0) return sortDifference
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
    })
    .slice(0, 10)
}

export function AccountPage() {
  const {
    dataError,
    dataStatus,
    isAdmin,
    isApproved,
    isGuest,
    products,
    recentProductViews,
    refreshRecentProducts,
  } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const copy = accountCopy[locale] || accountCopy.en
  const [recentStatus, setRecentStatus] = useState('idle')
  const [recentError, setRecentError] = useState('')

  useEffect(() => {
    if (!isApproved || dataStatus !== 'ready') {
      setRecentStatus('idle')
      setRecentError('')
      return undefined
    }

    let isMounted = true
    setRecentStatus('loading')
    setRecentError('')
    refreshRecentProducts()
      .then(() => {
        if (isMounted) setRecentStatus('ready')
      })
      .catch((error) => {
        if (!isMounted) return
        setRecentStatus('error')
        setRecentError(error?.message || copy.loadError)
      })

    return () => {
      isMounted = false
    }
  }, [copy.loadError, dataStatus, isApproved, refreshRecentProducts])

  const recentProducts = useMemo(() => {
    const productByCode = new Map(products.map((product) => [product.code, product]))
    return recentProductViews
      .map((view) => productByCode.get(view.productCode))
      .filter(Boolean)
      .slice(0, 10)
  }, [products, recentProductViews])
  const newProducts = useMemo(() => sortNewProducts(products), [products])
  const hasRecentProducts = recentProducts.length > 0
  const displayedProducts = hasRecentProducts ? recentProducts : newProducts
  const canShowProducts = dataStatus !== 'loading' && recentStatus !== 'loading'
  const showRecentHeading = hasRecentProducts || recentStatus === 'idle' || recentStatus === 'loading'

  if (isAdmin) return <Navigate replace to={toLocalePath('/admin')} />

  return <main className="content account-product-page">
    <header className="account-product-intro">
      <p>{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <span>{copy.intro}</span>
    </header>

    {isGuest ? <section className="account-access-notice">
      <UserRound size={24} />
      <div><h2>{copy.guestTitle}</h2><p>{copy.guestBody}</p></div>
      <div className="account-access-actions">
        <Link className="primary-action" to={toLocalePath('/login')}>{copy.login}</Link>
        <Link className="secondary-action" to={toLocalePath('/register')}>{copy.register}</Link>
      </div>
    </section> : null}

    {!isGuest && !isApproved ? <section className="account-access-notice is-restricted">
      <Clock3 size={24} />
      <div><h2>{copy.restrictedTitle}</h2><p>{copy.restrictedBody}</p></div>
      <Link className="secondary-action" to={toLocalePath('/products')}>{copy.viewAll}</Link>
    </section> : null}

    {isApproved ? <section className="account-product-shelf" aria-labelledby="account-product-heading">
      <div className="account-product-heading">
        <div>
          <h2 id="account-product-heading">{showRecentHeading ? copy.recentTitle : copy.newTitle}</h2>
          <span>{showRecentHeading ? copy.recentNote : copy.newNote}</span>
        </div>
        <Link className="secondary-action" to={toLocalePath('/products')}>{copy.viewAll}</Link>
      </div>

      {recentStatus === 'loading' ? <p className="account-product-message" role="status">{copy.loading}</p> : null}
      {recentStatus === 'error' ? <p className="account-product-message is-error" role="alert">{recentError || copy.loadError}</p> : null}
      {dataStatus === 'error' ? <p className="account-product-message is-error" role="alert">{dataError || copy.loadError}</p> : null}

      {canShowProducts && displayedProducts.length > 0
        ? <div className="catalog-grid account-product-grid">{displayedProducts.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
        : canShowProducts ? <div className="account-product-empty">
          <h2>{copy.emptyTitle}</h2>
          <p>{copy.emptyBody}</p>
          <Link className="secondary-action" to={toLocalePath('/products')}>{copy.viewAll}</Link>
        </div> : null}
    </section> : null}
  </main>
}
