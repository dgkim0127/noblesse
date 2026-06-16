import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock3, Heart, Search, ShieldCheck, UserRound, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import noblesseLogo from '../assets/noblesse-logo.png'
import { useCommerce } from '../commerce/commerceStore'
import { supportedLocales, useLocalePath } from '../utils/locale'

const searchHistoryKey = 'noblesse-search-history'
const topMarqueeText = 'SILVER 925 & Surgical Piercing & Brass Piercing · 실버 & 써지컬 & 신주 피어싱 · Allergy-conscious materials · Since 2010'

const shellCopy = {
  kr: {
    account: '마이페이지',
    adminPreview: '관리자 미리보기',
    clearHistory: '검색 기록 지우기',
    countryLabels: { kr: '한국', en: '미국', jp: '일본', cn: '중국' },
    footer: '국내·해외 B2B 거래처를 위한 프리미엄 피어싱 카탈로그',
    home: '홈',
    inquiryList: '문의 리스트',
    languageSwitch: '언어 설정',
    login: '로그인',
    noHistory: '최근 검색 기록이 없습니다.',
    pending: '확인 중',
    productList: '상품 목록',
    recentSearches: '최근 검색어',
    recommendedHeading: '추천 검색어 기반 상품',
    recommendedSearches: ['티타늄 라블렛', '14K 골드 피어싱', '큐빅 바벨'],
    register: '회원 가입',
    requestQuote: '견적 문의',
    search: '검색',
    searchAria: '상품 검색',
    searchDialog: '검색 제안',
    searchPlaceholder: '피어싱, 재질, 스타일을 검색해보세요',
    mainNav: '주요 메뉴',
    memberNav: '회원 바로가기',
    popularHeading: '인기 검색어',
    recentViewed: '최근 본 상품',
    noRecentViewed: '최근 본 상품이 없습니다.',
    popularSearches: [
      { term: '티타늄 라블렛', trend: 'up' },
      { term: '써지컬 스틸 바벨', trend: 'up' },
      { term: '14K 골드 피어싱', trend: 'same' },
      { term: '큐빅 바벨', trend: 'up' },
      { term: '원터치 링', trend: 'down' },
      { term: '진주 피어싱', trend: 'same' },
      { term: '노즈 피어싱', trend: 'up' },
      { term: '배꼽 링', trend: 'down' },
      { term: '하트 라블렛', trend: 'up' },
      { term: '체인 드롭 피어싱', trend: 'same' },
    ],
    viewerLabels: {
      guest: '비회원 미리보기',
      pending: '확인 중',
      approved: '거래 조건 안내 가능 / JP 지역',
      admin: '관리자 미리보기',
    },
  },
  en: {
    account: 'My page',
    adminPreview: 'Admin preview',
    clearHistory: 'Clear history',
    countryLabels: { kr: 'Korea', en: 'United States', jp: 'Japan', cn: 'China' },
    footer: 'Premium piercing catalog for domestic and international B2B buyers',
    home: 'Home',
    inquiryList: 'Inquiry list',
    languageSwitch: 'Language settings',
    login: 'Login',
    noHistory: 'No recent searches yet.',
    pending: 'Under review',
    productList: 'Product list',
    recentSearches: 'Recent searches',
    recommendedHeading: 'Recommended search products',
    recommendedSearches: ['Titanium labret', '14K gold piercing', 'Cubic barbell'],
    register: 'Sign up',
    requestQuote: 'Quote inquiry',
    search: 'Search',
    searchAria: 'Product search',
    searchDialog: 'Search suggestions',
    searchPlaceholder: 'Search piercing, material, or style',
    mainNav: 'Main menu',
    memberNav: 'Member shortcuts',
    popularHeading: 'Popular searches',
    recentViewed: 'Recently viewed',
    noRecentViewed: 'No recently viewed products yet.',
    popularSearches: [
      { term: 'Titanium labret', trend: 'up' },
      { term: 'Surgical steel barbell', trend: 'up' },
      { term: '14K gold piercing', trend: 'same' },
      { term: 'Cubic barbell', trend: 'up' },
      { term: 'One-touch ring', trend: 'down' },
      { term: 'Pearl piercing', trend: 'same' },
      { term: 'Nose piercing', trend: 'up' },
      { term: 'Belly ring', trend: 'down' },
      { term: 'Heart labret', trend: 'up' },
      { term: 'Chain drop piercing', trend: 'same' },
    ],
    viewerLabels: {
      guest: 'Guest preview',
      pending: 'Under review',
      approved: 'Trade terms available / JP region',
      admin: 'Admin preview',
    },
  },
  jp: {
    account: 'マイページ',
    adminPreview: '管理者プレビュー',
    clearHistory: '検索履歴を削除',
    countryLabels: { kr: '韓国', en: '米国', jp: '日本', cn: '中国' },
    footer: '国内・海外B2B取引先向けプレミアムピアスカタログ',
    home: 'ホーム',
    inquiryList: 'お問い合わせリスト',
    languageSwitch: '言語設定',
    login: 'ログイン',
    noHistory: '最近の検索履歴はありません。',
    pending: '確認中',
    productList: '商品一覧',
    recentSearches: '最近の検索',
    recommendedHeading: 'おすすめ検索の商品',
    recommendedSearches: ['チタンラブレット', '14Kゴールドピアス', 'キュービックバーベル'],
    register: '会員登録',
    requestQuote: '見積相談',
    search: '検索',
    searchAria: '商品検索',
    searchDialog: '検索候補',
    searchPlaceholder: 'ピアス、素材、スタイルを検索',
    mainNav: 'メインメニュー',
    memberNav: '取引先メニュー',
    popularHeading: '人気検索',
    recentViewed: '最近見た商品',
    noRecentViewed: '最近見た商品はありません。',
    popularSearches: [
      { term: 'チタンラブレット', trend: 'up' },
      { term: 'サージカルバーベル', trend: 'up' },
      { term: '14Kゴールドピアス', trend: 'same' },
      { term: 'キュービックバーベル', trend: 'up' },
      { term: 'ワンタッチリング', trend: 'down' },
      { term: 'パールピアス', trend: 'same' },
      { term: 'ノーズピアス', trend: 'up' },
      { term: 'へそピアス', trend: 'down' },
      { term: 'ハートラブレット', trend: 'up' },
      { term: 'チェーンドロップ', trend: 'same' },
    ],
    viewerLabels: {
      guest: 'ゲストプレビュー',
      pending: '確認中',
      approved: '取引条件案内可能 / JP地域',
      admin: '管理者プレビュー',
    },
  },
  cn: {
    account: '我的页面',
    adminPreview: '管理员预览',
    clearHistory: '清除搜索记录',
    countryLabels: { kr: '韩国', en: '美国', jp: '日本', cn: '中国' },
    footer: '面向国内外B2B买家的高端穿孔商品目录',
    home: '首页',
    inquiryList: '咨询清单',
    languageSwitch: '语言设置',
    login: '登录',
    noHistory: '暂无最近搜索。',
    pending: '确认中',
    productList: '商品列表',
    recentSearches: '最近搜索',
    recommendedHeading: '推荐搜索商品',
    recommendedSearches: ['钛钢唇钉', '14K金穿孔饰品', '锆石杠铃'],
    register: '会员注册',
    requestQuote: '报价咨询',
    search: '搜索',
    searchAria: '商品搜索',
    searchDialog: '搜索建议',
    searchPlaceholder: '搜索穿孔、材质、风格',
    mainNav: '主菜单',
    memberNav: '买家入口',
    popularHeading: '热门搜索',
    recentViewed: '最近浏览',
    noRecentViewed: '暂无最近浏览商品。',
    popularSearches: [
      { term: '钛钢唇钉', trend: 'up' },
      { term: '医用钢杠铃', trend: 'up' },
      { term: '14K金穿孔饰品', trend: 'same' },
      { term: '锆石杠铃', trend: 'up' },
      { term: '一触式环', trend: 'down' },
      { term: '珍珠穿孔饰品', trend: 'same' },
      { term: '鼻钉', trend: 'up' },
      { term: '肚脐环', trend: 'down' },
      { term: '爱心唇钉', trend: 'up' },
      { term: '链条垂坠款', trend: 'same' },
    ],
    viewerLabels: {
      guest: '访客预览',
      pending: '确认中',
      approved: '可提供交易条件 / JP地区',
      admin: '管理员预览',
    },
  },
}

const shellCompactViewerLabels = {
  kr: {
    guest: '비회원',
    pending: '확인 중',
    approved: '거래 조건 / JP',
    admin: '관리자',
  },
  en: {
    guest: 'Guest',
    pending: 'Review',
    approved: 'Trade terms / JP',
    admin: 'Admin',
  },
  jp: {
    guest: 'ゲスト',
    pending: '確認中',
    approved: '取引条件 / JP',
    admin: '管理者',
  },
  cn: {
    guest: '访客',
    pending: '确认中',
    approved: '交易条件 / JP',
    admin: '管理',
  },
}

const sideMemberLabels = {
  kr: {
    inquiryList: '견적 리스트',
    my: 'MY',
    myInquiries: '내 견적 요청',
  },
  en: {
    inquiryList: 'Inquiry List',
    my: 'MY',
    myInquiries: 'My Inquiries',
  },
  jp: {
    inquiryList: '見積リスト',
    my: 'MY',
    myInquiries: '見積依頼',
  },
  cn: {
    inquiryList: '报价清单',
    my: 'MY',
    myInquiries: '我的报价',
  },
}

const loginModalCopy = {
  kr: {
    title: '거래처 로그인',
    heading: 'LOGIN',
    description: '확인된 거래처는 거래 조건, 문의 리스트, 견적 문의 기능을 사용할 수 있습니다. 견적 문의는 최종 주문이 아닙니다.',
    email: '아이디',
    password: '비밀번호',
    emailPlaceholder: '아이디',
    passwordPlaceholder: '비밀번호',
    submit: '로그인',
    autoLogin: '자동 로그인',
    guest: '비회원으로 둘러보기',
    register: '회원 가입',
    close: '로그인 팝업 닫기',
  },
  en: {
    title: 'Trade login',
    heading: 'LOGIN',
    description: 'Approved buyers can use trade terms, Inquiry List, and Request Quote. A quote request is not a final order.',
    email: 'ID',
    password: 'Password',
    emailPlaceholder: 'ID',
    passwordPlaceholder: 'Password',
    submit: 'Login',
    autoLogin: 'Remember me',
    guest: 'Browse as guest',
    register: 'Sign up',
    close: 'Close login popup',
  },
  jp: {
    title: '取引先ログイン',
    heading: 'LOGIN',
    description: '確認済みの取引先は取引条件、お問い合わせリスト、見積もり依頼を利用できます。見積もり依頼は最終注文ではありません。',
    email: 'ID',
    password: 'パスワード',
    emailPlaceholder: 'ID',
    passwordPlaceholder: 'パスワード',
    submit: 'ログイン',
    autoLogin: '自動ログイン',
    guest: 'ゲストで見る',
    register: '会員登録',
    close: 'ログインポップアップを閉じる',
  },
  cn: {
    title: '贸易登录',
    heading: 'LOGIN',
    description: '已确认的贸易客户可使用贸易条件、咨询列表和报价咨询。报价咨询不是最终订单。',
    email: '账号',
    password: '密码',
    emailPlaceholder: '账号',
    passwordPlaceholder: '密码',
    submit: '登录',
    autoLogin: '自动登录',
    guest: '以访客浏览',
    register: '会员注册',
    close: '关闭登录弹窗',
  },
}

const readSearchHistory = () => {
  if (typeof window === 'undefined') return []

  try {
    const storedHistory = JSON.parse(window.localStorage.getItem(searchHistoryKey) ?? '[]')
    return Array.isArray(storedHistory) ? storedHistory.filter(Boolean).slice(0, 8) : []
  } catch {
    return []
  }
}

function AnimatedBrandName({ ariaHidden = false, text }) {
  const characters = Array.from(text)

  return <span className="brand-name-window" aria-hidden={ariaHidden ? 'true' : undefined} aria-label={ariaHidden ? undefined : text}>
    <span className="brand-name-slot" key={text} aria-hidden="true">
      {characters.map((char, index) => <span className="brand-name-char" key={`${text}-${index}-${char}`} style={{ '--char-index': index }}>
        {char === ' ' ? '\u00A0' : char}
      </span>)}
    </span>
  </span>
}

function AnimatedSearchPlaceholder({ text }) {
  const characters = Array.from(text)

  return <span className="search-placeholder-animated" aria-hidden="true" key={text}>
    {characters.map((char, index) => <span className="search-placeholder-char" key={`${text}-${index}-${char}`} style={{ '--char-index': index }}>
      {char === ' ' ? '\u00A0' : char}
    </span>)}
  </span>
}

function LanguageSwitch({ countryLabels, isCompact = false, languageSwitch, locale, toLanguagePath }) {
  const [isOpen, setIsOpen] = useState(false)
  const activeIndex = supportedLocales.indexOf(locale)
  const activeCountry = countryLabels[locale]
  const switchClassName = `language-switch compact ${isCompact ? 'is-dropdown' : ''} ${isOpen ? 'is-open' : ''}`.trim()

  const closeMenu = () => setIsOpen(false)

  return <div
    className={switchClassName}
    style={{ '--language-index': activeIndex }}
    aria-label={languageSwitch}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) closeMenu()
    }}
  >
    <button
      className="language-dropdown-trigger"
      type="button"
      aria-expanded={isCompact ? isOpen : undefined}
      aria-label={`${languageSwitch}: ${activeCountry}`}
      onClick={() => setIsOpen((current) => !current)}
    >
      <span className={`flag-icon flag-${locale}`} aria-hidden="true" />
      <ChevronDown size={13} />
    </button>
    <span className="language-switch-indicator" aria-hidden="true" />
    {supportedLocales.map((item) => <Link
      aria-label={countryLabels[item]}
      className={locale === item ? 'active' : ''}
      key={item}
      onClick={closeMenu}
      title={countryLabels[item]}
      to={toLanguagePath(item)}
    >
      <span className={`flag-icon flag-${item}`} aria-hidden="true" />
    </Link>)}
  </div>
}

function IconAction({ children, label, onClick, to, className = '' }) {
  if (onClick) {
    return <button aria-label={label} className={`icon-action ${className}`} title={label} type="button" onClick={onClick}>
      {children}
    </button>
  }

  return <NavLink aria-label={label} className={`icon-action ${className}`} title={label} to={to}>
    {children}
  </NavLink>
}

function InquiryListIcon() {
  return <svg aria-hidden="true" className="inquiry-list-svg" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path d="M4 5h2.2l2.1 9.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.4l1.2-4.4H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    <path d="M10 20h.01M18 20h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
  </svg>
}

export function StoreShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const navRef = useRef(null)
  const searchRef = useRef(null)
  const headerSearchInputRef = useRef(null)
  const compactSearchRef = useRef(null)
  const compactSearchInputRef = useRef(null)
  const compactSearchCloseTimerRef = useRef(null)
  const compactSearchVisibleRef = useRef(false)
  const loginModalCloseTimerRef = useRef(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [compactSearchPhase, setCompactSearchPhase] = useState('closed')
  const [searchHistory, setSearchHistory] = useState(readSearchHistory)
  const [isMarqueeCollapsed, setIsMarqueeCollapsed] = useState(false)
  const [isSideLayout, setIsSideLayout] = useState(false)
  const [isHeaderCompact, setIsHeaderCompact] = useState(false)
  const [isPreviewBarHidden, setIsPreviewBarHidden] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isLoginModalClosing, setIsLoginModalClosing] = useState(false)
  const [loginModalOrigin, setLoginModalOrigin] = useState({ x: 0, y: 0 })
  const [isAutoLoginEnabled, setIsAutoLoginEnabled] = useState(true)
  const [navIndicator, setNavIndicator] = useState({ left: 0, ready: false, width: 0 })
  const { buyerAccess, inquiryItems, isAdmin, isApproved, isGuest, isPending, setViewerState, viewerState } = useCommerce()
  const { locale, localeMeta, toLanguagePath, toLocalePath } = useLocalePath()
  const copy = shellCopy[locale] ?? shellCopy.kr
  const loginCopy = loginModalCopy[locale] ?? loginModalCopy.kr
  const compactViewerLabels = shellCompactViewerLabels[locale] ?? copy.viewerLabels
  const sideCopy = sideMemberLabels[locale] ?? sideMemberLabels.kr
  const headerBrandName = localeMeta?.brandName ?? '귀족'
  const isCompactSearchOpen = compactSearchPhase === 'open'
  const isCompactSearchClosing = compactSearchPhase === 'closing'
  const normalizedPathname = location.pathname.replace(/\/+$/, '') || '/'
  const isHomeImageRoute = normalizedPathname === '/' || supportedLocales.some((item) => normalizedPathname === `/${item}`)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined

    const syncIndicator = () => {
      const active = nav.querySelector('a.active')
      if (!active) {
        setNavIndicator((current) => ({ ...current, ready: false }))
        return
      }

      const navRect = nav.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setNavIndicator({
        left: activeRect.left - navRect.left + nav.scrollLeft,
        ready: true,
        width: activeRect.width,
      })
    }

    const frame = window.requestAnimationFrame(syncIndicator)
    window.addEventListener('resize', syncIndicator)
    nav.addEventListener('scroll', syncIndicator, { passive: true })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', syncIndicator)
      nav.removeEventListener('scroll', syncIndicator)
    }
  }, [buyerAccess.canRequestQuote, isPending, location.pathname, locale])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0
      const marqueeCollapsed = scrollY > 24
      const sideLayout = scrollY > 150
      const compact = scrollY > 520
      setIsMarqueeCollapsed(marqueeCollapsed)
      setIsSideLayout(sideLayout)
      setIsHeaderCompact(compact)
      document.documentElement.classList.toggle('noblesse-marquee-collapsed', marqueeCollapsed)
      document.documentElement.classList.toggle('noblesse-side-layout', sideLayout)
      document.documentElement.classList.toggle('noblesse-compact-header', compact)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    let animationFrame = 0
    const interval = window.setInterval(handleScroll, 120)

    const syncScroll = () => {
      handleScroll()
      animationFrame = window.requestAnimationFrame(syncScroll)
    }

    animationFrame = window.requestAnimationFrame(syncScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
      window.cancelAnimationFrame(animationFrame)
      window.clearInterval(interval)
      document.documentElement.classList.remove('noblesse-marquee-collapsed')
      document.documentElement.classList.remove('noblesse-side-layout')
      document.documentElement.classList.remove('noblesse-compact-header')
    }
  }, [])

  useEffect(() => {
    let wheelLock = false

    const handleFirstWheel = (event) => {
      if (window.scrollY > 2 || Math.abs(event.deltaY) < 8 || wheelLock) return

      const marqueeHeight = document.querySelector('.top-marquee')?.getBoundingClientRect().height || 30
      wheelLock = true
      event.preventDefault()
      window.scrollTo({ top: Math.ceil(marqueeHeight), behavior: 'smooth' })
      window.setTimeout(() => {
        wheelLock = false
      }, 420)
    }

    window.addEventListener('wheel', handleFirstWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleFirstWheel)
    }
  }, [])

  useEffect(() => {
    if (!isHeaderCompact && !isCompactSearchClosing) {
      if (compactSearchCloseTimerRef.current) window.clearTimeout(compactSearchCloseTimerRef.current)
      compactSearchCloseTimerRef.current = null
      setCompactSearchPhase('closed')
    }
  }, [isCompactSearchClosing, isHeaderCompact])

  useEffect(() => {
    compactSearchVisibleRef.current = isCompactSearchOpen || isCompactSearchClosing
  }, [isCompactSearchClosing, isCompactSearchOpen])

  useEffect(() => () => {
    if (compactSearchCloseTimerRef.current) window.clearTimeout(compactSearchCloseTimerRef.current)
    if (loginModalCloseTimerRef.current) window.clearTimeout(loginModalCloseTimerRef.current)
  }, [])

  useEffect(() => {
    if (!isLoginModalOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeLoginModal()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLoginModalOpen])

  useEffect(() => {
    if (!isCompactSearchOpen) return
    window.requestAnimationFrame(() => {
      window.setTimeout(() => compactSearchInputRef.current?.focus(), 0)
    })
  }, [isCompactSearchOpen])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setIsSearchOpen(false)
      if (!compactSearchRef.current?.contains(event.target) && !event.target.closest?.('.compact-search-action')) {
        closeCompactSearch()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const saveSearchHistory = (query) => {
    if (!query) return
    const nextHistory = [query, ...searchHistory.filter((item) => item !== query)].slice(0, 8)
    setSearchHistory(nextHistory)
    window.localStorage.setItem(searchHistoryKey, JSON.stringify(nextHistory))
  }

  const runHeaderSearch = (nextQuery = headerSearch) => {
    const query = nextQuery.trim()
    saveSearchHistory(query)
    setHeaderSearch(query)
    setIsSearchOpen(false)
    closeCompactSearch()
    const target = query ? `/products?q=${encodeURIComponent(query)}` : '/products'
    navigate(toLocalePath(target))
  }

  const submitSearch = (event) => {
    event.preventDefault()
    runHeaderSearch()
  }

  const focusHeaderSearch = () => {
    setIsSearchOpen(true)
    headerSearchInputRef.current?.focus()
  }

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    runHeaderSearch()
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    window.localStorage.removeItem(searchHistoryKey)
  }

  const openCompactSearch = () => {
    if (compactSearchCloseTimerRef.current) window.clearTimeout(compactSearchCloseTimerRef.current)
    compactSearchCloseTimerRef.current = null
    setCompactSearchPhase('open')
  }

  const closeCompactSearch = () => {
    if (!compactSearchVisibleRef.current && !isCompactSearchOpen && !isCompactSearchClosing) return
    if (compactSearchCloseTimerRef.current) window.clearTimeout(compactSearchCloseTimerRef.current)
    setCompactSearchPhase('closing')
    compactSearchCloseTimerRef.current = window.setTimeout(() => {
      setCompactSearchPhase('closed')
      compactSearchCloseTimerRef.current = null
    }, 1080)
  }

  const toggleCompactSearch = () => {
    if (isCompactSearchOpen || isCompactSearchClosing) closeCompactSearch()
    else openCompactSearch()
    setIsSearchOpen(false)
  }

  const openLoginModal = (event) => {
    if (loginModalCloseTimerRef.current) window.clearTimeout(loginModalCloseTimerRef.current)
    loginModalCloseTimerRef.current = null
    setIsLoginModalClosing(false)
    const rect = event?.currentTarget?.getBoundingClientRect?.()
    if (rect) {
      setLoginModalOrigin({
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      })
    } else {
      setLoginModalOrigin({ x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) })
    }
    setIsSearchOpen(false)
    closeCompactSearch()
    setIsLoginModalOpen(true)
  }

  const closeLoginModal = () => {
    if (!isLoginModalOpen || isLoginModalClosing) return
    if (loginModalCloseTimerRef.current) window.clearTimeout(loginModalCloseTimerRef.current)
    setIsLoginModalClosing(true)
    loginModalCloseTimerRef.current = window.setTimeout(() => {
      setIsLoginModalOpen(false)
      setIsLoginModalClosing(false)
      loginModalCloseTimerRef.current = null
    }, 340)
  }

  const loginAsApprovedBuyer = (event) => {
    event.preventDefault()
    setViewerState('approved', { persist: isAutoLoginEnabled })
    closeLoginModal()
    navigate(toLocalePath('/account'))
  }

  const browseAsGuest = () => {
    setViewerState('guest')
    closeLoginModal()
    navigate(toLocalePath('/products'))
  }

  const goToRegisterFromLogin = () => {
    closeLoginModal()
    navigate(toLocalePath('/register'))
  }

  const brandHomeLabel = `${headerBrandName} home`
  const topMarqueeStyle = isMarqueeCollapsed
    ? { height: 0, maxHeight: 0, opacity: 0, pointerEvents: 'none', transform: 'translateY(-100%)' }
    : undefined
  const compactHeaderMainStyle = isHeaderCompact
    ? {
      height: 56,
      minHeight: 56,
      paddingTop: 0,
      paddingBottom: 0,
      gridTemplateRows: '56px',
      alignContent: 'center',
    }
    : undefined
  const compactHeaderCollapseStyle = isHeaderCompact
    ? { display: 'none', height: 0, maxHeight: 0, padding: 0, overflow: 'hidden' }
    : undefined

  const shouldRenderCompactSearch = isCompactSearchOpen || isCompactSearchClosing

  return <div className={`site-shell ${isHomeImageRoute ? 'home-image-shell' : ''} ${isMarqueeCollapsed ? 'has-collapsed-marquee' : ''} ${isSideLayout ? 'has-side-layout' : ''} ${isHeaderCompact ? 'has-compact-header' : ''} ${isCompactSearchOpen ? 'has-compact-search-open' : ''} ${isCompactSearchClosing ? 'has-compact-search-closing' : ''} ${isPreviewBarHidden ? 'has-preview-hidden' : 'has-preview-visible'}`.trim()}>
    <div className={`top-marquee ${isMarqueeCollapsed ? 'is-collapsed' : ''}`} style={topMarqueeStyle} aria-label={`${headerBrandName} material notice`}>
      <div className="top-marquee-track" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => <span key={index}>{topMarqueeText}</span>)}
      </div>
    </div>

    <header className={`site-header ${isHeaderCompact ? 'is-compact' : ''}`}>
      <div className="header-main" style={compactHeaderMainStyle}>
        <Link className="brand" to={toLocalePath('/')} aria-label={brandHomeLabel}>
          <img className="brand-logo" src={noblesseLogo} alt="" aria-hidden="true" width="48" height="48" />
          <AnimatedBrandName ariaHidden text={headerBrandName} />
        </Link>

        <Link className="compact-brand-title" to={toLocalePath('/')} aria-label={brandHomeLabel}>
          <AnimatedBrandName ariaHidden text={headerBrandName} />
        </Link>

        <div className="header-search-wrap top-search" ref={searchRef}>
          <form className={`header-search ${headerSearch ? 'has-search-value' : ''}`} role="search" onSubmit={submitSearch}>
            <input
              ref={headerSearchInputRef}
              aria-label={copy.searchAria}
              autoComplete="off"
              name="siteSearch"
              onChange={(event) => setHeaderSearch(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={headerSearch}
            />
            {!headerSearch && <AnimatedSearchPlaceholder text={copy.searchPlaceholder} />}
            <button aria-label={copy.search} type="button" onClick={focusHeaderSearch}><Search size={19} /></button>
          </form>

          {isSearchOpen && <div className="search-popover" role="dialog" aria-label={copy.searchDialog}>
            <section className="search-popover-section">
              <div className="search-popover-title-row">
                <h2>{copy.recentSearches}</h2>
                <button className="clear-search-history" type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearSearchHistory}>{copy.clearHistory}</button>
              </div>
              {searchHistory.length > 0
                ? <div className="search-history-list">
                  {searchHistory.map((term) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runHeaderSearch(term)}>{term}</button>)}
                </div>
                : <p>{copy.noHistory}</p>}
            </section>

            <section className="search-popover-section">
              <h2>{copy.recommendedHeading}</h2>
              <div className="recommended-search-list">
                {copy.recommendedSearches.map((term) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runHeaderSearch(term)}>
                  <span className="recommend-dot" aria-hidden="true" />
                  <span>{term}</span>
                </button>)}
              </div>
            </section>

            <section className="search-popover-section">
              <h2>{copy.popularHeading}</h2>
              <div className="popular-search-grid">
                {copy.popularSearches.map(({ term, trend }, index) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runHeaderSearch(term)}>
                  <b>{index + 1}</b>
                  <i className={`trend trend-${trend}`} aria-hidden="true" />
                  <span>{term}</span>
                </button>)}
              </div>
            </section>
          </div>}
        </div>

        <nav className="header-actions" aria-label={copy.memberNav}>
          {isHomeImageRoute && <>
            <button className="header-login-text-action" type="button" onClick={openLoginModal}>{copy.login}</button>
            <IconAction className="header-side-icon" label={sideCopy.myInquiries} to={toLocalePath('/my-inquiries')}><Clock3 size={17} /></IconAction>
            <IconAction className="header-side-icon" label={sideCopy.inquiryList} to={toLocalePath('/inquiry-list')}><InquiryListIcon /></IconAction>
            <IconAction className="header-my-action" label={copy.account} to={toLocalePath('/account')}>{sideCopy.my}</IconAction>
          </>}
          {isGuest && !isHomeImageRoute && <IconAction label={copy.login} onClick={openLoginModal}><UserRound size={18} /></IconAction>}
          {isPending && <>
            <IconAction label={copy.pending} to={toLocalePath('/approval-pending')}><Clock3 size={18} /></IconAction>
            <IconAction label={copy.account} to={toLocalePath('/account')}><UserRound size={18} /></IconAction>
          </>}
          {isApproved && <>
            <IconAction className={`inquiry-icon-action ${inquiryItems.length > 0 ? 'has-items' : ''}`} label={copy.inquiryList} to={toLocalePath('/inquiry-list')}>
              <InquiryListIcon />
              <b>{inquiryItems.length}</b>
            </IconAction>
            <IconAction label={copy.account} to={toLocalePath('/account')}><UserRound size={18} /></IconAction>
          </>}
          {isAdmin && <>
            <IconAction label={copy.adminPreview} to={toLocalePath('/admin')}><ShieldCheck size={18} /></IconAction>
            <IconAction label={copy.account} to={toLocalePath('/account')}><UserRound size={18} /></IconAction>
          </>}
          <button className={`icon-action compact-search-action ${isCompactSearchOpen ? 'active' : ''}`} type="button" aria-label={copy.search} title={copy.search} onClick={toggleCompactSearch}><Search size={18} /></button>
          <LanguageSwitch countryLabels={copy.countryLabels} isCompact={isHeaderCompact} languageSwitch={copy.languageSwitch} locale={locale} toLanguagePath={toLanguagePath} />
        </nav>
      </div>

      {shouldRenderCompactSearch && <div className={`compact-search-panel ${isCompactSearchClosing ? 'is-closing' : ''}`.trim()} ref={compactSearchRef}>
        <span className="compact-search-boundary" aria-hidden="true">
          <span className="compact-search-boundary-segment boundary-left" />
          <span className="compact-search-boundary-segment boundary-right" />
        </span>
        <form className={`compact-search-form ${headerSearch ? 'has-search-value' : ''}`} role="search" onSubmit={submitSearch}>
          <input
            aria-label={copy.searchAria}
            autoComplete="off"
            autoFocus
            name="compactSiteSearch"
            onChange={(event) => setHeaderSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={copy.searchPlaceholder}
            ref={compactSearchInputRef}
            type="search"
            value={headerSearch}
          />
          {!headerSearch && <AnimatedSearchPlaceholder text={copy.searchPlaceholder} />}
          <button aria-label={copy.search} type="submit"><Search size={24} /></button>
        </form>

        <div className="compact-search-content">
          <section>
            <h2>{copy.popularHeading}</h2>
            <div className="compact-popular-list">
              {copy.popularSearches.map(({ term, trend }, index) => <button key={term} type="button" onClick={() => runHeaderSearch(term)}>
                <b>{index + 1}</b>
                <i className={`trend trend-${trend}`} aria-hidden="true" />
                <span>{term}</span>
              </button>)}
            </div>
          </section>

          <section>
            <h2>{copy.recentSearches}</h2>
            {searchHistory.length > 0
              ? <div className="compact-history-list">{searchHistory.slice(0, 6).map((term) => <button key={term} type="button" onClick={() => runHeaderSearch(term)}>{term}</button>)}</div>
              : <p>{copy.noHistory}</p>}
            <button className="clear-search-history compact-clear" type="button" onClick={clearSearchHistory}>{copy.clearHistory}</button>
          </section>

          <section>
            <h2>{copy.recentViewed}</h2>
            <p>{copy.noRecentViewed}</p>
          </section>
        </div>
      </div>}

      <div className="header-lower" style={compactHeaderCollapseStyle}>
        <nav className="header-nav" ref={navRef} aria-label={copy.mainNav}>
          <span
            aria-hidden="true"
            className={`header-nav-indicator ${navIndicator.ready ? 'ready' : ''}`}
            style={{
              transform: `translateX(${navIndicator.left}px)`,
              width: `${navIndicator.width}px`,
            }}
          />
          <NavLink end to={toLocalePath('/')}>{copy.home}</NavLink>
          <NavLink to={toLocalePath('/products')}>{copy.productList}</NavLink>
          {buyerAccess.canRequestQuote && <NavLink to={toLocalePath('/request-quote')}>{copy.requestQuote}</NavLink>}
          {isPending && <NavLink to={toLocalePath('/approval-pending')}>{copy.pending}</NavLink>}
        </nav>
      </div>

      {!isPreviewBarHidden && <div className="preview-bar" style={compactHeaderCollapseStyle}>
        <span>
          <span className="viewer-label-full">{copy.viewerLabels[viewerState]}</span>
          <span className="viewer-label-compact">{compactViewerLabels[viewerState]}</span>
        </span>
        {['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>
          <span className="viewer-label-full">{copy.viewerLabels[state]}</span>
          <span className="viewer-label-compact">{compactViewerLabels[state]}</span>
        </button>)}
      </div>}
    </header>
    {isLoginModalOpen && <div
      className={`login-modal-overlay ${isLoginModalClosing ? 'is-closing' : ''}`.trim()}
      role="presentation"
      style={{
        '--login-origin-x': `${loginModalOrigin.x}px`,
        '--login-origin-y': `${loginModalOrigin.y}px`,
      }}
      onMouseDown={closeLoginModal}
    >
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="login-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="login-modal-close" type="button" aria-label={loginCopy.close} onClick={closeLoginModal}>
          <X size={18} />
        </button>
        <h2 id="login-modal-title">{loginCopy.heading}</h2>
        <form className="auth-form" onSubmit={loginAsApprovedBuyer}>
          <div className="login-id-group">
            <label>{loginCopy.email}<input autoComplete="username" name="username" placeholder={loginCopy.emailPlaceholder} type="text" /></label>
            <label className="auto-login-check">
              <input
                checked={isAutoLoginEnabled}
                name="autoLogin"
                onChange={(event) => setIsAutoLoginEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>{loginCopy.autoLogin}</span>
            </label>
          </div>
          <label>{loginCopy.password}<input autoComplete="current-password" name="password" placeholder={loginCopy.passwordPlaceholder} type="password" /></label>
          <button className="primary-action" type="submit">{loginCopy.submit}</button>
        </form>
        <div className="auth-links">
          <button className="text-action login-register-action" type="button" onClick={goToRegisterFromLogin}>{loginCopy.register}</button>
        </div>
      </section>
    </div>}
    <button
      className={`preview-bar-hide ${isPreviewBarHidden ? 'is-hidden-state' : ''}`}
      type="button"
      aria-label={isPreviewBarHidden ? 'Show mock preview bar' : 'Hide mock preview bar'}
      title={isPreviewBarHidden ? 'Show mock preview bar' : 'Hide mock preview bar'}
      onClick={() => setIsPreviewBarHidden((current) => !current)}
    >
      <span className="preview-hide-full">{isPreviewBarHidden ? '미리보기 보이기' : '미리보기 숨기기'}</span>
      <span className="preview-hide-compact">{isPreviewBarHidden ? '보이기' : '숨기기'}</span>
      <span aria-hidden="true">{isPreviewBarHidden ? '+' : '×'}</span>
    </button>
    <div className="locale-transition-frame" key={`locale-content-${locale}`}>
      <Outlet />
    </div>
    <footer className="site-footer"><strong>{headerBrandName}</strong><span>{copy.footer}</span><Heart size={15} /></footer>
  </div>
}
