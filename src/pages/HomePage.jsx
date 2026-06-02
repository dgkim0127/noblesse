import { ArrowRight, BadgeCheck, Gem, Globe2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'

export function HomePage() {
  const { buyer, isApproved, products, viewerState } = useCommerce()
  return <main>
    <section className="hero">
      <div><p>GLOBAL BUYER CATALOG</p><h1>Fine piercing details<br />for your next edit.</h1><span>Discover a curated collection of export-ready piercing styles for your store.</span><Link to="/products">Explore collection <ArrowRight size={17} /></Link></div>
      <div className="hero-art"><span className="hero-ring" /><span className="hero-gem" /></div>
    </section>
    <section className="buyer-strip"><BadgeCheck size={19} /><div><strong>{isApproved ? `${buyer.companyName} / Approved Buyer` : viewerState === 'pending' ? 'Buyer Approval is pending' : 'Wholesale access for approved buyers'}</strong><span>{isApproved ? `Your ${buyer.assignedMarket} market price list is active.` : 'Browse the catalog now. Prices and Inquiry features unlock after approval.'}</span></div><Globe2 size={19} /></section>
    <section className="section-wrap"><div className="section-title"><div><Sparkles size={18} /><h2>Featured piercing</h2></div><Link to="/products">View all</Link></div><div className="catalog-grid">{products.map((product) => <CatalogCard key={product.productId} product={product} />)}</div></section>
    <section className="brand-note"><Gem size={21} /><div><strong>Designed for global buyers</strong><span>Large product visuals, export-ready information, and a simple Request Quote flow.</span></div></section>
  </main>
}
