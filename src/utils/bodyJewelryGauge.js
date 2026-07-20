export const BODY_JEWELRY_GAUGE_SYSTEM = 'body-jewelry-gauge'

export const bodyJewelryGaugePairs = Object.freeze([
  { gauge: '20G', mm: '0.8' },
  { gauge: '18G', mm: '1.0' },
  { gauge: '16G', mm: '1.2' },
  { gauge: '14G', mm: '1.6' },
  { gauge: '12G', mm: '2.0' },
  { gauge: '10G', mm: '2.5' },
  { gauge: '8G', mm: '3.2' },
  { gauge: '6G', mm: '4.0' },
  { gauge: '4G', mm: '5.0' },
  { gauge: '2G', mm: '6.0' },
  { gauge: '0G', mm: '8.0' },
  { gauge: '00G', mm: '10.0' },
])

function normalizeGauge(value) {
  const token = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!token) return ''
  const withSuffix = token.endsWith('G') ? token : `${token}G`
  return /^(?:00|0|[1-9]\d?)G$/.test(withSuffix) ? withSuffix : token
}

function normalizeMillimeters(value) {
  const token = String(value || '').trim().toLowerCase().replace(/\s*mm$/, '').replace(',', '.')
  if (!token) return ''
  const numeric = Number(token)
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 99) return token
  return token
}

export function getBodyJewelryGaugePairByGauge(value) {
  const gauge = normalizeGauge(value)
  return bodyJewelryGaugePairs.find((pair) => pair.gauge === gauge) || null
}

export function getBodyJewelryGaugePairByMillimeters(value) {
  const mm = normalizeMillimeters(value)
  const numeric = Number(mm)
  if (!Number.isFinite(numeric)) return null
  return bodyJewelryGaugePairs.find((pair) => Number(pair.mm) === numeric) || null
}

export function createBodyJewelryGaugeMeasurement(pair, authority = 'gauge') {
  if (!pair) return null
  return {
    system: BODY_JEWELRY_GAUGE_SYSTEM,
    mm: pair.mm,
    gauge: pair.gauge,
    authority: authority === 'mm' ? 'mm' : 'gauge',
  }
}

function measurementFromLabel(label) {
  const text = String(label || '')
  const gaugeMatch = text.match(/(?:^|[\s/])((?:00|0|[1-9]\d?)\s*G)(?:$|[\s/])/i)
  const mmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*mm/i)
  const gaugePair = getBodyJewelryGaugePairByGauge(gaugeMatch?.[1])
  const mmPair = getBodyJewelryGaugePairByMillimeters(mmMatch?.[1])
  if (gaugePair && mmPair && gaugePair.gauge === mmPair.gauge) return createBodyJewelryGaugeMeasurement(gaugePair)
  if (gaugePair) return createBodyJewelryGaugeMeasurement(gaugePair)
  if (mmPair) return createBodyJewelryGaugeMeasurement(mmPair, 'mm')
  return null
}

export function normalizeBodyJewelryGaugeMeasurement(value = {}, fallbackLabel = '') {
  const fallback = measurementFromLabel(fallbackLabel)
  const hasMeasurement = value && typeof value === 'object' && !Array.isArray(value)
  const hasMm = hasMeasurement && Object.prototype.hasOwnProperty.call(value, 'mm')
  const hasGauge = hasMeasurement && Object.prototype.hasOwnProperty.call(value, 'gauge')
  const mm = hasMm ? normalizeMillimeters(value.mm) : fallback?.mm || ''
  const gauge = hasGauge ? normalizeGauge(value.gauge) : fallback?.gauge || ''
  const authority = hasMeasurement && value.authority === 'mm' ? 'mm' : fallback?.authority || 'gauge'
  return {
    system: BODY_JEWELRY_GAUGE_SYSTEM,
    mm,
    gauge,
    authority,
  }
}

export function getResolvedBodyJewelryGaugePair(measurement = {}, authority = measurement?.authority) {
  const normalized = normalizeBodyJewelryGaugeMeasurement(measurement)
  const mmPair = getBodyJewelryGaugePairByMillimeters(normalized.mm)
  const gaugePair = getBodyJewelryGaugePairByGauge(normalized.gauge)
  if (mmPair && gaugePair && mmPair.gauge === gaugePair.gauge) return mmPair
  if (authority === 'mm') return mmPair
  if (authority === 'gauge') return gaugePair
  return mmPair || gaugePair || null
}

export function isValidBodyJewelryGaugeMeasurement(measurement = {}) {
  const normalized = normalizeBodyJewelryGaugeMeasurement(measurement)
  const mmPair = getBodyJewelryGaugePairByMillimeters(normalized.mm)
  const gaugePair = getBodyJewelryGaugePairByGauge(normalized.gauge)
  return Boolean(mmPair && gaugePair && mmPair.gauge === gaugePair.gauge)
}

export function hasBodyJewelryGaugeConflict(measurement = {}) {
  const normalized = normalizeBodyJewelryGaugeMeasurement(measurement)
  const mmPair = getBodyJewelryGaugePairByMillimeters(normalized.mm)
  const gaugePair = getBodyJewelryGaugePairByGauge(normalized.gauge)
  return Boolean(mmPair && gaugePair && mmPair.gauge !== gaugePair.gauge)
}

export function formatBodyJewelryGaugeMeasurement(measurement = {}) {
  const normalized = normalizeBodyJewelryGaugeMeasurement(measurement)
  const parts = []
  if (normalized.mm) parts.push(`${normalized.mm}mm`)
  if (normalized.gauge) parts.push(normalized.gauge)
  return parts.join(' / ')
}
