const inquiryDraftStoragePrefix = 'noblesse:inquiry-list:v1:'
const maxDraftItems = 100
const maxSelectedOptions = 6

const normalizeOptionalText = (value) => typeof value === 'string' ? value.trim() : ''

const normalizeSelectedOptions = (value) => {
  if (!Array.isArray(value)) return []

  return value.slice(0, maxSelectedOptions).flatMap((option) => {
    const groupId = normalizeOptionalText(option?.groupId)
    const valueId = normalizeOptionalText(option?.valueId)
    return groupId && valueId ? [{ groupId, valueId }] : []
  })
}

export const getInquiryDraftStorageKey = (buyerId) => (
  `${inquiryDraftStoragePrefix}${encodeURIComponent(normalizeOptionalText(buyerId))}`
)

export const normalizeInquiryDraftItems = (value) => {
  if (!Array.isArray(value)) return []

  return value.slice(0, maxDraftItems).flatMap((item) => {
    const productId = normalizeOptionalText(item?.productId)
    const quantity = Number(item?.quantity)
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) return []

    return [{
      productId,
      color: normalizeOptionalText(item?.color),
      size: normalizeOptionalText(item?.size),
      selectedOptions: normalizeSelectedOptions(item?.selectedOptions),
      quantity,
    }]
  })
}

export const loadInquiryDraft = (storage, buyerId) => {
  if (!storage || !normalizeOptionalText(buyerId)) return []

  try {
    const value = JSON.parse(storage.getItem(getInquiryDraftStorageKey(buyerId)) || '[]')
    return normalizeInquiryDraftItems(value)
  } catch {
    return []
  }
}

export const saveInquiryDraft = (storage, buyerId, items) => {
  if (!storage || !normalizeOptionalText(buyerId)) return

  const key = getInquiryDraftStorageKey(buyerId)
  const normalizedItems = normalizeInquiryDraftItems(items)
  if (normalizedItems.length === 0) {
    storage.removeItem(key)
    return
  }

  storage.setItem(key, JSON.stringify(normalizedItems))
}

export const clearInquiryDraft = (storage, buyerId) => {
  if (!storage || !normalizeOptionalText(buyerId)) return
  storage.removeItem(getInquiryDraftStorageKey(buyerId))
}
