import { useEffect, useRef, useState } from 'react'
import { Clock3, Heart, LogIn, Search, ShieldCheck, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import noblesseLogo from '../assets/noblesse-logo.png'
import { useCommerce } from '../commerce/commerceStore'
import { supportedLocales, useLocalePath } from '../utils/locale'

const searchHistoryKey = 'noblesse-search-history'

const viewerLabels = {
  guest: '비회원 미리보기',
  pending: '확인 중',
  approved: '회원가 이용 가능 / JP 지역',
  admin: '관리자 미리보기',
}

const countryLabels = {
  kr: '한국',
  en: '미국',
  jp: '일본',
  cn: '중국',
}

const recommendedSearches = ['티타늄 라블렛', '14K 골드 피어싱', '큐빅 바벨']
const popularSearches = [
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
]
const searchPlaceholder = '피어싱, 재질, 스타일을 검색해보세요'

const readSearchHistory = () => {
  if (typeof window === 'undefined') return []

  try {
    const storedHistory = JSON.parse(window.localStorage.getItem(searchHistoryKey) ?? '[]')
    return Array.isArray(storedHistory) ? storedHistory.filter(Boolean).slice(0, 8) : []
  } catch {
    return []
  }
}

function AnimatedBrandName({ text }) {
  const characters = Array.from(text)

  return <span className="brand-name-window" aria-label={text}>
    <span className="brand-name-slot" key={text} aria-hidden="true">
      {characters.map((char, index) => <span className="brand-name-char" key={`${text}-${index}-${char}`} style={{ '--char-index': index }}>
        {char === ' ' ? '\u00A0' : char}
      </span>)}
    </span>
  </span>
}

function LanguageSwitch({ locale, toLanguagePath }) {
  const activeIndex = supportedLocales.indexOf(locale)

  return <div className="language-switch compact" style={{ '--language-index': activeIndex }} aria-label="언어 설정">
    <span className="language-switch-indicator" aria-hidden="true" />
    {supportedLocales.map((item) => <Link
      aria-label={`${countryLabels[item]} 언어로 보기`}
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
  const [headerSearch, setHeaderSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState(readSearchHistory)
  const [navIndicator, setNavIndicator] = useState({ left: 0, ready: false, width: 0 })
  const { buyerAccess, inquiryItems, isAdmin, isApproved, isGuest, isPending, setViewerState, viewerState } = useCommerce()
  const { locale, localeMeta, toLanguagePath, toLocalePath } = useLocalePath()

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
    const handleOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setIsSearchOpen(false)
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

  return <div className="site-shell">
    <header className="site-header">
      <div className="header-main">
        <Link className="brand" to={toLocalePath('/')} aria-label="Noblesse Piercing home">
          <img className="brand-logo" src={noblesseLogo} alt="Noblesse Piercing logo" width="48" height="48" />
          <AnimatedBrandName text={localeMeta.brandName} />
        </Link>

        <div className="header-search-wrap top-search" ref={searchRef}>
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <input
              aria-label="상품 검색"
              autoComplete="off"
              name="siteSearch"
              onChange={(event) => setHeaderSearch(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              type="search"
              value={headerSearch}
            />
            <button aria-label="검색" type="submit"><Search size={19} /></button>
          </form>

          {isSearchOpen && <div className="search-popover" role="dialog" aria-label="검색 제안">
            <section className="search-popover-section">
              <div className="search-popover-title-row">
                <h2>최근 검색어</h2>
                <button className="clear-search-history" type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearSearchHistory}>검색 기록 지우기</button>
              </div>
              {searchHistory.length > 0
                ? <div className="search-history-list">
                  {searchHistory.map((term) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runHeaderSearch(term)}>{term}</button>)}
                </div>
                : <p>최근 검색 기록이 없습니다.</p>}
            </section>

            <section className="search-popover-section">
              <h2>추천 검색어 기반 상품</h2>
              <div className="recommended-search-list">
                {recommendedSearches.map((term) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runHeaderSearch(term)}>
                  <span className="recommend-dot" aria-hidden="true" />
                  <span>{term}</span>
                </button>)}
              </div>
            </section>

            <section className="search-popover-section">
              <h2>인기 검색어</h2>
              <div className="popular-search-grid">
                {popularSearches.map(({ term, trend }, index) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runHeaderSearch(term)}>
                  <b>{index + 1}</b>
                  <i className={`trend trend-${trend}`} aria-hidden="true" />
                  <span>{term}</span>
                </button>)}
              </div>
            </section>
          </div>}
        </div>

        <nav className="header-actions" aria-label="회원 바로가기">
          {isGuest && <>
            <IconAction label="로그인" to={toLocalePath('/login')}><LogIn size={18} /></IconAction>
            <IconAction label="회원 신청" to={toLocalePath('/register')}><UserRound size={18} /></IconAction>
          </>}
          {isPending && <>
            <IconAction label="확인 중" to={toLocalePath('/approval-pending')}><Clock3 size={18} /></IconAction>
            <IconAction label="마이페이지" to={toLocalePath('/account')}><UserRound size={18} /></IconAction>
          </>}
          {isApproved && <>
            <IconAction className={`inquiry-icon-action ${inquiryItems.length > 0 ? 'has-items' : ''}`} label="문의 리스트" to={toLocalePath('/inquiry-list')}>
              <InquiryListIcon />
              <b>{inquiryItems.length}</b>
            </IconAction>
            <IconAction label="마이페이지" to={toLocalePath('/account')}><UserRound size={18} /></IconAction>
          </>}
          {isAdmin && <>
            <IconAction label="관리자 미리보기" to={toLocalePath('/account')}><ShieldCheck size={18} /></IconAction>
            <IconAction label="마이페이지" to={toLocalePath('/account')}><UserRound size={18} /></IconAction>
          </>}
          <LanguageSwitch locale={locale} toLanguagePath={toLanguagePath} />
        </nav>
      </div>

      <div className="header-lower">
        <nav className="header-nav" ref={navRef} aria-label="주요 메뉴">
          <span
            aria-hidden="true"
            className={`header-nav-indicator ${navIndicator.ready ? 'ready' : ''}`}
            style={{
              transform: `translateX(${navIndicator.left}px)`,
              width: `${navIndicator.width}px`,
            }}
          />
          <NavLink end to={toLocalePath('/')}>홈</NavLink>
          <NavLink to={toLocalePath('/products')}>상품 목록</NavLink>
          {buyerAccess.canRequestQuote && <NavLink to={toLocalePath('/request-quote')}>견적 문의</NavLink>}
          {isPending && <NavLink to={toLocalePath('/approval-pending')}>확인 중</NavLink>}
        </nav>
      </div>

      <div className="preview-bar">
        <span>{viewerLabels[viewerState]}</span>
        {['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>{viewerLabels[state]}</button>)}
      </div>
    </header>
    <Outlet />
    <footer className="site-footer"><strong>Noblesse Piercing</strong><span>글로벌 고객을 위한 프리미엄 피어싱 카탈로그</span><Heart size={15} /></footer>
  </div>
}
