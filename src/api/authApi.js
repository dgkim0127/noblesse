export function createAuthApi(apiClient) {
  return {
    async resolveLoginIdentifier(identifier) {
      const response = await apiClient.apiFetch('/auth/resolve-login-identifier', {
        method: 'POST',
        body: { identifier },
      })
      return response.data?.data?.email || ''
    },
  }
}
