import { useEffect, useMemo, useState } from 'react'
import { createAdminApi } from '../../api/adminApi'
import { createApiClient } from '../../api/client'
import { assertRuntimeConfig, getRuntimeConfig } from '../../config/runtimeConfig'
import { getCurrentUserIdToken, isAuthConfigured } from '../../services/authService'

function requireAdminApiRuntime(runtimeConfig) {
  assertRuntimeConfig(runtimeConfig)
  if (!isAuthConfigured()) {
    const error = new Error('Firebase client configuration is required for admin API access.')
    error.code = 'CONFIGURATION_ERROR'
    throw error
  }
}

export function useAdminApiResource(loader, deps = []) {
  const runtimeConfig = useMemo(() => getRuntimeConfig(), [])
  const [state, setState] = useState({ data: null, meta: null, error: '', status: 'loading' })

  useEffect(() => {
    let isMounted = true

    async function load() {
      setState((current) => ({ ...current, error: '', status: 'loading' }))
      try {
        requireAdminApiRuntime(runtimeConfig)
        const token = await getCurrentUserIdToken()
        const api = createAdminApi(createApiClient({ baseUrl: runtimeConfig.apiBaseUrl }))
        const result = await loader(api, token)
        if (!isMounted) return
        setState({ data: result.data, meta: result.meta || null, error: '', status: 'ready' })
      } catch (error) {
        if (!isMounted) return
        setState({ data: null, meta: null, error: error?.message || 'Admin API request failed.', status: 'error' })
      }
    }

    load()

    return () => {
      isMounted = false
    }
    // Caller-provided deps intentionally control admin resource reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

export function useAdminApiMutation() {
  const runtimeConfig = useMemo(() => getRuntimeConfig(), [])

  return async function mutate(mutator) {
    requireAdminApiRuntime(runtimeConfig)
    const token = await getCurrentUserIdToken()
    const api = createAdminApi(createApiClient({ baseUrl: runtimeConfig.apiBaseUrl }))
    return mutator(api, token)
  }
}

export function AdminApiState({ error, status }) {
  if (status === 'loading') return <section className="admin-card"><p>Loading admin API data...</p></section>
  if (status === 'error') return <section className="admin-card admin-access-card"><p className="eyebrow">Admin API Error</p><h1>Unable to load admin data</h1><p>{error}</p></section>
  return null
}
