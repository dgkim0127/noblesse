import { SALE_STATUS, SOLD_OUT_STATUS } from '../data/catalog'

export function StatusBadge({ status }) {
  const className = status === SALE_STATUS ? 'live' : status === SOLD_OUT_STATUS ? 'soldout' : 'hidden'
  return <span className={`status ${className}`}>{status}</span>
}
