import { resolveLocaleCopy } from '../utils/locale.js'

const loginErrorMessages = {
  kr: {
    config: 'Firebase 로그인 설정이 필요합니다.',
    invalidCredentials: '아이디 또는 비밀번호를 확인해 주세요.',
    fallback: '로그인에 실패했습니다. 계정을 확인해주세요.',
  },
  en: {
    config: 'Firebase client configuration is required for login.',
    invalidCredentials: 'Please check your ID or password.',
    fallback: 'Login failed. Please check your account.',
  },
  jp: {
    config: 'Firebase のログイン設定が必要です。',
    invalidCredentials: 'ID またはパスワードを確認してください。',
    fallback: 'ログインに失敗しました。アカウントを確認してください。',
  },
  cn: {
    config: '需要配置 Firebase 登录信息。',
    invalidCredentials: '请检查 ID 或密码。',
    fallback: '登录失败。请检查账号。',
  },
}

const invalidCredentialCodes = new Set([
  'auth/invalid-credential',
  'auth/invalid-email',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'auth/user-not-found',
  'auth/wrong-password',
])

export function getLoginErrorMessage(error, locale = 'kr') {
  const copy = resolveLocaleCopy(loginErrorMessages, locale)
  const code = String(error?.code || '')

  if (code === 'CONFIGURATION_ERROR') return copy.config
  if (invalidCredentialCodes.has(code)) return copy.invalidCredentials

  return copy.fallback
}
