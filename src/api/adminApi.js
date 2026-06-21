import { ApiClientError } from './errors.js'

function requireToken(token) {
  if (!token) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication token is required',
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

export function createAdminApi(apiClient) {
  return {
    async getDashboard(token) {
      return unwrap(await apiClient.apiFetch('/admin/dashboard', { token: requireToken(token) }))
    },

    async getInquiries(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/inquiries${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async getInquiry(inquiryId, token) {
      return unwrap(await apiClient.apiFetch(`/admin/inquiries/${encodeURIComponent(inquiryId)}`, { token: requireToken(token) }))
    },

    async updateInquiryMemo(inquiryId, adminMemo, token) {
      return unwrap(await apiClient.apiFetch(`/admin/inquiries/${encodeURIComponent(inquiryId)}/memo`, {
        method: 'PATCH',
        token: requireToken(token),
        body: { adminMemo },
      }))
    },

    async updateInquiryStatus(inquiryId, status, token) {
      return unwrap(await apiClient.apiFetch(`/admin/inquiries/${encodeURIComponent(inquiryId)}/status`, {
        method: 'PATCH',
        token: requireToken(token),
        body: { status },
      }))
    },

    async getBuyers(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/buyers${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async getBuyer(buyerId, token) {
      return unwrap(await apiClient.apiFetch(`/admin/buyers/${encodeURIComponent(buyerId)}`, { token: requireToken(token) }))
    },

    async updateBuyerStatus(buyerId, status, token) {
      return unwrap(await apiClient.apiFetch(`/admin/buyers/${encodeURIComponent(buyerId)}/status`, {
        method: 'PATCH',
        token: requireToken(token),
        body: { status },
      }))
    },

    async getProducts(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/products${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async createProduct(input = {}, token) {
      return unwrap(await apiClient.apiFetch('/admin/products', {
        method: 'POST',
        token: requireToken(token),
        body: input,
      }))
    },

    async updateProduct(productId, input = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        token: requireToken(token),
        body: input,
      }))
    },

    async uploadProductImages(productId, formData, token) {
      return unwrap(await apiClient.apiFetch(`/admin/products/${encodeURIComponent(productId)}/images`, {
        method: 'POST',
        token: requireToken(token),
        body: formData,
      }))
    },

    async getCategories(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/categories${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async createCategory(input = {}, token) {
      return unwrap(await apiClient.apiFetch('/admin/categories', {
        method: 'POST',
        token: requireToken(token),
        body: input,
      }))
    },

    async updateCategory(categoryId, input = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/categories/${encodeURIComponent(categoryId)}`, {
        method: 'PATCH',
        token: requireToken(token),
        body: input,
      }))
    },

    async getPrices(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/prices${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async createPrice(input = {}, token) {
      return unwrap(await apiClient.apiFetch('/admin/prices', {
        method: 'POST',
        token: requireToken(token),
        body: input,
      }))
    },

    async updatePrice(priceId, input = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/prices/${encodeURIComponent(priceId)}`, {
        method: 'PATCH',
        token: requireToken(token),
        body: input,
      }))
    },

    async getQuotes(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/quotes${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async getQuote(quoteId, token) {
      return unwrap(await apiClient.apiFetch(`/admin/quotes/${encodeURIComponent(quoteId)}`, { token: requireToken(token) }))
    },

    async updateQuoteStatus(quoteId, status, token) {
      return unwrap(await apiClient.apiFetch(`/admin/quotes/${encodeURIComponent(quoteId)}/status`, {
        method: 'PATCH',
        token: requireToken(token),
        body: { status },
      }))
    },

    async createQuote({ inquiryId, leadTime = '', shippingNote = '', adminMemo = '' } = {}, token) {
      return unwrap(await apiClient.apiFetch('/admin/quotes', {
        method: 'POST',
        token: requireToken(token),
        body: { inquiryId, leadTime, shippingNote, adminMemo },
      }))
    },

    async updateProductVisibility(productId, isVisible, token) {
      return unwrap(await apiClient.apiFetch(`/admin/products/${encodeURIComponent(productId)}/visibility`, {
        method: 'PATCH',
        token: requireToken(token),
        body: { isVisible },
      }))
    },
  }
}
