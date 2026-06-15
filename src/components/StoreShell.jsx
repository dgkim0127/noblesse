import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock3, Heart, Search, ShieldCheck, UserRound } from 'lucide-react'
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
    register: '거래처 문의',
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
    register: 'Trade inquiry',
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
    register: '取引先お問い合わせ',
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
    register: '贸易咨询',
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

function LanguageSwitch({ countryLabels, isCompact = false, languageSwitch, locale, toLanguagePath }) {
  const activeIndex = supportedLocales.indexOf(locale)
  const activeCountry = countryLabels[locale]

  return <div className={`language-switch compact ${isCompact ? 'is-dropdown' : ''}`} style={{ '--language-index': activeIndex }} aria-label={languageSwitch}>
    <button className="language-dropdown-trigger" type="button" aria-label={`${languageSwitch}: ${activeCountry}`}>
      <span className={`flag-icon flag-${locale}`} aria-hidden="true" />
      <ChevronDown size={13} />
    </button>
    <span className="language-switch-indicator" aria-hidden="true" />
    {supportedLocales.map((item) => <Link
      aria-label={countryLabels[item]}
      className={locale === item ? 'active' : ''}
      key={item}
      title={countryLabels[item]}
      to={toLanguagePath(item)}
    >
      <span className={`flag-icon flag-${item}`} aria-hidden="true" />
    </Link>)}
  </div>
}

function IconAction({ children, label, to, className = '' }) {
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
  const compactSearchRef = useRef(null)
  const compactSearchInputRef = useRef(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState(readSearchHistory)
  const [isHeaderCompact, setIsHeaderCompact] = useState(false)
  const [navIndicator, setNavIndicator] = useState({ left: 0, ready: false, width: 0 })
  const { buyerAccess, inquiryItems, isAdmin, isApproved, isGuest, isPending, setViewerState, viewerState } = useCommerce()
  const { locale, localeMeta, toLanguagePath, toLocalePath } = useLocalePath()
  const copy = shellCopy[locale] ?? shellCopy.kr

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
      const compact = window.scrollY > 260
      setIsHeaderCompact(compact)
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
      document.documentElement.classList.remove('noblesse-compact-header')
    }
  }, [])

  useEffect(() => {
    if (!isHeaderCompact) setIsCompactSearchOpen(false)
  }, [isHeaderCompact])

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
        setIsCompactSearchOpen(false)
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
    setIsCompactSearchOpen(false)
    const target = query ? `/products?q=${encodeURIComponent(query)}` : '/products'
    navigate(toLocalePath(target))
  }

  const submitSearch = (event) => {
    event.preventDefault()
    runHeaderSearch()
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

  const toggleCompactSearch = () => {
    setIsCompactSearchOpen((current) => !current)
    setIsSearchOpen(false)
  }
  const brandHomeLabel = localeMeta.brandName === 'Noblesse Piercing'
    ? 'Noblesse Piercing home'
    : `${localeMeta.brandName} Noblesse Piercing home`

  return <div className={`site-shell ${isHeaderCompact ? 'has-compact-header' : ''}`}>
    <div className="top-marquee" aria-label="Noblesse material notice">
      <div className="top-marquee-track" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => <span key={index}>{topMarqueeText}</span>)}
      </div>
    </div>

    <header className={`site-header ${isHeaderCompact ? 'is-compact' : ''}`}>
      <div className="header-main">
        <Link className="brand" to={toLocalePath('/')} aria-label={brandHomeLabel}>
          <img className="brand-logo" src={noblesseLogo} alt="" aria-hidden="true" width="48" height="48" />
          <AnimatedBrandName ariaHidden text={localeMeta.brandName} />
        </Link>

        <Link className="compact-brand-title" to={toLocalePath('/')} aria-label={brandHomeLabel}>
          <AnimatedBrandName ariaHidden text={localeMeta.brandName} />
        </Link>

        <div className="header-search-wrap top-search" ref={searchRef}>
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <input
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
            <button aria-label={copy.search} type="submit"><Search size={19} /></button>
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
          {isGuest && <IconAction label={copy.login} to={toLocalePath('/login')}><UserRound size={18} /></IconAction>}
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

      {isCompactSearchOpen && <div className="compact-search-panel" ref={compactSearchRef}>
        <form className="compact-search-form" role="search" onSubmit={submitSearch}>
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

      <div className="header-lower">
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

      <div className="preview-bar">
        <span>{copy.viewerLabels[viewerState]}</span>
        {['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>{copy.viewerLabels[state]}</button>)}
      </div>
    </header>
    <Outlet />
    <footer className="site-footer"><strong>Noblesse Piercing</strong><span>{copy.footer}</span><Heart size={15} /></footer>
  </div>
}
