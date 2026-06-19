const dataModes = new Set(['api', 'mock'])

function readEnvValue(env, key) {
  return typeof env?.[key] === 'string' ? env[key].trim() : ''
}

export function getRuntimeConfig(env = import.meta.env) {
  const isDev = Boolean(env?.DEV)
  const isProd = Boolean(env?.PROD)
  const requestedMode = readEnvValue(env, 'VITE_NOBLESSE_DATA_MODE')
  const dataMode = requestedMode || (isDev ? 'mock' : 'api')
  const apiBaseUrl = readEnvValue(env, 'VITE_API_BASE_URL') || '/api'
  const errors = []

  if (!dataModes.has(dataMode)) {
    errors.push('Invalid VITE_NOBLESSE_DATA_MODE. Use api or mock.')
  }

  if (isProd && dataMode === 'mock') {
    errors.push('Mock data mode is not allowed in release builds.')
  }

  if (dataMode === 'api' && !apiBaseUrl) {
    errors.push('API base URL is required for API data mode.')
  }

  return {
    apiBaseUrl,
    dataMode,
    errors,
    isConfigured: errors.length === 0,
    isDev,
    isProd,
    stagingLabel: readEnvValue(env, 'VITE_NOBLESSE_ENV_LABEL') || (isProd ? 'release-api' : 'development'),
  }
}

export function assertRuntimeConfig(config) {
  if (!config?.isConfigured) {
    throw new Error(config?.errors?.[0] || 'Runtime configuration is invalid.')
  }
}
