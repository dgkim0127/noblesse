function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export async function resolveRegistrationCredential({
  authService,
  email,
  password,
  remember = true,
  apiBaseUrl = '/api',
} = {}) {
  const normalizedEmail = normalizeEmail(email)
  const currentUser = authService.getCurrentAuthUser()

  if (currentUser) {
    if (normalizeEmail(currentUser.email) !== normalizedEmail) {
      const sessionError = new Error('Sign out before creating another account.')
      sessionError.code = 'REGISTRATION_SESSION_CONFLICT'
      throw sessionError
    }
    return {
      credential: { user: currentUser },
      existingFirebaseAccount: true,
    }
  }

  try {
    return {
      credential: await authService.registerWithCredentials(email, password, { remember }),
      existingFirebaseAccount: false,
    }
  } catch (registrationError) {
    if (registrationError?.code !== 'auth/email-already-in-use') throw registrationError
    try {
      return {
        credential: await authService.signInWithCredentials(email, password, {
          remember,
          apiBaseUrl,
        }),
        existingFirebaseAccount: true,
      }
    } catch {
      throw registrationError
    }
  }
}
