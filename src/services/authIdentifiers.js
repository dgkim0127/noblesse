export function normalizeSignInIdentifier(identifier) {
  const value = String(identifier || '').trim()
  if (!value || value.includes('@')) return value
  return `${value}@gmail.com`
}
