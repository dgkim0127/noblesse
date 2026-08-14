import { HttpsError } from 'firebase-functions/v2/https'

export const marketCurrencies = Object.freeze({
  KR: 'KRW',
  JP: 'JPY',
  US: 'USD',
  CN: 'CNY',
  GLOBAL: 'USD',
})

const zeroDecimalCurrencies = new Set(['KRW', 'JPY'])

export const assertString = (value, field, { max = 2000, min = 0, required = false } = {}) => {
  const result = typeof value === 'string' ? value.trim() : ''
  if ((required && !result) || result.length < min || result.length > max) {
    throw new HttpsError('invalid-argument', `${field} is invalid.`)
  }
  return result
}

export const assertIdentifier = (value, field, pattern) => {
  const result = assertString(value, field, { required: true, max: 80 })
  if (!pattern.test(result)) throw new HttpsError('invalid-argument', `${field} is invalid.`)
  return result
}

export const assertArray = (value, field, { max = 100, itemMax = 160 } = {}) => {
  if (!Array.isArray(value) || value.length > max) throw new HttpsError('invalid-argument', `${field} is invalid.`)
  return value.map((item) => assertString(item, field, { required: true, max: itemMax }))
}

export const currencyScale = (currency) => zeroDecimalCurrencies.has(currency) ? 1 : 100

export const parseMinorAmount = (value, currency, field) => {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  const scale = currencyScale(currency)
  const precision = scale === 1 ? 0 : 2
  const expression = precision === 0 ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/
  if (!expression.test(raw)) throw new HttpsError('invalid-argument', `${field} is invalid.`)

  const [whole, fraction = ''] = raw.split('.')
  const minor = Number(whole) * scale + Number((fraction + '0'.repeat(precision)).slice(0, precision) || 0)
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > 9_000_000_000_000_000) {
    throw new HttpsError('invalid-argument', `${field} is outside the supported range.`)
  }
  return minor
}

export const amountFromMinor = (minor, currency) => Number(minor || 0) / currencyScale(currency)

export const assertImagePaths = (productId, imagePaths) => {
  if (!imagePaths || typeof imagePaths !== 'object') {
    throw new HttpsError('failed-precondition', 'Four prepared WebP image variants are required before publishing.')
  }

  for (const variant of ['thumb', 'card', 'detail', 'zoom']) {
    const path = imagePaths[variant]
    if (typeof path !== 'string' || !path.startsWith(`noblesse/products/${productId}/${variant}/`) || !path.endsWith('.webp')) {
      throw new HttpsError('failed-precondition', 'Four prepared WebP image variants are required before publishing.')
    }
  }
}

export const assertWebpBuffer = (buffer) => {
  const isWebp = Buffer.isBuffer(buffer)
    && buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (!isWebp || buffer.length >= 10 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Each image must be a WebP file smaller than 10MB.')
  }
  return buffer
}
