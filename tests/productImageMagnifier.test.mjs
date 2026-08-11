import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProductImageMagnifierFrame,
  productImageMagnifierScale,
} from '../src/utils/productImageMagnifier.js'

const rect = {
  left: 100,
  right: 500,
  top: 120,
  width: 400,
  height: 600,
}

test('image magnifier centers the selected point in an aspect-matched preview', () => {
  const frame = createProductImageMagnifierFrame({
    clientX: 300,
    clientY: 420,
    rect,
    viewportWidth: 1400,
    viewportHeight: 900,
  })

  assert.equal(productImageMagnifierScale, 2.5)
  assert.equal(frame.xPercent, 50)
  assert.equal(frame.yPercent, 50)
  assert.equal(frame.lensPercent, 40)
  assert.deepEqual(frame.panel, { left: 518, top: 120, width: 400, height: 600 })
  assert.deepEqual(frame.stage, { scale: 2.5, translateX: -300, translateY: -450 })
})

test('image magnifier clamps the lens at every image edge', () => {
  const topLeft = createProductImageMagnifierFrame({
    clientX: 80,
    clientY: 80,
    rect,
    viewportWidth: 1400,
    viewportHeight: 900,
  })
  const bottomRight = createProductImageMagnifierFrame({
    clientX: 600,
    clientY: 800,
    rect,
    viewportWidth: 1400,
    viewportHeight: 900,
  })

  assert.deepEqual([topLeft.xPercent, topLeft.yPercent], [20, 20])
  assert.deepEqual([bottomRight.xPercent, bottomRight.yPercent], [80, 80])
  assert.equal(topLeft.stage.translateX, 0)
  assert.equal(topLeft.stage.translateY, 0)
  assert.equal(bottomRight.stage.translateX, -600)
  assert.equal(bottomRight.stage.translateY, -900)
})

test('image magnifier hides when the source box or right-side preview space is unsafe', () => {
  assert.equal(createProductImageMagnifierFrame({
    clientX: 0,
    clientY: 0,
    rect: { left: 0, right: 0, top: 0, width: 0, height: 0 },
    viewportWidth: 1400,
    viewportHeight: 900,
  }), null)

  assert.equal(createProductImageMagnifierFrame({
    clientX: Number.NaN,
    clientY: 420,
    rect,
    viewportWidth: 1400,
    viewportHeight: 900,
  }), null)

  assert.equal(createProductImageMagnifierFrame({
    clientX: 1050,
    clientY: 420,
    rect: { ...rect, left: 900, right: 1300 },
    viewportWidth: 1400,
    viewportHeight: 900,
  }), null)
})
