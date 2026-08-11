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
  const panelSize = Math.floor(Math.min(width, height, panelMaxWidth, availableRight, availableHeight))
  if (panelSize < panelMinWidth) return null

  const sourceShortSide = Math.min(width, height)
  const sourceToPanelScale = panelSize / sourceShortSide
  const renderWidth = Math.round(width * sourceToPanelScale)
  const renderHeight = Math.round(height * sourceToPanelScale)
  const lensSize = Math.round(sourceShortSide / safeScale)
  const lensHalfXPercent = (lensSize / (2 * width)) * 100
  const lensHalfYPercent = (lensSize / (2 * height)) * 100
  const xPercent = clamp(((safeClientX - left) / width) * 100, lensHalfXPercent, 100 - lensHalfXPercent)
  const yPercent = clamp(((safeClientY - top) / height) * 100, lensHalfYPercent, 100 - lensHalfYPercent)
  const lensCenterX = width * (xPercent / 100)
  const lensCenterY = height * (yPercent / 100)
  const panelTop = clamp(
    Math.round(top),
    viewportTopInset,
    Math.floor(safeViewportHeight - panelSize - viewportEdgeInset),
  )

  return {
    xPercent,
    yPercent,
    lensPercent: 100 / safeScale,
    lens: {
      left: Math.round(lensCenterX - (lensSize / 2)),
      top: Math.round(lensCenterY - (lensSize / 2)),
      width: lensSize,
      height: lensSize,
    },
    panel: {
      left: Math.round(right + panelGap),
      top: panelTop,
      width: panelSize,
      height: panelSize,
    },
    render: {
      width: renderWidth,
      height: renderHeight,
    },
    stage: {
      scale: safeScale,
      translateX: Math.round((panelSize / 2) - (safeScale * renderWidth * (xPercent / 100))),
      translateY: Math.round((panelSize / 2) - (safeScale * renderHeight * (yPercent / 100))),
    },
  }
}
