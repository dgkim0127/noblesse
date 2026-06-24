import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminApi } from '../src/api/adminApi.js'
import { ApiClientError } from '../src/api/errors.js'

function createMockApiClient(response = {}) {
  const calls = []
  return {
    calls,
    client: {
      async apiFetch(path, options = {}) {
        calls.push({ path, options })
        return {
          data: {
            data: response.data ?? {},
            meta: response.meta ?? { requestId: 'req-test' },
          },
          requestId: 'req-test',
          status: 200,
        }
      },
    },
  }
}

test('admin api requires token before calling backend', async () => {
  const { calls, client } = createMockApiClient()
  const adminApi = createAdminApi(client)

  await assert.rejects(
    () => adminApi.getDashboard(''),
    (error) => error instanceof ApiClientError && error.code === 'UNAUTHORIZED'
  )
  assert.equal(calls.length, 0)
})

test('admin dashboard calls contract route with bearer token option', async () => {
  const { calls, client } = createMockApiClient({ data: { inquiries: { total: 1 } } })
  const adminApi = createAdminApi(client)

  const result = await adminApi.getDashboard('admin-token')

  assert.equal(calls[0].path, '/admin/dashboard')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.equal(result.data.inquiries.total, 1)
  assert.equal(result.requestId, 'req-test')
})

test('admin inquiry list serializes supported query params', async () => {
  const { calls, client } = createMockApiClient({ data: { inquiries: [] } })
  const adminApi = createAdminApi(client)

  await adminApi.getInquiries({ status: 'requested', market: 'JP', q: 'NB-001', limit: 20, cursor: '' }, 'admin-token')

  assert.equal(calls[0].path, '/admin/inquiries?status=requested&market=JP&q=NB-001&limit=20')
})

test('admin memo update uses PATCH and adminMemo body only', async () => {
  const { calls, client } = createMockApiClient({ data: { inquiry: { adminMemo: 'Follow up' }, auditLogId: 'audit-1' } })
  const adminApi = createAdminApi(client)

  const result = await adminApi.updateInquiryMemo('11111111-1111-4111-8111-111111111111', 'Follow up', 'admin-token')

  assert.equal(calls[0].path, '/admin/inquiries/11111111-1111-4111-8111-111111111111/memo')
  assert.equal(calls[0].options.method, 'PATCH')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.deepEqual(calls[0].options.body, { adminMemo: 'Follow up' })
  assert.equal(result.data.auditLogId, 'audit-1')
})

test('admin inquiry status update uses PATCH and status body only', async () => {
  const { calls, client } = createMockApiClient({ data: { inquiry: { status: 'quoted' }, auditLogId: 'audit-1' } })
  const adminApi = createAdminApi(client)

  const result = await adminApi.updateInquiryStatus('11111111-1111-4111-8111-111111111111', 'quoted', 'admin-token')

  assert.equal(calls[0].path, '/admin/inquiries/11111111-1111-4111-8111-111111111111/status')
  assert.equal(calls[0].options.method, 'PATCH')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.deepEqual(calls[0].options.body, { status: 'quoted' })
  assert.equal(result.data.auditLogId, 'audit-1')
})

test('admin buyers and products call list routes', async () => {
  const { calls, client } = createMockApiClient()
  const adminApi = createAdminApi(client)

  await adminApi.getBuyers({ status: 'approved' }, 'admin-token')
  await adminApi.getProducts({ visible: true, category: 'piercing' }, 'admin-token')
  await adminApi.getCategories({ visible: false, q: 'ring' }, 'admin-token')

  assert.equal(calls[0].path, '/admin/buyers?status=approved')
  assert.equal(calls[1].path, '/admin/products?visible=true&category=piercing')
  assert.equal(calls[2].path, '/admin/categories?visible=false&q=ring')
})

test('admin prices calls price list route with filters', async () => {
  const { calls, client } = createMockApiClient({ data: { prices: [] } })
  const adminApi = createAdminApi(client)

  await adminApi.getPrices({ market: 'JP', active: true, q: 'NB-001' }, 'admin-token')

  assert.equal(calls[0].path, '/admin/prices?market=JP&active=true&q=NB-001')
  assert.equal(calls[0].options.token, 'admin-token')
})

test('admin price writes call protected price routes', async () => {
  const { calls, client } = createMockApiClient({ data: { price: { id: 'price-1' }, auditLogId: 'audit-1' } })
  const adminApi = createAdminApi(client)

  await adminApi.createPrice({
    productCode: 'NB-001',
    market: 'JP',
    currency: 'JPY',
    wholesalePrice: 1200,
    moq: 20,
  }, 'admin-token')
  await adminApi.updatePrice('11111111-1111-4111-8111-111111111111', { isActive: false }, 'admin-token')

  assert.equal(calls[0].path, '/admin/prices')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.deepEqual(calls[0].options.body, {
    productCode: 'NB-001',
    market: 'JP',
    currency: 'JPY',
    wholesalePrice: 1200,
    moq: 20,
  })
  assert.equal(calls[1].path, '/admin/prices/11111111-1111-4111-8111-111111111111')
  assert.equal(calls[1].options.method, 'PATCH')
  assert.equal(calls[1].options.token, 'admin-token')
  assert.deepEqual(calls[1].options.body, { isActive: false })
})

test('admin FX methods call protected automatic pricing routes', async () => {
  const { calls, client } = createMockApiClient({ data: { prices: [] } })
  const adminApi = createAdminApi(client)

  await adminApi.getFxStatus('admin-token')
  await adminApi.getFxRates('admin-token')
  await adminApi.getFxPrices({ status: 'pending_rate', market: 'US' }, 'admin-token')
  await adminApi.evaluateFxPrices({ updateThresholdBps: 500 }, 'admin-token')
  await adminApi.setFxProductMarketMode('22222222-2222-4222-8222-222222222222', 'US', { pricingMode: 'fx_auto', currency: 'USD' }, 'admin-token')
  await adminApi.pauseFxPrice('11111111-1111-4111-8111-111111111111', { reason: 'Manual review' }, 'admin-token')
  await adminApi.resumeFxPrice('11111111-1111-4111-8111-111111111111', 'admin-token')

  assert.deepEqual(calls.map((call) => `${call.options.method || 'GET'} ${call.path}`), [
    'GET /admin/fx/status',
    'GET /admin/fx/rates',
    'GET /admin/fx/prices?status=pending_rate&market=US',
    'POST /admin/fx/evaluate',
    'PUT /admin/fx/products/22222222-2222-4222-8222-222222222222/markets/US/mode',
    'POST /admin/fx/prices/11111111-1111-4111-8111-111111111111/pause',
    'POST /admin/fx/prices/11111111-1111-4111-8111-111111111111/resume',
  ])
  assert.deepEqual(calls[3].options.body, { updateThresholdBps: 500 })
  assert.deepEqual(calls[4].options.body, { pricingMode: 'fx_auto', currency: 'USD' })
  assert.deepEqual(calls[5].options.body, { reason: 'Manual review' })
})

test('admin quotes call list detail and create routes', async () => {
  const { calls, client } = createMockApiClient({ data: { quotes: [], quote: { id: 'quote-1' } } })
  const adminApi = createAdminApi(client)

  await adminApi.getQuotes({ status: 'draft', q: 'INQ' }, 'admin-token')
  await adminApi.getQuote('11111111-1111-4111-8111-111111111111', 'admin-token')
  await adminApi.createQuote({ inquiryId: '22222222-2222-4222-8222-222222222222', leadTime: '2 weeks' }, 'admin-token')
  await adminApi.updateQuoteStatus('33333333-3333-4333-8333-333333333333', 'sent', 'admin-token')

  assert.equal(calls[0].path, '/admin/quotes?status=draft&q=INQ')
  assert.equal(calls[1].path, '/admin/quotes/11111111-1111-4111-8111-111111111111')
  assert.equal(calls[2].path, '/admin/quotes')
  assert.equal(calls[2].options.method, 'POST')
  assert.deepEqual(calls[2].options.body, {
    inquiryId: '22222222-2222-4222-8222-222222222222',
    leadTime: '2 weeks',
    shippingNote: '',
    adminMemo: '',
  })
  assert.equal(calls[3].path, '/admin/quotes/33333333-3333-4333-8333-333333333333/status')
  assert.equal(calls[3].options.method, 'PATCH')
  assert.deepEqual(calls[3].options.body, { status: 'sent' })
})

test('admin buyer detail calls detail route', async () => {
  const { calls, client } = createMockApiClient({ data: { buyer: { id: 'buyer-1' }, agreements: [], recentInquiries: [] } })
  const adminApi = createAdminApi(client)

  const result = await adminApi.getBuyer('11111111-1111-4111-8111-111111111111', 'admin-token')

  assert.equal(calls[0].path, '/admin/buyers/11111111-1111-4111-8111-111111111111')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.equal(result.data.buyer.id, 'buyer-1')
})

test('admin buyer status update uses PATCH and status body only', async () => {
  const { calls, client } = createMockApiClient({ data: { buyer: { status: 'approved' }, auditLogId: 'audit-1' } })
  const adminApi = createAdminApi(client)

  const result = await adminApi.updateBuyerStatus('11111111-1111-4111-8111-111111111111', 'approved', 'admin-token')

  assert.equal(calls[0].path, '/admin/buyers/11111111-1111-4111-8111-111111111111/status')
  assert.equal(calls[0].options.method, 'PATCH')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.deepEqual(calls[0].options.body, { status: 'approved' })
  assert.equal(result.data.auditLogId, 'audit-1')
})

test('admin product visibility update uses PATCH and isVisible body only', async () => {
  const { calls, client } = createMockApiClient({ data: { product: { isVisible: false }, auditLogId: 'audit-1' } })
  const adminApi = createAdminApi(client)

  const result = await adminApi.updateProductVisibility('11111111-1111-4111-8111-111111111111', false, 'admin-token')

  assert.equal(calls[0].path, '/admin/products/11111111-1111-4111-8111-111111111111/visibility')
  assert.equal(calls[0].options.method, 'PATCH')
  assert.equal(calls[0].options.token, 'admin-token')
  assert.deepEqual(calls[0].options.body, { isVisible: false })
  assert.equal(result.data.auditLogId, 'audit-1')
})

test('admin product and category writes call protected admin routes', async () => {
  const { calls, client } = createMockApiClient({ data: { auditLogId: 'audit-1' } })
  const adminApi = createAdminApi(client)

  await adminApi.createProduct({ code: 'NB-999', nameEn: 'Synthetic' }, 'admin-token')
  await adminApi.updateProduct('11111111-1111-4111-8111-111111111111', { nameEn: 'Updated' }, 'admin-token')
  await adminApi.createCategory({ categoryId: 'synthetic', nameEn: 'Synthetic', slug: 'synthetic' }, 'admin-token')
  await adminApi.updateCategory('22222222-2222-4222-8222-222222222222', { isVisible: false }, 'admin-token')

  assert.deepEqual(calls.map((call) => `${call.options.method || 'GET'} ${call.path}`), [
    'POST /admin/products',
    'PATCH /admin/products/11111111-1111-4111-8111-111111111111',
    'POST /admin/categories',
    'PATCH /admin/categories/22222222-2222-4222-8222-222222222222',
  ])
  assert.equal(calls[0].options.token, 'admin-token')
  assert.equal(calls[0].options.body.code, 'NB-999')
  assert.equal(calls[3].options.body.isVisible, false)
})
