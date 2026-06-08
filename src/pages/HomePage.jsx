import { ArrowRight, BadgeCheck, Gem, Globe2, Headphones, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { mockCollections } from '../data/catalog'

const quickCategories = [
  'New',
  'Best',
  'Ring',
  'Barbell',
  'Labret',
  'Silver',
  'Gold',
  'Titanium',
  'Surgical Steel',
]

const collectionCopy = {
  'japan-buyer-picks': 'Refined edits selected for Japanese buyer taste.',
  'us-buyer-picks': 'Clean silhouettes and high-rotation export styles.',
  'minimal-piercing-line': 'Quiet daily pieces with precise detail.',
  'premium-cubic-line': 'Light-catching cubic styles for curated displays.',
  'export-best-items': 'Export-ready Noblesse Piercing essentials.',
  'new-arrivals': 'Fresh arrivals prepared for upcoming buyer edits.',
}

function ProductSection({ products, title, note }) {
  if (products.length === 0) return null

  return <section className="section-wrap product-feature-section">
    <div className="section-title">
      <div>
        <Sparkles size={18} />
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      <Link to="/products">View all</Link>
    </div>
    <div className="catalog-grid">{products.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
  </section>
}

export function HomePage() {
  const { buyer, isApproved, products, viewerState } = useCommerce()
  const featuredProducts = products.filter((product) => product.isBest).slice(0, 8)
  const newProducts = products.filter((product) => product.isNew).slice(0, 8)
  const exportProducts = products.filter((product) => product.collectionIds.includes('export-best-items')).slice(0, 8)
  const heroCta = isApproved
    ? { label: 'Inquiry List', to: '/inquiry-list' }
    : viewerState === 'pending'
      ? { label: 'Approval Pending', to: '/approval-pending' }
      : viewerState === 'admin'
        ? { label: 'Admin Preview', to: '/account' }
        : { label: 'Request Buyer Access', to: '/register' }

  return <main>
    <section className="hero home-hero">
      <div className="hero-copy">
        <p className="eyebrow">KOREAN PIERCING WHOLESALE CATALOG</p>
        <h1>Noblesse Piercing</h1>
        <span>Premium piercing catalog for global buyers.</span>
        <small>Approved Buyer Price is available after approval.</small>
        <div className="hero-actions">
          <Link className="primary-action" to="/products">View Catalog <ArrowRight size={17} /></Link>
          <Link className="secondary-action" to={heroCta.to}>{heroCta.label}</Link>
        </div>
      </div>
      <div className="hero-art home-hero-art">
        <span className="hero-ring" />
        <span className="hero-gem" />
        <div className="hero-card-note">
          <strong>귀족 피어싱</strong>
          <span>피어싱 / Piercing / ピアス / 冲孔</span>
        </div>
      </div>
    </section>

    <section className="buyer-strip">
      <BadgeCheck size={19} />
      <div>
        <strong>{isApproved ? `${buyer.companyName} / Approved Buyer` : viewerState === 'pending' ? 'Buyer Approval is pending' : 'Global buyer catalog access'}</strong>
        <span>{isApproved ? `Your ${buyer.assignedMarket} market price list is active.` : 'Browse images and details now. Price and Inquiry features unlock after approval.'}</span>
      </div>
      <Globe2 size={19} />
    </section>

    <section className="section-wrap quick-category-section">
      <div className="section-title">
        <div>
          <Gem size={18} />
          <h2>Quick Category</h2>
          <p>Start with the piercing styles buyers request most often.</p>
        </div>
      </div>
      <div className="quick-category-grid">
        {quickCategories.map((category) => <Link className="quick-category-card" key={category} to="/products">
          <span>{category.slice(0, 1)}</span>
          <strong>{category}</strong>
        </Link>)}
      </div>
    </section>

    <section className="section-wrap collections-section">
      <div className="section-title">
        <div>
          <Sparkles size={18} />
          <h2>Featured Collections</h2>
          <p>Brand edits prepared for market-specific sourcing.</p>
        </div>
        <Link to="/products">Explore products</Link>
      </div>
      <div className="collection-grid">
        {mockCollections.map((collection) => <Link className="collection-card" key={collection.collectionId} to="/products">
          <small>{collection.productIds.length} styles</small>
          <strong>{collection.titleEn}</strong>
          <span>{collectionCopy[collection.collectionId]}</span>
        </Link>)}
      </div>
    </section>

    <ProductSection products={featuredProducts} title="Featured piercing" note="Best-selected pieces for a polished buyer catalog." />
    <ProductSection products={newProducts} title="New Arrivals" note="Fresh piercing styles prepared for the next buyer edit." />
    <ProductSection products={exportProducts} title="Export Best Items" note="Export-ready styles with clear sourcing information." />

    <section className="campaign-banner">
      <div>
        <p className="eyebrow">NOBLESSE SIGNATURE</p>
        <h2>귀족 피어싱 시그니처</h2>
        <span>Curated piercing styles for global buyers.</span>
      </div>
      <Link className="secondary-action" to={isApproved ? '/request-quote' : '/register'}>Request Quote after Buyer Approval</Link>
    </section>

    <section className="section-wrap home-bottom-grid">
      <article className="info-card">
        <ClockIcon />
        <h2>Recently Viewed</h2>
        <p>Recently viewed products will appear here.</p>
      </article>
      <article className="info-card">
        <Headphones size={22} />
        <h2>Customer Center</h2>
        <p>Email, KakaoTalk, and WhatsApp support placeholders.</p>
        <small>Detailed sourcing discussion continues after Request Quote.</small>
      </article>
      <article className="info-card">
        <Mail size={22} />
        <h2>Company Info</h2>
        <p>Noblesse Piercing</p>
        <small>Korean piercing wholesale catalog / Global buyer support</small>
      </article>
    </section>

    <section className="brand-note">
      <MessageCircle size={21} />
      <div>
        <strong>Designed for global buyers</strong>
        <span>Large product visuals, export-ready information, and a simple Request Quote flow.</span>
      </div>
    </section>
  </main>
}

function ClockIcon() {
  return <span className="soft-icon">N</span>
}
