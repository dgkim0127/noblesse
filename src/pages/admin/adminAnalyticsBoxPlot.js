function toFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function getQuantile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0

  const index = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const lower = sortedValues[lowerIndex]
  const upper = sortedValues[upperIndex]

  return lower + ((upper - lower) * (index - lowerIndex))
}

export function createBoxPlotSummary(values = []) {
  const sortedValues = values.map(toFiniteNumber).sort((a, b) => a - b)
  if (sortedValues.length === 0) {
    return { lowerQuartile: 0, maximum: 0, median: 0, minimum: 0, total: 0, upperQuartile: 0 }
  }

  return {
    minimum: sortedValues[0],
    lowerQuartile: getQuantile(sortedValues, 0.25),
    median: getQuantile(sortedValues, 0.5),
    upperQuartile: getQuantile(sortedValues, 0.75),
    maximum: sortedValues[sortedValues.length - 1],
    total: sortedValues.reduce((sum, value) => sum + value, 0),
  }
}

export function createStatusBoxPlotRows(points = [], series = []) {
  return series.map((item) => ({
    ...item,
    ...createBoxPlotSummary(points.map((point) => point[item.key])),
  }))
}
