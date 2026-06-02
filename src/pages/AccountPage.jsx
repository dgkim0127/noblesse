import { BadgeCheck, Clock3, UserRound } from 'lucide-react'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function AccountPage() {
  const { buyer, viewerState } = useCommerce()
  return <main className="content"><div className="page-title"><div><p>BUYER PROFILE</p><h1>Buyer access</h1></div></div><section className="account-panel">{viewerState === 'guest' ? <><UserRound size={25} /><h2>Guest buyer</h2><p>Browse the catalog and contact Noblesse to request Buyer Approval.</p></> : viewerState === 'pending' ? <><Clock3 size={25} /><h2>Buyer Approval pending</h2><p>{buyer.companyName} is waiting for review. Prices and Inquiry features will unlock after approval.</p></> : <><BadgeCheck size={25} /><h2>{buyer.companyName}</h2><p>{buyer.contactName} · {buyer.country} · {buyer.assignedMarket.toUpperCase()} market</p><strong>{buyer.discountRate}% buyer discount · minimum inquiry {formatMoney(buyer.minOrderAmount, buyer.currency)}</strong></>}</section></main>
}
