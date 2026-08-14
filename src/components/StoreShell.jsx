import { useEffect, useState } from 'react'
import { ClipboardList, Clock3, LogIn, Search, UserRound } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import noblesseLogo from '../assets/noblesse-logo.png'
import { useCommerce } from '../commerce/commerceStore'
import { localeMeta, supportedLocales, useLocalePath } from '../utils/locale'

const navTargets = [
  ['new', { kr: '\uc2e0\uc0c1\ud488', en: 'New Arrivals', jp: '\u65b0\u5546\u54c1', cn: '\u65b0\u54c1' }],
  ['weekly', { kr: '\uc8fc\uac04 \ucd94\ucc9c', en: 'Weekly Best', jp: '\u9031\u9593\u304a\u3059\u3059\u3081', cn: '\u6bcf\u5468\u63a8\u8350' }],
  ['buyer', { kr: '\ubc14\uc774\uc5b4 \uc140\ub809\uc158', en: 'Buyer Selection', jp: '\u30d0\u30a4\u30e4\u30fc\u30bb\u30ec\u30af\u30b7\u30e7\u30f3', cn: '\u4e70\u624b\u7cbe\u9009' }],
  ['catalog', { kr: '\ud53c\uc5b4\uc2f1 \uce74\ud0c8\ub85c\uadf8', en: 'Piercing Catalog', jp: '\u30d4\u30a2\u30b9\u30ab\u30bf\u30ed\u30b0', cn: '\u7a7f\u5b54\u76ee\u5f55' }],
  ['steady', { kr: '\uc2a4\ud14c\ub514 \ub77c\uc778', en: 'Steady Line', jp: '\u5b9a\u756a\u30e9\u30a4\u30f3', cn: '\u7ecf\u5178\u7cfb\u5217' }],
]

const labels = {
  kr: {
    search: '\ud53c\uc5b4\uc2f1, \uc7ac\uc9c8, \uc2a4\ud0c0\uc77c\uc744 \uac80\uc0c9\ud574\ubcf4\uc138\uc694',
    viewer: {
      guest: '\ube44\ud68c\uc6d0 \ubbf8\ub9ac\ubcf4\uae30',
      pending: '\ud655\uc778 \uc911',
      approved: '\uac70\ub798 \uc870\uac74 \uc548\ub0b4 \uac00\ub2a5 / JP \uc9c0\uc5ed',
      admin: '\uad00\ub9ac\uc790 \ubbf8\ub9ac\ubcf4\uae30',
    },
    inquiry: '\uacac\uc801 \ub9ac\uc2a4\ud2b8',
    login: '\ub85c\uadf8\uc778',
    account: '\ub9c8\uc774\ud398\uc774\uc9c0',
    language: '\uc5b8\uc5b4 \uc120\ud0dd',
    show: '\ubcf4\uae30',
  },
  en: {
    search: 'Search piercing, material, style',
    viewer: {
      guest: 'Guest preview',
      pending: 'Under review',
      approved: 'Trade terms available / JP region',
      admin: 'Admin preview',
    },
    inquiry: 'Inquiry List',
    login: 'Login',
    account: 'My page',
    language: 'Language',
    show: 'Show',
  },
  jp: {
    search: '\u30d4\u30a2\u30b9\u3001\u7d20\u6750\u3001\u30b9\u30bf\u30a4\u30eb\u3092\u691c\u7d22',
    viewer: {
      guest: '\u30b2\u30b9\u30c8\u30d7\u30ec\u30d3\u30e5\u30fc',
      pending: '\u78ba\u8a8d\u4e2d',
      approved: '\u53d6\u5f15\u6761\u4ef6\u6848\u5185\u53ef\u80fd / JP\u5730\u57df',
      admin: '\u7ba1\u7406\u8005\u30d7\u30ec\u30d3\u30e5\u30fc',
    },
    inquiry: '\u898b\u7a4d\u30ea\u30b9\u30c8',
    login: '\u30ed\u30b0\u30a4\u30f3',
    account: '\u30de\u30a4\u30da\u30fc\u30b8',
    language: '\u8a00\u8a9e\u9078\u629e',
    show: '\u8868\u793a',
  },
  cn: {
    search: '\u641c\u7d22\u7a7f\u5b54\u3001\u6750\u8d28\u3001\u98ce\u683c',
    viewer: {
      guest: '\u8bbf\u5ba2\u9884\u89c8',
      pending: '\u5ba1\u6838\u4e2d',
      approved: '\u53ef\u67e5\u770b\u4ea4\u6613\u6761\u4ef6 / JP\u5730\u533a',
      admin: '\u7ba1\u7406\u5458\u9884\u89c8',
    },
    inquiry: '\u8be2\u4ef7\u5217\u8868',
    login: '\u767b\u5f55',
    account: '\u6211\u7684\u9875\u9762',
    language: '\u8bed\u8a00\u9009\u62e9',
    show: '\u67e5\u770b',
  },
}

const marqueeText = 'SILVER 925 & SURGICAL PIERCING & BRASS PIERCING - ALLERGY-CONSCIOUS MATERIALS - SINCE 2010'

const flagByLocale = {
  kr: '\ud83c\uddf0\ud83c\uddf7',
  en: '\ud83c\uddfa\ud83c\uddf8',
  jp: '\ud83c\uddef\ud83c\uddf5',
  cn: '\ud83c\udde8\ud83c\uddf3',
}

function getNavLabel(locale, item) {
  return item[1][locale] ?? item[1].kr
}

function normalizePath(pathname) {
  const normalized = pathname.replace(/^\/(kr|en|jp|cn)(?=\/|$)/, '')
  return normalized || '/'
}

function AnimatedSearchPlaceholder({ text, hidden }) {
  if (hidden) return null

  return <span className="animated-search-placeholder" aria-hidden="true">
    {Array.from(text).map((char, index) => <span
      className={char === ' ' ? 'space' : ''}
      key={`${char}-${index}`}
      style={{ '--char-index': index }}
    >
      {char === ' ' ? '\u00a0' : char}
    </span>)}
  </span>
}

export function StoreShell() {
  const { inquiryItems, isApproved, isHybridMode, setViewerState, viewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const copy = labels[locale] ?? labels.kr
  const brandName = localeMeta[locale]?.brandName ?? localeMeta.kr.brandName
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }

    window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 40)
  }, [location.pathname, location.hash])

  const submitSearch = (event) => {
    event.preventDefault()
    const next = query.trim()
    if (next) navigate(toLocalePath(`/search?q=${encodeURIComponent(next)}`))
  }

  const scrollToHomeSection = (target) => {
    const targetId = `home-${target}`
    if (normalizePath(location.pathname) !== '/') {
      navigate(`${toLocalePath('/')}#${targetId}`)
      return
    }

    document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return <div className="site-shell">
    <div className="top-marquee" aria-hidden="true">
      <div className="top-marquee-track">
        {Array.from({ length: 4 }).map((_, index) => <span key={index}>{marqueeText}</span>)}
      </div>
    </div>

    <header className="site-header">
      <div className="header-main">
        <form className="top-search" onSubmit={submitSearch}>
          <label className={`header-search ${query ? 'has-query' : ''}`}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
            <AnimatedSearchPlaceholder text={copy.search} hidden={Boolean(query)} />
            <button type="submit" aria-label={copy.search}><Search size={17} /></button>
          </label>
        </form>

        <Link className="brand" to={toLocalePath('/')} aria-label={`${brandName} home`}>
          <img className="brand-logo" src={noblesseLogo} alt="" />
          <span className="brand-name">{brandName}</span>
        </Link>

        <div className="header-actions" aria-label="Header actions">
          {isApproved && <Link className="icon-action inquiry-icon" to={toLocalePath('/inquiry-list')} aria-label={copy.inquiry}>
            <ClipboardList size={17} />
            {inquiryItems.length > 0 && <b>{inquiryItems.length}</b>}
          </Link>}
          <Clock3 className="quiet-icon" size={17} aria-hidden="true" />
          <Link className="icon-action" to={toLocalePath(isApproved ? '/account' : '/login')} aria-label={isApproved ? copy.account : copy.login}>
            {isApproved ? <UserRound size={17} /> : <LogIn size={17} />}
          </Link>
          <div className="locale-switch" aria-label={copy.language}>
            {supportedLocales.map((nextLocale) => <Link className={nextLocale === locale ? 'active' : ''} key={nextLocale} to={nextLocale === 'kr' ? '/' : `/${nextLocale}`} aria-label={localeMeta[nextLocale].brandName}>
              {flagByLocale[nextLocale]}
            </Link>)}
          </div>
        </div>
      </div>

      <nav className="header-section-nav" aria-label="Home sections">
        {navTargets.map((item) => <button key={item[0]} type="button" onClick={() => scrollToHomeSection(item[0])}>
          {getNavLabel(locale, item)}
        </button>)}
      </nav>

      {!isHybridMode && <div className="preview-bar" aria-label="Preview state">
        {['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>
          {copy.viewer[state]}
        </button>)}
      </div>}
    </header>

    <Outlet />
    <button className="preview-toggle" type="button">{copy.show}<br />+</button>
  </div>
}
