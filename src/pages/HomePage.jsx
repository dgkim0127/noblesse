import { ArrowRight, BadgeCheck, Gem, Globe2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'

export function HomePage() {
  const { buyer, isApproved, products, viewerState } = useCommerce()
  return <main>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">GLOBAL BUYER CATALOG</p><h1>Fine piercing details<br />for your next edit.</h1><span>Premium piercing catalog for global buyers, built around Request Quote rather than direct purchase.</span><small>Korean piercing wholesale catalog with Approved Buyer Price available after approval.</small><div className="hero-actions"><Link className="primary-action" to="/products">View Catalog <ArrowRight size={17} /></Link>{isApproved ? <Link className="secondary-action" to="/inquiry-list">Inquiry List</Link> : viewerState === 'pending' ? <Link className="secondary-action" to="/approval-pending">Approval Pending</Link> : <Link className="secondary-action" to="/register">Request Buyer Access</Link>}</div></div>
      <div className="hero-art"><span className="hero-ring" /><span className="hero-gem" /></div>
    </section>
    <section className="buyer-strip"><BadgeCheck size={19} /><div><strong>{isApproved ? `${buyer.companyName} / Approved Buyer` : viewerState === 'pending' ? 'Buyer Approval is pending' : 'Wholesale access for approved buyers'}</strong><span>{isApproved ? `Your ${buyer.assignedMarket} market price list is active.` : 'Browse the catalog now. Prices and Inquiry features unlock after approval.'}</span></div><Globe2 size={19} /></section>
    <section className="section-wrap"><div className="section-title"><div><Sparkles size={18} /><h2>Featured piercing</h2></div><Link to="/products">View all</Link></div><div className="catalog-grid">{products.slice(0, 8).map((product) => <CatalogCard key={product.productId} product={product} />)}</div></section>
    <section className="brand-note"><Gem size={21} /><div><strong>Designed for global buyers</strong><span>Large product visuals, export-ready information, and a simple Request Quote flow.</span></div></section>
  </main>
}
