export function normalizeSignInIdentifier(identifier) {
  return String(identifier || '').trim()
}

export function isEmailIdentifier(identifier) {
  return normalizeSignInIdentifier(identifier).includes('@')
}

export function isSafeLoginIdentifier(identifier) {
  const value = normalizeSignInIdentifier(identifier)
  return Boolean(value) && value.length <= 120 && !/\s/.test(value) && !hasControlCharacter(value)
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
}
