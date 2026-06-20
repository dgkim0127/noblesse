import { useEffect, useMemo, useState } from 'react'
import { createAdminApi } from '../../api/adminApi'
import { createApiClient } from '../../api/client'
import { assertRuntimeConfig, getRuntimeConfig } from '../../config/runtimeConfig'
import { getCurrentUserIdToken, isAuthConfigured } from '../../services/authService'
import { useAdminCopy } from './adminCopy'

function requireAdminApiRuntime(runtimeConfig) {
  assertRuntimeConfig(runtimeConfig)
  if (!isAuthConfigured()) {
    const error = new Error('CONFIGURATION_ERROR')
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
        setState({ data: null, meta: null, error: error?.message || 'ADMIN_API_REQUEST_FAILED', status: 'error' })
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
  const t = useAdminCopy()
  const translatedError = error === 'CONFIGURATION_ERROR'
    ? t.apiState.configError
    : error === 'ADMIN_API_REQUEST_FAILED'
      ? t.apiState.requestFailed
      : error
  if (status === 'loading') return <section className="admin-card"><p>{t.apiState.loading}</p></section>
  if (status === 'error') return <section className="admin-card admin-access-card"><p className="eyebrow">{t.apiState.errorEyebrow}</p><h1>{t.apiState.errorTitle}</h1><p>{translatedError}</p></section>
  return null
}
