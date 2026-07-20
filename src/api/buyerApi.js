import { ApiClientError } from './errors.js'

function requireToken(token) {
  if (!token) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Authentication token is required',
      status: 401,
    })
  }
  return token
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

function unwrap(response) {
  const body = response.data || {}
  return {
    data: body.data,
    meta: body.meta || { requestId: response.requestId },
    requestId: response.requestId || body.meta?.requestId || '',
  }
}

export function createBuyerApi(apiClient) {
  return {
    async getCurrentBuyerProfile(token) {
      const response = await apiClient.apiFetch('/buyer/me', { token: requireToken(token) })
      return response.data?.profile || null
    },

    async getProductPrices(token) {
      const response = await apiClient.apiFetch('/buyer/product-prices', { token: requireToken(token) })
      return response.data?.productPrices || []
    },

    async getInquiries(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/buyer/inquiries${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async getInquiry(inquiryId, token) {
      return unwrap(await apiClient.apiFetch(`/buyer/inquiries/${encodeURIComponent(inquiryId)}`, { token: requireToken(token) }))
    },

    async getInquiryQuote(inquiryId, token) {
      return unwrap(await apiClient.apiFetch(`/buyer/inquiries/${encodeURIComponent(inquiryId)}/quote`, { token: requireToken(token) }))
    },

    async decideQuote(quoteId, input, token) {
      return unwrap(await apiClient.apiFetch(`/buyer/quotes/${encodeURIComponent(quoteId)}/decision`, {
        method: 'POST',
        token: requireToken(token),
        body: input,
      }))
    },

    async downloadQuoteDocument(quoteId, documentId, token) {
      return apiClient.apiFetch(`/buyer/quotes/${encodeURIComponent(quoteId)}/documents/${encodeURIComponent(documentId)}/pdf`, {
        token: requireToken(token),
        headers: { accept: 'application/pdf' },
        responseType: 'blob',
      })
    },

    async createInquiry({ requestMemo = '', items = [] } = {}, token) {
      return unwrap(await apiClient.apiFetch('/buyer/inquiries', {
        method: 'POST',
        token: requireToken(token),
        body: { requestMemo, items },
      }))
    },

    async registerBuyer(input = {}, token) {
      return unwrap(await apiClient.apiFetch('/buyer/register', {
        method: 'POST',
        token: requireToken(token),
        body: input,
      }))
    },
  }
}
