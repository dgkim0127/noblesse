import { EyeOff } from 'lucide-react'
import { formatWon, formatYen } from '../utils/commerce'

export function PriceBlock({ approvedMode, krw, jpy }) {
  if (!approvedMode) {
    return (
      <div className="price-locked">
        <EyeOff size={16} />
        <span>승인 후 공개</span>
      </div>
    )
  }

  return (
    <div className="price-block">
      <strong>{formatWon(krw)}</strong>
      <em>{formatYen(jpy)}</em>
    </div>
  )
}
