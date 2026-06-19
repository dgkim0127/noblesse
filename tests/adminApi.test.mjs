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

test('admin buyers and products call read-only list routes', async () => {
  const { calls, client } = createMockApiClient()
  const adminApi = createAdminApi(client)

  await adminApi.getBuyers({ status: 'approved' }, 'admin-token')
  await adminApi.getProducts({ visible: true, category: 'piercing' }, 'admin-token')

  assert.equal(calls[0].path, '/admin/buyers?status=approved')
  assert.equal(calls[1].path, '/admin/products?visible=true&category=piercing')
})
