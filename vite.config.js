import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function getFirebaseHostingProxyTarget(mode) {
  const apiBaseUrl = String(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL || '').trim()
  if (!apiBaseUrl) return null

  try {
    const apiUrl = new URL(apiBaseUrl)
    return ['http:', 'https:'].includes(apiUrl.protocol) ? apiUrl.origin : null
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const firebaseHostingProxyTarget = getFirebaseHostingProxyTarget(mode)

  return {
    plugins: [react()],
    server: firebaseHostingProxyTarget
      ? {
          proxy: {
            '/__/firebase': {
              target: firebaseHostingProxyTarget,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
  }
})
