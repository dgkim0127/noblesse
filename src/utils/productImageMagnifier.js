export const productImageMagnifierScale = 2.5

const panelGap = 18
const panelMaxWidth = 560
const panelMinWidth = 260
const viewportTopInset = 88
const viewportEdgeInset = 16

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

export function createProductImageMagnifierFrame({
  clientX,
  clientY,
  rect,
  viewportWidth,
  viewportHeight,
  scale = productImageMagnifierScale,
}) {
  const safeScale = Number(scale)
  const width = Number(rect?.width)
  const height = Number(rect?.height)
  const right = Number(rect?.right)
  const top = Number(rect?.top)
  const left = Number(rect?.left)
  const safeViewportWidth = Number(viewportWidth)
  const safeViewportHeight = Number(viewportHeight)
  const safeClientX = Number(clientX)
  const safeClientY = Number(clientY)

  if (
    !Number.isFinite(safeScale)
    || safeScale <= 1
    || !Number.isFinite(width)
    || !Number.isFinite(height)
    || width <= 0
    || height <= 0
    || !Number.isFinite(right)
    || !Number.isFinite(top)
    || !Number.isFinite(left)
    || !Number.isFinite(safeViewportWidth)
    || !Number.isFinite(safeViewportHeight)
    || !Number.isFinite(safeClientX)
    || !Number.isFinite(safeClientY)
  ) return null

  const availableRight = safeViewportWidth - right - panelGap - viewportEdgeInset
  const availableHeight = safeViewportHeight - viewportTopInset - viewportEdgeInset
  let panelWidth = Math.min(width, panelMaxWidth, availableRight)
  let panelHeight = panelWidth * (height / width)

  if (panelHeight > availableHeight) {
    panelHeight = availableHeight
    panelWidth = panelHeight * (width / height)
  }
  if (panelWidth < panelMinWidth || panelHeight <= 0) return null

  const lensHalfPercent = 50 / safeScale
  const xPercent = clamp(((safeClientX - left) / width) * 100, lensHalfPercent, 100 - lensHalfPercent)
  const yPercent = clamp(((safeClientY - top) / height) * 100, lensHalfPercent, 100 - lensHalfPercent)
  const panelTop = clamp(top, viewportTopInset, safeViewportHeight - panelHeight - viewportEdgeInset)

  return {
    xPercent,
    yPercent,
    lensPercent: 100 / safeScale,
    panel: {
      left: right + panelGap,
      top: panelTop,
      width: panelWidth,
      height: panelHeight,
    },
    stage: {
      scale: safeScale,
      translateX: panelWidth * (0.5 - safeScale * (xPercent / 100)),
      translateY: panelHeight * (0.5 - safeScale * (yPercent / 100)),
    },
  }
}
