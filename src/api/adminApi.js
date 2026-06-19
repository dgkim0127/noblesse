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

    async getBuyers(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/buyers${buildQuery(params)}`, { token: requireToken(token) }))
    },

    async getProducts(params = {}, token) {
      return unwrap(await apiClient.apiFetch(`/admin/products${buildQuery(params)}`, { token: requireToken(token) }))
    },
  }
}
