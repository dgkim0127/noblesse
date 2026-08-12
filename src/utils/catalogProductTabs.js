function tabFilters(tab) {
  if (Array.isArray(tab?.filters)) return tab.filters
  if (tab?.param && (tab?.value || Array.isArray(tab?.values))) return [tab]
  return []
}

function expectedFilterValues(filter) {
  if (Array.isArray(filter?.values)) return filter.values.filter(Boolean)
  return filter?.value ? [filter.value] : []
}

export function isCatalogProductTabExplicitlySelected(tab, searchParams) {
  const filters = tabFilters(tab)
  if (!filters.length || !searchParams) return false

  return filters.every((filter) => {
    const expectedValues = expectedFilterValues(filter)
    const directValues = searchParams.getAll(filter.param)
    return expectedValues.length > 0 && expectedValues.every((value) => directValues.includes(value))
  })
}

export function getExplicitCatalogProductTabKey(tabs, searchParams) {
  return (tabs || []).find((tab) => !tab?.clear && isCatalogProductTabExplicitlySelected(tab, searchParams))?.key || ''
}
