function toFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getPointValue(point, statusKey, statusKeys) {
  if (statusKey === 'all') {
    return statusKeys.reduce((sum, key) => sum + toFiniteNumber(point[key]), 0)
  }

  return toFiniteNumber(point[statusKey])
}

function splitFromLatest(points, bucketSize) {
  if (points.length === 0) return []

  const buckets = []
  const firstBucketSize = points.length % bucketSize || bucketSize
  let offset = 0

  buckets.push(points.slice(0, firstBucketSize))
  offset += firstBucketSize
  while (offset < points.length) {
    buckets.push(points.slice(offset, offset + bucketSize))
    offset += bucketSize
  }

  return buckets
}

export function getCandlestickBucketSize(rangeDays) {
  if (rangeDays <= 7) return 2
  if (rangeDays <= 30) return 3
  return 7
}

export function createCandlestickBuckets(points = [], statusKey = 'all', statusKeys = [], bucketSize = 3) {
  return splitFromLatest(points, Math.max(1, bucketSize)).map((bucket) => {
    const values = bucket.map((point) => getPointValue(point, statusKey, statusKeys))

    return {
      startDate: bucket[0]?.date || '',
      endDate: bucket[bucket.length - 1]?.date || '',
      open: values[0] || 0,
      high: Math.max(0, ...values),
      low: Math.min(...values),
      close: values[values.length - 1] || 0,
      volume: values.reduce((sum, value) => sum + value, 0),
    }
  })
}

export function createMovingAverage(rows = [], windowSize = 3) {
  return rows.map((row, index) => {
    const startIndex = Math.max(0, index - windowSize + 1)
    const window = rows.slice(startIndex, index + 1)
    return window.reduce((sum, item) => sum + item.close, 0) / window.length
  })
}
