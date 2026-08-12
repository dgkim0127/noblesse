const stoneCountPattern = /(?:^|[^\d])(\d{1,3})\s*방(?:[^\d]|$)/

export function getPiercingStoneCount(product) {
  const sources = [
    product?.nameKo,
    product?.nameEn,
    product?.specs?.sourceArchive,
  ]

  for (const source of sources) {
    const match = String(source || '').match(stoneCountPattern)
    if (!match) continue
    const count = Number(match[1])
    if (Number.isInteger(count) && count >= 0) return count
  }

  return null
}

export function comparePiercingStoneCountAscending(a, b) {
  const countA = getPiercingStoneCount(a)
  const countB = getPiercingStoneCount(b)

  if (countA === null && countB === null) return Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)
  if (countA === null) return 1
  if (countB === null) return -1
  return countA - countB || Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)
}
