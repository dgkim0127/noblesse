import assert from 'node:assert/strict'
import test from 'node:test'
import { adaptApiProduct } from '../src/services/apiProductAdapter.js'

test('legacy opal typo is corrected in catalog colors and localized option labels', () => {
  const product = adaptApiProduct({
    code: 'NB-LEGACY-OPAL',
    nameKo: 'Legacy opal',
    colors: ['\uC624\uC54C', '\uD551\uD06C'],
    optionGroups: [{
      id: 'legacy-color',
      legacyKey: 'color',
      values: [{
        id: 'opal',
        labels: { kr: '\uC624\uC54C', en: '\uC624\uC54C', jp: '\uC624\uC54C', 'zh-TW': '\uC624\uC54C' },
      }],
    }],
  })

  assert.deepEqual(product.colors, ['\uC624\uD314', '\uD551\uD06C'])
  assert.deepEqual(product.optionGroups[0].values[0].labels, {
    kr: '\uC624\uD314',
    en: 'Opal',
    jp: '\u30AA\u30D1\u30FC\u30EB',
    'zh-TW': '\u6B50\u6CCA',
    cn: '\u6B50\u6CCA',
  })
})
