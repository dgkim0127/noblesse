/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createAdminApi } from '../api/adminApi'
import { createApiClient } from '../api/client'
import { useCommerce } from '../commerce/commerceStore'
import { getCurrentUserIdToken } from '../services/authService'

const AdminAccessContext = createContext(null)

const ownerFallback = {
  adminRole: 'owner',
  permissions: [
    'dashboard.read',
    'buyers.read',
    'buyers.sensitive.read',
    'buyers.review',
    'buyers.suspend',
    'inquiries.read',
    'inquiries.manage',
    'catalog.read',
    'catalog.write',
    'catalog.publish',
    'prices.read',
    'prices.write',
    'quotes.read',
    'quotes.write',
    'analytics.read',
    'admins.read',
    'admins.manage',
    'audit.read',
    'settings.manage',
  ],
}

export function AdminAccessProvider({ children }) {
  const { dataMode, runtimeConfig } = useCommerce()
  const [state, setState] = useState({
    status: dataMode === 'mock' ? 'ready' : 'loading',
    admin: dataMode === 'mock' ? ownerFallback : null,
    error: null,
  })

  const api = useMemo(() => {
    if (!runtimeConfig?.apiBaseUrl) return null
    return createAdminApi(createApiClient({ baseUrl: runtimeConfig.apiBaseUrl }))
  }, [runtimeConfig.apiBaseUrl])

  useEffect(() => {
    if (dataMode === 'mock') {
      setState({ status: 'ready', admin: ownerFallback, error: null })
      return undefined
    }
    let mounted = true
    async function load() {
      try {
        const token = await getCurrentUserIdToken()
        const result = await api.getMe(token)
        if (!mounted) return
        setState({ status: 'ready', admin: result.data || null, error: null })
      } catch (error) {
        if (!mounted) return
        setState({ status: 'error', admin: null, error })
      }
    }
    if (api) load()
    return () => {
      mounted = false
    }
  }, [api, dataMode])

  const value = useMemo(() => {
    const permissions = new Set(state.admin?.permissions || [])
    return {
      ...state,
      hasPermission(permissionKey) {
        return permissions.has(permissionKey)
      },
    }
  }, [state])

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>
}

export function useAdminAccess() {
  return useContext(AdminAccessContext) || {
    status: 'loading',
    admin: null,
    error: null,
    hasPermission: () => false,
  }
}
